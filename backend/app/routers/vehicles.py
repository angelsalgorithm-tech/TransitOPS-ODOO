from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from bson.errors import InvalidId
from typing import Optional

from app.database import vehicles_col
from app.schemas import VehicleCreate, VehicleUpdate
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


def serialize(v: dict) -> dict:
    v["_id"] = str(v["_id"])
    return v


@router.post("")
async def create_vehicle(
    payload: VehicleCreate,
    user=Depends(require_role("fleet_manager")),
):
    existing = await vehicles_col.find_one({"reg_number": payload.reg_number})
    if existing:
        raise HTTPException(status_code=400, detail="Registration number already exists")

    doc = payload.model_dump()
    doc["status"] = "Available"
    result = await vehicles_col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.get("")
async def list_vehicles(
    status_filter: Optional[str] = Query(None, alias="status"),
    type_filter: Optional[str] = Query(None, alias="type"),
    user=Depends(get_current_user),
):
    query = {}
    if status_filter:
        query["status"] = status_filter
    if type_filter:
        query["type"] = type_filter
    vehicles = await vehicles_col.find(query).to_list(length=500)
    return [serialize(v) for v in vehicles]


@router.get("/available")
async def list_available_vehicles(user=Depends(get_current_user)):
    """Only vehicles eligible for dispatch — excludes Retired and In Shop."""
    vehicles = await vehicles_col.find({"status": "Available"}).to_list(length=500)
    return [serialize(v) for v in vehicles]


@router.patch("/{vehicle_id}")
async def update_vehicle(
    vehicle_id: str,
    payload: VehicleUpdate,
    user=Depends(require_role("fleet_manager")),
):
    try:
        oid = ObjectId(vehicle_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid vehicle id")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await vehicles_col.update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    updated = await vehicles_col.find_one({"_id": oid})
    return serialize(updated)


@router.delete("/{vehicle_id}")
async def retire_vehicle(vehicle_id: str, user=Depends(require_role("fleet_manager"))):
    try:
        oid = ObjectId(vehicle_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid vehicle id")

    result = await vehicles_col.update_one({"_id": oid}, {"$set": {"status": "Retired"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"detail": "Vehicle retired"}
