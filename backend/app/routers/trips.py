from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from bson.errors import InvalidId
from typing import Optional

from app.database import client, trips_col, vehicles_col, drivers_col
from app.schemas import TripCreate, TripComplete
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/trips", tags=["trips"])


def serialize(t: dict) -> dict:
    t["_id"] = str(t["_id"])
    t["vehicle_id"] = str(t["vehicle_id"])
    t["driver_id"] = str(t["driver_id"])
    return t


async def _get_oid(id_str: str, label: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail=f"Invalid {label} id")


@router.post("")
async def create_trip(
    payload: TripCreate,
    user=Depends(require_role("dispatcher")),
):
    """Creates a Draft trip. No status changes yet — validation happens at dispatch time."""
    vehicle_oid = await _get_oid(payload.vehicle_id, "vehicle")
    driver_oid = await _get_oid(payload.driver_id, "driver")

    vehicle = await vehicles_col.find_one({"_id": vehicle_oid})
    driver = await drivers_col.find_one({"_id": driver_oid})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    if payload.cargo_weight_kg > vehicle["max_load_kg"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cargo weight {payload.cargo_weight_kg}kg exceeds vehicle max load {vehicle['max_load_kg']}kg",
        )

    doc = payload.model_dump()
    doc["vehicle_id"] = vehicle_oid
    doc["driver_id"] = driver_oid
    doc["status"] = "Draft"
    doc["created_at"] = datetime.now(timezone.utc)

    result = await trips_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.get("")
async def list_trips(
    status_filter: Optional[str] = Query(None, alias="status"),
    user=Depends(get_current_user),
):
    query = {}
    if status_filter:
        query["status"] = status_filter
    trips = await trips_col.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize(t) for t in trips]


@router.post("/{trip_id}/dispatch")
async def dispatch_trip(trip_id: str, user=Depends(require_role("dispatcher"))):
    trip_oid = await _get_oid(trip_id, "trip")
    trip = await trips_col.find_one({"_id": trip_oid})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip["status"] != "Draft":
        raise HTTPException(status_code=400, detail=f"Trip is '{trip['status']}', cannot dispatch")

    vehicle = await vehicles_col.find_one({"_id": trip["vehicle_id"]})
    driver = await drivers_col.find_one({"_id": trip["driver_id"]})

    if vehicle["status"] != "Available":
        raise HTTPException(status_code=400, detail=f"Vehicle is '{vehicle['status']}', not Available")
    if driver["status"] != "Available":
        raise HTTPException(status_code=400, detail=f"Driver is '{driver['status']}', not Available")
    if driver["license_expiry"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Driver's license has expired")

    # Atomically flip trip + vehicle + driver status together.
    # NOTE: multi-document transactions require MongoDB to be running as a
    # replica set — MongoDB Atlas (including the free M0 tier) does this by default.
    async with await client.start_session() as session:
        async with session.start_transaction():
            await trips_col.update_one(
                {"_id": trip_oid},
                {"$set": {"status": "Dispatched", "dispatched_at": datetime.now(timezone.utc)}},
                session=session,
            )
            await vehicles_col.update_one(
                {"_id": vehicle["_id"]}, {"$set": {"status": "On Trip"}}, session=session
            )
            await drivers_col.update_one(
                {"_id": driver["_id"]}, {"$set": {"status": "On Trip"}}, session=session
            )

    updated = await trips_col.find_one({"_id": trip_oid})
    return serialize(updated)


@router.post("/{trip_id}/complete")
async def complete_trip(trip_id: str, payload: TripComplete, user=Depends(require_role("dispatcher"))):
    trip_oid = await _get_oid(trip_id, "trip")
    trip = await trips_col.find_one({"_id": trip_oid})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip["status"] != "Dispatched":
        raise HTTPException(status_code=400, detail=f"Trip is '{trip['status']}', cannot complete")

    async with await client.start_session() as session:
        async with session.start_transaction():
            await trips_col.update_one(
                {"_id": trip_oid},
                {
                    "$set": {
                        "status": "Completed",
                        "completed_at": datetime.now(timezone.utc),
                        "final_odometer": payload.final_odometer,
                        "fuel_consumed_liters": payload.fuel_consumed_liters,
                    }
                },
                session=session,
            )
            await vehicles_col.update_one(
                {"_id": trip["vehicle_id"]},
                {"$set": {"status": "Available", "odometer": payload.final_odometer}},
                session=session,
            )
            await drivers_col.update_one(
                {"_id": trip["driver_id"]}, {"$set": {"status": "Available"}}, session=session
            )

    updated = await trips_col.find_one({"_id": trip_oid})
    return serialize(updated)


@router.post("/{trip_id}/cancel")
async def cancel_trip(trip_id: str, user=Depends(require_role("dispatcher"))):
    trip_oid = await _get_oid(trip_id, "trip")
    trip = await trips_col.find_one({"_id": trip_oid})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip["status"] not in ("Draft", "Dispatched"):
        raise HTTPException(status_code=400, detail=f"Trip is '{trip['status']}', cannot cancel")

    was_dispatched = trip["status"] == "Dispatched"

    async with await client.start_session() as session:
        async with session.start_transaction():
            await trips_col.update_one(
                {"_id": trip_oid}, {"$set": {"status": "Cancelled"}}, session=session
            )
            if was_dispatched:
                await vehicles_col.update_one(
                    {"_id": trip["vehicle_id"]}, {"$set": {"status": "Available"}}, session=session
                )
                await drivers_col.update_one(
                    {"_id": trip["driver_id"]}, {"$set": {"status": "Available"}}, session=session
                )

    updated = await trips_col.find_one({"_id": trip_oid})
    return serialize(updated)
