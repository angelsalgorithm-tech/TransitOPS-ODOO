from fastapi import APIRouter, HTTPException

from app.database import users_col
from app.schemas import UserSignup, UserLogin, Token
from app.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

VALID_ROLES = {"fleet_manager", "dispatcher", "safety_officer", "financial_analyst"}


@router.post("/signup", response_model=Token)
async def signup(payload: UserSignup):
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"role must be one of {VALID_ROLES}")

    existing = await users_col.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "failed_attempts": 0,
        "locked": False,
    }
    result = await users_col.insert_one(doc)

    token = create_access_token({"sub": str(result.inserted_id), "role": payload.role})
    return Token(access_token=token, role=payload.role, name=payload.name)


@router.post("/login", response_model=Token)
async def login(payload: UserLogin):
    user = await users_col.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.get("locked"):
        raise HTTPException(
            status_code=403,
            detail="Account locked after 5 failed attempts. Contact your admin to reset.",
        )

    if not verify_password(payload.password, user["password_hash"]):
        attempts = user.get("failed_attempts", 0) + 1
        update = {"failed_attempts": attempts}
        if attempts >= 5:
            update["locked"] = True
        await users_col.update_one({"_id": user["_id"]}, {"$set": update})

        if attempts >= 5:
            raise HTTPException(status_code=403, detail="Account locked after 5 failed attempts.")
        raise HTTPException(
            status_code=401,
            detail=f"Invalid credentials. {5 - attempts} attempt(s) remaining.",
        )

    if payload.role != user["role"]:
        raise HTTPException(status_code=403, detail="Role does not match this account")

    # reset failed attempts on success
    await users_col.update_one({"_id": user["_id"]}, {"$set": {"failed_attempts": 0}})

    token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})
    return Token(access_token=token, role=user["role"], name=user["name"])
