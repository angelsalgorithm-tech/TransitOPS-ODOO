from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_indexes
from app.routers import auth, vehicles, drivers, trips, maintenance, fuel_expenses, reports

app = FastAPI(title="TransitOps API")

# Hackathon-friendly CORS — lock this down to your deployed frontend origin before final submission.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(drivers.router)
app.include_router(trips.router)
app.include_router(maintenance.router)
app.include_router(fuel_expenses.router)
app.include_router(reports.router)


@app.on_event("startup")
async def on_startup():
    await init_indexes()


@app.get("/")
async def root():
    return {"status": "TransitOps API running"}
