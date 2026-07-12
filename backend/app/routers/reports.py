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
                {"$group": {"_id": None, "total_distance": {"$sum": "$planned_distance_km"}}},
            ]
        ).to_list(length=1)
        trip_totals = trip_agg[0] if trip_agg else {"total_distance": 0}

        total_fuel_cost = fuel_totals.get("total_fuel_cost", 0) or 0
        total_maintenance_cost = maint_totals.get("total_maintenance_cost", 0) or 0
        total_liters = fuel_totals.get("total_liters", 0) or 0
        total_distance = trip_totals.get("total_distance", 0) or 0
        operational_cost = total_fuel_cost + total_maintenance_cost

        fuel_efficiency = round(total_distance / total_liters, 2) if total_liters else None

        # ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
        # Revenue isn't tracked yet as its own field — plug in a per-km rate or a revenue log later.
        acquisition_cost = v.get("acquisition_cost", 0) or 0
        revenue = 0  # placeholder until a revenue/billing field exists
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
                "roi": roi,
            }
        )

    return report


@router.get("/reports/expiring-licenses")
async def expiring_licenses(user=Depends(get_current_user)):
    """Drivers whose license has already expired or expires within 30 days."""
    from datetime import timedelta

    cutoff = datetime.now(timezone.utc) + timedelta(days=30)
    drivers = await drivers_col.find({"license_expiry": {"$lte": cutoff}}).to_list(length=500)
    for d in drivers:
        d["_id"] = str(d["_id"])
    return drivers
