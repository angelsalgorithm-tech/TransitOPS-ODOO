from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


# ---------- Auth ----------
class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str  # fleet_manager | dispatcher | safety_officer | financial_analyst


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str


# ---------- Vehicle ----------
class VehicleCreate(BaseModel):
    reg_number: str
    name: str
    type: str
    max_load_kg: float
    odometer: float = 0
    acquisition_cost: float = 0


class VehicleUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    max_load_kg: Optional[float] = None
    odometer: Optional[float] = None
    status: Optional[str] = None


# ---------- Driver ----------
class DriverCreate(BaseModel):
    name: str
    license_number: str
    license_category: str
    license_expiry: datetime
    contact_number: str
    safety_score: float = 100


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    license_category: Optional[str] = None
    license_expiry: Optional[datetime] = None
    contact_number: Optional[str] = None
    safety_score: Optional[float] = None
    status: Optional[str] = None


# ---------- Trip ----------
class TripCreate(BaseModel):
    source: str
    destination: str
    vehicle_id: str
    driver_id: str
    cargo_weight_kg: float
    planned_distance_km: float


class TripComplete(BaseModel):
    final_odometer: float
    fuel_consumed_liters: float


# ---------- Maintenance ----------
class MaintenanceCreate(BaseModel):
    vehicle_id: str
    issue: str
    cost: float = 0
    notes: Optional[str] = None


# ---------- Fuel / Expenses ----------
class FuelLogCreate(BaseModel):
    vehicle_id: str
    liters: float
    cost: float
    date: datetime


class ExpenseCreate(BaseModel):
    vehicle_id: str
    type: str  # toll | maintenance | other
    amount: float
    date: datetime
