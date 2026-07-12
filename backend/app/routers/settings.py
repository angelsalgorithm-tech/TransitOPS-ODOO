from fastapi import APIRouter, Depends

from app.database import settings_col
from app.schemas import SettingsUpdate
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/settings", tags=["settings"])

DEFAULTS = {"depot_name": "", "currency": "INR", "distance_unit": "km"}


@router.get("")
async def get_settings(user=Depends(get_current_user)):
    doc = await settings_col.find_one({"_id": "app_settings"})
    if not doc:
        return DEFAULTS
    doc.pop("_id", None)
    return {**DEFAULTS, **doc}


@router.put("")
async def update_settings(payload: SettingsUpdate, user=Depends(require_role("fleet_manager"))):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    await settings_col.update_one({"_id": "app_settings"}, {"$set": updates}, upsert=True)
    doc = await settings_col.find_one({"_id": "app_settings"})
    doc.pop("_id", None)
    return {**DEFAULTS, **doc}