import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

async def main():
    engine = create_async_engine(
        "postgresql+asyncpg://postgres:postgres@localhost:5433/dreamlive",
        echo=False,
        future=True
    )
    async_session = AsyncSession(bind=engine)
    async with async_session as session:
        query1 = text("ALTER TABLE licenses ADD COLUMN IF NOT EXISTS daily_contact_count INTEGER NOT NULL DEFAULT 0")
        query2 = text("ALTER TABLE licenses ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE")
        await session.execute(query1)
        await session.execute(query2)
        await session.commit()
        print(" Columns added successfully to licenses table.")

if __name__ == "__main__":
    asyncio.run(main())
