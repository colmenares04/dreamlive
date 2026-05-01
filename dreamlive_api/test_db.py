import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

async def test():
    engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost:5432/postgres")
    async with engine.begin() as conn:
        print("Successfully connected to postgres database!")

if __name__ == "__main__":
    asyncio.run(test())
