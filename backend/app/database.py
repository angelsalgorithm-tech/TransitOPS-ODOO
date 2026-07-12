import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "transitops")

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

# Collections
users_col = db["users"]
vehicles_col = db["vehicles"]
drivers_col = db["drivers"]
trips_col = db["trips"]
maintenance_col = db["maintenance_logs"]
fuel_logs_col = db["fuel_logs"]
expenses_col = db["expenses"]
settings_col = db["settings"]


async def init_indexes():
    """Call once on startup to enforce uniqueness / speed up lookups."""
    await users_col.create_index("email", unique=True)
    await vehicles_col.create_index("reg_number", unique=True)
    await drivers_col.create_index("license_number", unique=True)
    await trips_col.create_index("status")
    await maintenance_col.create_index("vehicle_id")
    await fuel_logs_col.create_index("vehicle_id")
    await expenses_col.create_index("vehicle_id")