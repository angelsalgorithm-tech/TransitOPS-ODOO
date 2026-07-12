from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from bson.errors import InvalidId
from typing import Optional

from app.database import drivers_col
from app.schemas import DriverCreate, DriverUpdate
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/drivers", tags=["drivers"])


def serialize(d: dict) -> dict:
    d["_id"] = str(d["_id"])
    return d


@router.post("")
async def create_driver(
    payload: DriverCreate,
    user=Depends(require_role("fleet_manager", "safety_officer")),
):
    existing = await drivers_col.find_one({"license_number": payload.license_number})
    if existing:
        raise HTTPException(status_code=400, detail="License number already registered")

    doc = payload.model_dump()
    doc["status"] = "Available"
    result = await drivers_col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.get("")
async def list_drivers(
    status_filter: Optional[str] = Query(None, alias="status"),
    user=Depends(get_current_user),
):
    query = {}
    if status_filter:
        query["status"] = status_filter
    drivers = await drivers_col.find(query).to_list(length=500)
    return [serialize(d) for d in drivers]


@router.patch("/{driver_id}")
async def update_driver(
    driver_id: str,
    payload: DriverUpdate,
    user=Depends(require_role("fleet_manager", "safety_officer")),
):
    try:
        oid = ObjectId(driver_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid driver id")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await drivers_col.update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")

    updated = await drivers_col.find_one({"_id": oid})
    return serialize(updated)


@router.post("/{driver_id}/suspend")
async def suspend_driver(driver_id: str, user=Depends(require_role("safety_officer"))):
    try:
        oid = ObjectId(driver_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid driver id")

    result = await drivers_col.update_one({"_id": oid}, {"$set": {"status": "Suspended"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    return {"detail": "Driver suspended"}
