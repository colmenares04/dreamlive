from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel
from typing import Any, List, Optional
import json
import logging
import uuid

from app.infrastructure.api.deps import get_uow
from app.adapters.db.models import TicketMessageORM, AgencyORM
from app.adapters.security.handlers import decode_token_func
from app.infrastructure.api.v1.socket_manager import socket_manager
from app.infrastructure.api.v1.websocket_schemas import WSMessage, WSEventType

router = APIRouter(prefix="/chat", tags=["Chat V2"])
logger = logging.getLogger("dreamlive.chat.v2")


@router.get("/history/{ticket_id}")
async def get_chat_history(
    ticket_id: str,
    uow: Any = Depends(get_uow),
):
    from sqlalchemy import select
    stmt = select(TicketMessageORM).where(TicketMessageORM.ticket_id == ticket_id)
    res = await uow.session.execute(stmt)
    messages = res.scalars().all()
    
    return [
        {
            "id": str(m.id),
            "ticket_id": str(m.ticket_id),
            "user_id": str(m.user_id),
            "message": m.message,
            "created_at": m.created_at.isoformat() if hasattr(m.created_at, "isoformat") else ""
        } for m in messages
    ]


@router.websocket("/ws")
async def chat_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    session_id: Optional[str] = Query(None),
    uow: Any = Depends(get_uow),
):
    metadata = {"session_id": session_id}
    try:
        if token.startswith("DL-"): # License Key
            from sqlalchemy import select
            res = await uow.session.execute(select(AgencyORM))
            first_agency = res.scalars().first()
            agency_id = str(first_agency.id) if first_agency else ""
            metadata = {
                "license_id": token,
                "agency_id": agency_id,
                "type": "ext"
            }
        else:
            try:
                payload = decode_token_func(token)
                user_id = str(payload.get("sub"))
                agency_id = str(payload.get("agency_id") or user_id)
                metadata = {
                    "user_id": user_id,
                    "agency_id": agency_id,
                    "type": "web"
                }
            except Exception:
                from sqlalchemy import select
                res = await uow.session.execute(select(AgencyORM))
                first_agency = res.scalars().first()
                agency_id = str(first_agency.id) if first_agency else ""
                metadata = {
                    "user_id": agency_id,
                    "agency_id": agency_id,
                    "type": "web"
                }
    except Exception as e:
        await websocket.close(code=1008)
        return

    await socket_manager.connect(websocket, metadata)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                raw_msg = json.loads(data)
                ws_msg = WSMessage(**raw_msg)
            except Exception:
                continue

            if ws_msg.event == WSEventType.PING:
                await websocket.send_json({"event": "PONG", "payload": {}})
                continue

            if ws_msg.event == WSEventType.CHAT_MESSAGE:
                ticket_id = ws_msg.payload.get("ticket_id")
                content = ws_msg.payload.get("message")
                if ticket_id and content:
                    msg_id = str(uuid.uuid4())
                    new_msg = TicketMessageORM(
                        id=msg_id,
                        ticket_id=ticket_id,
                        user_id=metadata.get("user_id") or metadata.get("license_id"),
                        message=content,
                    )
                    uow.session.add(new_msg)
                    await uow.session.flush()
                    await uow.session.commit()

                    broadcast_payload = {
                        "id": msg_id,
                        "ticket_id": ticket_id,
                        "user_id": metadata.get("user_id") or metadata.get("license_id"),
                        "message": content,
                        "created_at": new_msg.created_at.isoformat() if hasattr(new_msg, "created_at") and new_msg.created_at else ""
                    }
                    await socket_manager.broadcast_to_agency(metadata["agency_id"], WSEventType.CHAT_MESSAGE, broadcast_payload)

    except WebSocketDisconnect:
        socket_manager.disconnect(websocket)
    except Exception as e:
        socket_manager.disconnect(websocket)
