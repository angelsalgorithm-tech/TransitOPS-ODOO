from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from bson.errors import InvalidId

from app.database import fuel_logs_col, expenses_col
from app.schemas import FuelLogCreate, ExpenseCreate
from app.dependencies import get_current_user, require_role

router = APIRouter(tags=["fuel-expenses"])


def serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    doc["vehicle_id"] = str(doc["vehicle_id"])
    return doc


@router.post("/fuel-logs")
async def create_fuel_log(payload: FuelLogCreate, user=Depends(require_role("fleet_manager", "financial_analyst"))):
    try:
        vehicle_oid = ObjectId(payload.vehicle_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid vehicle id")

    doc = payload.model_dump()
    doc["vehicle_id"] = vehicle_oid
    result = await fuel_logs_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.get("/fuel-logs")
async def list_fuel_logs(user=Depends(get_current_user)):
    logs = await fuel_logs_col.find().sort("date", -1).to_list(length=500)
    return [serialize(l) for l in logs]


@router.post("/expenses")
async def create_expense(payload: ExpenseCreate, user=Depends(require_role("fleet_manager", "financial_analyst"))):
    try:
        vehicle_oid = ObjectId(payload.vehicle_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid vehicle id")

    doc = payload.model_dump()
    doc["vehicle_id"] = vehicle_oid
    result = await expenses_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.get("/expenses")
async def list_expenses(user=Depends(get_current_user)):
    logs = await expenses_col.find().sort("date", -1).to_list(length=500)
    return [serialize(l) for l in logs]
