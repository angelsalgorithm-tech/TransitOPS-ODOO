from datetime import datetime, timezone
from fastapi import APIRouter, Depends

from app.database import vehicles_col, drivers_col, trips_col, maintenance_col, fuel_logs_col, expenses_col
from app.dependencies import get_current_user

router = APIRouter(tags=["reports"])


@router.get("/dashboard/kpis")
async def dashboard_kpis(user=Depends(get_current_user)):
    total_vehicles = await vehicles_col.count_documents({})
    active_vehicles = await vehicles_col.count_documents({"status": {"$ne": "Retired"}})
    available_vehicles = await vehicles_col.count_documents({"status": "Available"})
    in_maintenance = await vehicles_col.count_documents({"status": "In Shop"})

    active_trips = await trips_col.count_documents({"status": "Dispatched"})
    pending_trips = await trips_col.count_documents({"status": "Draft"})

    drivers_on_duty = await drivers_col.count_documents({"status": "On Trip"})

    on_trip_vehicles = await vehicles_col.count_documents({"status": "On Trip"})
    fleet_utilization = round((on_trip_vehicles / active_vehicles) * 100, 1) if active_vehicles else 0

    return {
        "active_vehicles": active_vehicles,
        "available_vehicles": available_vehicles,
        "vehicles_in_maintenance": in_maintenance,
        "active_trips": active_trips,
        "pending_trips": pending_trips,
        "drivers_on_duty": drivers_on_duty,
        "fleet_utilization_pct": fleet_utilization,
        "total_vehicles": total_vehicles,
    }


@router.get("/dashboard/recent-trips")
async def recent_trips(user=Depends(get_current_user)):
    trips = await trips_col.find().sort("_id", -1).limit(4).to_list(length=4)
    result = []
    for t in trips:
        vehicle = await vehicles_col.find_one({"_id": t.get("vehicle_id")}) if t.get("vehicle_id") else None
        driver = await drivers_col.find_one({"_id": t.get("driver_id")}) if t.get("driver_id") else None
        result.append(
            {
                "trip_id": str(t["_id"])[-6:].upper(),
                "vehicle_reg": vehicle["reg_number"] if vehicle else "—",
                "driver_name": driver["name"] if driver else "—",
                "status": t.get("status", "Draft"),
                "eta": t.get("eta", "—"),
            }
        )
    return result


@router.get("/dashboard/vehicle-status")
async def vehicle_status_breakdown(user=Depends(get_current_user)):
    total = await vehicles_col.count_documents({})
    statuses = ["Available", "On Trip", "In Shop", "Retired"]
    breakdown = []
    for s in statuses:
        count = await vehicles_col.count_documents({"status": s})
        pct = round((count / total) * 100, 1) if total else 0
        breakdown.append({"status": s, "count": count, "pct": pct})
    return breakdown


@router.get("/reports/vehicle-costs")
async def vehicle_cost_report(user=Depends(get_current_user)):
    """Per-vehicle fuel + maintenance cost, fuel efficiency, and ROI."""
    vehicles = await vehicles_col.find().to_list(length=500)
    report = []

    for v in vehicles:
        vid = v["_id"]

        fuel_agg = await fuel_logs_col.aggregate(
            [
                {"$match": {"vehicle_id": vid}},
                {"$group": {"_id": None, "total_liters": {"$sum": "$liters"}, "total_fuel_cost": {"$sum": "$cost"}}},
            ]
        ).to_list(length=1)
        fuel_totals = fuel_agg[0] if fuel_agg else {"total_liters": 0, "total_fuel_cost": 0}

        maint_agg = await maintenance_col.aggregate(
            [
                {"$match": {"vehicle_id": vid}},
                {"$group": {"_id": None, "total_maintenance_cost": {"$sum": "$cost"}}},
            ]
        ).to_list(length=1)
        maint_totals = maint_agg[0] if maint_agg else {"total_maintenance_cost": 0}

        trip_agg = await trips_col.aggregate(
            [
                {"$match": {"vehicle_id": vid, "status": "Completed"}},
                {"$group": {
                    "_id": None,
                    "total_distance": {"$sum": "$planned_distance_km"},
                    "total_revenue": {"$sum": {"$ifNull": ["$revenue_generated", 0]}},
                }},
            ]
        ).to_list(length=1)
        trip_totals = trip_agg[0] if trip_agg else {"total_distance": 0, "total_revenue": 0}

        total_fuel_cost = fuel_totals.get("total_fuel_cost", 0) or 0
        total_maintenance_cost = maint_totals.get("total_maintenance_cost", 0) or 0
        total_liters = fuel_totals.get("total_liters", 0) or 0
        total_distance = trip_totals.get("total_distance", 0) or 0
        operational_cost = total_fuel_cost + total_maintenance_cost

        fuel_efficiency = round(total_distance / total_liters, 2) if total_liters else None

        # ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
        acquisition_cost = v.get("acquisition_cost", 0) or 0
        revenue = trip_totals.get("total_revenue", 0) or 0
        roi = round((revenue - operational_cost) / acquisition_cost, 3) if acquisition_cost else None

        report.append(
            {
                "vehicle_id": str(vid),
                "reg_number": v["reg_number"],
                "name": v["name"],
                "total_fuel_cost": total_fuel_cost,
                "total_maintenance_cost": total_maintenance_cost,
                "operational_cost": operational_cost,
                "total_distance_km": total_distance,
                "fuel_efficiency_km_per_l": fuel_efficiency,
                "revenue": revenue,
                "roi": roi,
            }
        )

    return report


@router.get("/reports/monthly-revenue")
async def monthly_revenue(user=Depends(get_current_user)):
    pipeline = [
        {"$match": {"status": "Completed", "completed_at": {"$exists": True}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m", "date": "$completed_at"}},
            "total_revenue": {"$sum": {"$ifNull": ["$revenue_generated", 0]}},
        }},
        {"$sort": {"_id": 1}},
    ]
    results = await trips_col.aggregate(pipeline).to_list(length=100)
    return [{"month": r["_id"], "revenue": r["total_revenue"]} for r in results]


@router.get("/reports/expiring-licenses")
async def expiring_licenses(user=Depends(get_current_user)):
    from datetime import timedelta

    cutoff = datetime.now(timezone.utc) + timedelta(days=30)
    drivers = await drivers_col.find({"license_expiry": {"$lte": cutoff}}).to_list(length=500)
    for d in drivers:
        d["_id"] = str(d["_id"])
    return drivers