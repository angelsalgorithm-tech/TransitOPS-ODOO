from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from bson.errors import InvalidId

from app.database import fuel_logs_col, expenses_col, vehicles_col, trips_col, maintenance_col
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
    result = []
    for l in logs:
        vehicle = await vehicles_col.find_one({"_id": l["vehicle_id"]})
        result.append({
            "_id": str(l["_id"]),
            "vehicle_id": str(l["vehicle_id"]),
            "vehicle_reg": vehicle["reg_number"] if vehicle else "—",
            "liters": l["liters"],
            "cost": l["cost"],
            "date": l["date"],
        })
    return result


@router.post("/expenses")
async def create_expense(payload: ExpenseCreate, user=Depends(require_role("fleet_manager", "financial_analyst"))):
    try:
        vehicle_oid = ObjectId(payload.vehicle_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid vehicle id")

    trip_oid = None
    if payload.trip_id:
        try:
            trip_oid = ObjectId(payload.trip_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid trip id")

    doc = payload.model_dump()
    doc["vehicle_id"] = vehicle_oid
    doc["trip_id"] = trip_oid
    result = await expenses_col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.get("/expenses")
async def list_expenses(user=Depends(get_current_user)):
    logs = await expenses_col.find().sort("date", -1).to_list(length=500)
    result = []
    for e in logs:
        vehicle = await vehicles_col.find_one({"_id": e["vehicle_id"]})
        trip = await trips_col.find_one({"_id": e["trip_id"]}) if e.get("trip_id") else None

        maint_agg = await maintenance_col.aggregate([
            {"$match": {"vehicle_id": e["vehicle_id"]}},
            {"$group": {"_id": None, "total": {"$sum": "$cost"}}},
        ]).to_list(length=1)
        maint_linked = maint_agg[0]["total"] if maint_agg else 0

        toll = e.get("toll", 0) or 0
        other = e.get("other", 0) or 0

        result.append({
            "_id": str(e["_id"]),
            "vehicle_id": str(e["vehicle_id"]),
            "vehicle_reg": vehicle["reg_number"] if vehicle else "—",
            "trip_id": str(e["trip_id"]) if e.get("trip_id") else None,
            "trip_route": f'{trip["source"]} \u2192 {trip["destination"]}' if trip else "—",
            "trip_status": trip["status"] if trip else "—",
            "toll": toll,
            "other": other,
            "maint_linked": maint_linked,
            "total": toll + other + maint_linked,
            "date": e["date"],
        })
    return result