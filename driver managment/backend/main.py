from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(
    title="Driver Management API"
)


# Allow Frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Temporary driver database
drivers = [
    {
        "id": 1,
        "name": "Ramesh Kumar",
        "phone": "9876543210",
        "status": "Active",
        "safety_score": 95
    },
    {
        "id": 2,
        "name": "Suresh Rao",
        "phone": "9123456789",
        "status": "Inactive",
        "safety_score": 80
    }
]


# Model for adding driver
class Driver(BaseModel):
    name: str
    phone: str
    status: str
    safety_score: int



# Test API
@app.get("/")
def home():
    return {
        "message": "Driver Management Backend Running"
    }



# Get all drivers
@app.get("/drivers")
def get_drivers():
    return drivers



# Get single driver
@app.get("/drivers/{driver_id}")
def get_driver(driver_id:int):

    for driver in drivers:
        if driver["id"] == driver_id:
            return driver

    return {
        "error":"Driver not found"
    }



# Add new driver
@app.post("/drivers")
def add_driver(driver:Driver):

    new_driver = {
        "id": len(drivers)+1,
        "name": driver.name,
        "phone": driver.phone,
        "status": driver.status,
        "safety_score": driver.safety_score
    }

    drivers.append(new_driver)

    return new_driver



# Delete driver
@app.delete("/drivers/{driver_id}")
def delete_driver(driver_id:int):

    for driver in drivers:
        if driver["id"] == driver_id:

            drivers.remove(driver)

            return {
                "message":"Driver deleted"
            }

    return {
        "error":"Driver not found"
    }