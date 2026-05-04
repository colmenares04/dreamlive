import asyncio
import uuid
from sqlalchemy import select
from app.adapters.db.session import async_session, engine
from app.adapters.db.models import Base, AgencyORM, LicenseORM

async def run_seed():
    print("🚀 Running Database Seed...")
    
    # 1. Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # 2. Ensure Master Agency exists
        # We search by a fixed email to identify the master agency
        MASTER_EMAIL = "dev@dreamlive.com"
        res = await session.execute(select(AgencyORM).where(AgencyORM.email == MASTER_EMAIL))
        agency = res.scalar_one_or_none()
        
        if not agency:
            print("  + Creating Master Agency...")
            agency_id = str(uuid.uuid4())
            agency = AgencyORM(
                id=agency_id,
                name="DreamLive Manager",
                code="SUPAG",
                is_active=True,
                email=MASTER_EMAIL,
                password="dreamlive2026*", # Contraseña maestra
            )
            session.add(agency)
            await session.flush()
        else:
            print(f"  - Master Agency already exists: {agency.name}")
            agency_id = str(agency.id)

        # 3. Ensure Superuser License exists
        res_lic = await session.execute(
            select(LicenseORM).where(LicenseORM.agency_id == agency_id, LicenseORM.role == "SUPERUSER")
        )
        lic = res_lic.scalar_one_or_none()
        
        if not lic:
            print("  + Creating Superuser License...")
            license_id = str(uuid.uuid4())
            new_license = LicenseORM(
                id=license_id,
                key=f"RUSSO-2026",
                agency_id=agency_id,
                recruiter_name="Dreamlive Dev",
                email="admin@dreamlive.com",
                admin_password="dream2026", # Contraseña del superagente
                role="SUPERUSER",
                status="active",
                request_limit=999999,
            )
            session.add(new_license)
        else:
            print(f"  - Superuser exists: {lic.recruiter_name} (Key: {lic.key})")

        await session.commit()
    print("✅ Seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_seed())
