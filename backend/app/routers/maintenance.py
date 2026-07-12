from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from bson.errors import InvalidId

from app.database import client, maintenance_col, vehicles_col
from app.schemas import MaintenanceCreate
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


def serialize(m: dict) -> dict:
    m["_id"] = str(m["_id"])
    m["vehicle_id"] = str(m["vehicle_id"])
    return m


@router.post("")
async def create_maintenance(payload: MaintenanceCreate, user=Depends(require_role("fleet_manager"))):
    try:
        vehicle_oid = ObjectId(payload.vehicle_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid vehicle id")

    vehicle = await vehicles_col.find_one({"_id": vehicle_oid})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if vehicle["status"] == "On Trip":
        raise HTTPException(status_code=400, detail="Cannot open maintenance while vehicle is On Trip")

    doc = payload.model_dump()
    doc["vehicle_id"] = vehicle_oid
    doc["status"] = "Open"
    doc["created_at"] = datetime.now(timezone.utc)

    async with await client.start_session() as session:
        async with session.start_transaction():
            result = await maintenance_col.insert_one(doc, session=session)
            await vehicles_col.update_one(
                {"_id": vehicle_oid}, {"$set": {"status": "In Shop"}}, session=session
            )

    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.get("")
async def list_maintenance(user=Depends(get_current_user)):
    logs = await maintenance_col.find().sort("created_at", -1).to_list(length=500)
    return [serialize(m) for m in logs]


@router.post("/{maintenance_id}/close")
async def close_maintenance(maintenance_id: str, user=Depends(require_role("fleet_manager"))):
    try:
        oid = ObjectId(maintenance_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid maintenance id")

    record = await maintenance_col.find_one({"_id": oid})
    if not record:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    if record["status"] != "Open":
        raise HTTPException(status_code=400, detail="Maintenance record already closed")

    vehicle = await vehicles_col.find_one({"_id": record["vehicle_id"]})

    async with await client.start_session() as session:
        async with session.start_transaction():
            await maintenance_col.update_one(
                {"_id": oid},
                {"$set": {"status": "Closed", "closed_at": datetime.now(timezone.utc)}},
                session=session,
            )
            # Retired vehicles stay retired even after maintenance closes
            if vehicle and vehicle["status"] != "Retired":
                await vehicles_col.update_one(
                    {"_id": record["vehicle_id"]}, {"$set": {"status": "Available"}}, session=session
                )

    updated = await maintenance_col.find_one({"_id": oid})
    return serialize(updated)
