import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.adapters.db.session import engine, async_session
from app.adapters.db.models import Base, UserORM, AgencyORM, LicenseORM
from app.adapters.security.handlers import hash_password
from app.core.entities.user import UserRole, UserStatus
from app.core.entities.license import LicenseStatus


async def seed():
    print("Starting database seed...")
    # 1. Recreate tables if needed
    async with engine.begin() as conn:
        print("Recreating tables...")
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # 2. Check if a superuser already exists
        res = await session.execute(select(UserORM).where(UserORM.role == UserRole.SUPERUSER))
        existing_admin = res.scalar_one_or_none()
        
        if not existing_admin:
            print("Adding superuser...")
            admin = UserORM(
                id=str(uuid.uuid4()),
                email="admin@dreamlive.com",
                username="admin",
                full_name="Super Administrator",
                hashed_password=hash_password("admin123"),
                role=UserRole.SUPERUSER,
                status=UserStatus.ACTIVE,
                is_2fa_enabled=False,
            )
            session.add(admin)
        else:
            print(f"Superuser already exists with email: {existing_admin.email}")

        # 3. Create a test agency
        res = await session.execute(select(AgencyORM).where(AgencyORM.name == "Test Agency"))
        existing_agency = res.scalar_one_or_none()
        
        agency_id = str(uuid.uuid4())
        if not existing_agency:
            print("Adding test agency...")
            agency = AgencyORM(
                id=agency_id,
                name="Test Agency",
                code="TA123",
                is_active=True,
                email="agency@test.com",
                password="testpassword",
            )
            session.add(agency)
        else:
            agency_id = existing_agency.id
            print(f"Agency already exists with ID: {agency_id}")

        # 4. Create a test license
        res = await session.execute(select(LicenseORM).where(LicenseORM.key == "RUSSO-2026"))
        existing_license = res.scalar_one_or_none()
        
        if not existing_license:
            print("Adding test license...")
            license_ = LicenseORM(
                id=str(uuid.uuid4()),
                key="RUSSO-2026",
                agency_id=agency_id,
                recruiter_name="DreamLive Tester",
                status=LicenseStatus.ACTIVE,
                request_limit=120,
                refresh_minutes=15,
                expires_at=datetime.now(timezone.utc) + timedelta(days=365),
                email="license@test.com",
                is_active=True,
                max_devices=3,
                full_name="Tester License",
                keywords="batallas/pk",
                message_templates=["Hello {username}", "Nice to meet you"],
                admin_password="123456",
                invitation_types=["Normal", "Premium"],
                theme="dark",
            )
            session.add(license_)
        else:
            print(f"License already exists with key: {existing_license.key}")

        await session.commit()
    print("Seed completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
