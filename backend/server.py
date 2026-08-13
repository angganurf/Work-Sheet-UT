from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Annotated

import jwt
import bcrypt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict

# ------------------------------------------------------------------ DB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


# ------------------------------------------------------------------ Mongo helpers
def PyObjectId_validator(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    return str(v)


PyObjectId = Annotated[str, BeforeValidator(PyObjectId_validator)]


# ------------------------------------------------------------------ Security
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, nim: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "nim": nim,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


# ------------------------------------------------------------------ Models
class RegisterInput(BaseModel):
    nim: str
    nama: str
    password: str


class LoginInput(BaseModel):
    nim: str
    password: str


class WorksheetCreate(BaseModel):
    title: str = "Lembar Kerja Baru"
    data: dict = Field(default_factory=dict)


class WorksheetUpdate(BaseModel):
    title: Optional[str] = None
    data: Optional[dict] = None


class ProfileUpdate(BaseModel):
    profile: dict = Field(default_factory=dict)


# ------------------------------------------------------------------ App
app = FastAPI()
api_router = APIRouter(prefix="/api")


def parse_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Tipe token tidak valid")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Pengguna tidak ditemukan")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kedaluwarsa")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Akses khusus admin")
    return user


def public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]) if "_id" in user else user.get("id"),
        "nim": user.get("nim"),
        "nama": user.get("nama"),
        "role": user.get("role", "student"),
    }


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=604800, path="/",
    )


# ------------------------------------------------------------------ Auth routes
@api_router.post("/auth/register")
async def register(input: RegisterInput, response: Response):
    nim = input.nim.strip()
    if not nim or not input.password or not input.nama.strip():
        raise HTTPException(status_code=400, detail="NIM, nama, dan password wajib diisi")
    if len(input.password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
    existing = await db.users.find_one({"nim": nim})
    if existing:
        raise HTTPException(status_code=400, detail="NIM sudah terdaftar")
    doc = {
        "nim": nim,
        "nama": input.nama.strip(),
        "password_hash": hash_password(input.password),
        "role": "student",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    token = create_access_token(str(result.inserted_id), nim, "student")
    set_auth_cookie(response, token)
    return {"token": token, "user": public_user(doc)}


@api_router.post("/auth/login")
async def login(input: LoginInput, request: Request, response: Response):
    nim = input.nim.strip()
    xff = request.headers.get("x-forwarded-for", "")
    ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else "unknown")
    identifier = f"{ip}:{nim}"
    attempt = await db.login_attempts.find_one({"_id": identifier})
    now = datetime.now(timezone.utc)
    if attempt and attempt.get("locked_until"):
        locked_until = datetime.fromisoformat(attempt["locked_until"])
        if locked_until > now:
            raise HTTPException(status_code=429, detail="Terlalu banyak percobaan. Coba lagi dalam 15 menit.")
    user = await db.users.find_one({"nim": nim})
    if not user or not verify_password(input.password, user["password_hash"]):
        count = (attempt.get("count", 0) if attempt else 0) + 1
        update = {"count": count, "updated_at": now.isoformat()}
        if count >= 5:
            update["locked_until"] = (now + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"_id": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="NIM atau password salah")
    await db.login_attempts.delete_one({"_id": identifier})
    token = create_access_token(str(user["_id"]), nim, user.get("role", "student"))
    set_auth_cookie(response, token)
    return {"token": token, "user": public_user(user)}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Berhasil keluar"}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


# ------------------------------------------------------------------ Profile routes
def default_profile(user: dict) -> dict:
    return {
        "identitas": {
            "nama": user.get("nama", ""),
            "nim": user.get("nim", ""),
            "alamat_rumah": "",
            "nomor_hp": "",
            "nomor_kontak": "",
            "email": "",
            "awal_tahun_kuliah": "",
        },
        "tujuan_belajar": "",
        "target_belajar": [""],
        "mata_kuliah": [{"kode": "", "nama": "", "sks": ""}],
    }


@api_router.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    doc = await db.users.find_one({"_id": parse_object_id(user["_id"])})
    profile = (doc or {}).get("profile")
    if not profile:
        profile = default_profile(user)
    return {"profile": profile}


@api_router.put("/profile")
async def update_profile(input: ProfileUpdate, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"_id": parse_object_id(user["_id"])},
        {"$set": {"profile": input.profile}},
    )
    return {"profile": input.profile}


async def profile_for_user_id(user_id) -> Optional[dict]:
    query_id = user_id
    if isinstance(user_id, str):
        try:
            query_id = ObjectId(user_id)
        except Exception:
            return None
    doc = await db.users.find_one({"_id": query_id})
    if not doc:
        return None
    return doc.get("profile") or default_profile(doc)


# ------------------------------------------------------------------ Worksheet routes
def serialize_worksheet(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": doc.get("user_id"),
        "nim": doc.get("nim"),
        "nama": doc.get("nama"),
        "title": doc.get("title", ""),
        "data": doc.get("data", {}),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


@api_router.get("/worksheets")
async def list_worksheets(user: dict = Depends(get_current_user)):
    cursor = db.worksheets.find({"user_id": user["_id"]}).sort("updated_at", -1)
    docs = await cursor.to_list(1000)
    return [serialize_worksheet(d) for d in docs]


@api_router.post("/worksheets")
async def create_worksheet(input: WorksheetCreate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "user_id": user["_id"],
        "nim": user["nim"],
        "nama": user["nama"],
        "title": input.title,
        "data": input.data,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.worksheets.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_worksheet(doc)


@api_router.get("/worksheets/{worksheet_id}")
async def get_worksheet(worksheet_id: str, user: dict = Depends(get_current_user)):
    doc = await db.worksheets.find_one({"_id": parse_object_id(worksheet_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Lembar kerja tidak ditemukan")
    if user.get("role") != "admin" and doc.get("user_id") != user["_id"]:
        raise HTTPException(status_code=403, detail="Tidak memiliki akses")
    result = serialize_worksheet(doc)
    result["profile"] = await profile_for_user_id(doc.get("user_id"))
    return result


@api_router.put("/worksheets/{worksheet_id}")
async def update_worksheet(worksheet_id: str, input: WorksheetUpdate, user: dict = Depends(get_current_user)):
    doc = await db.worksheets.find_one({"_id": parse_object_id(worksheet_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Lembar kerja tidak ditemukan")
    if doc.get("user_id") != user["_id"]:
        raise HTTPException(status_code=403, detail="Tidak memiliki akses")
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if input.title is not None:
        update["title"] = input.title
    if input.data is not None:
        update["data"] = input.data
    await db.worksheets.update_one({"_id": parse_object_id(worksheet_id)}, {"$set": update})
    doc = await db.worksheets.find_one({"_id": parse_object_id(worksheet_id)})
    return serialize_worksheet(doc)


@api_router.delete("/worksheets/{worksheet_id}")
async def delete_worksheet(worksheet_id: str, user: dict = Depends(get_current_user)):
    doc = await db.worksheets.find_one({"_id": parse_object_id(worksheet_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Lembar kerja tidak ditemukan")
    if doc.get("user_id") != user["_id"]:
        raise HTTPException(status_code=403, detail="Tidak memiliki akses")
    await db.worksheets.delete_one({"_id": parse_object_id(worksheet_id)})
    return {"message": "Lembar kerja dihapus"}


# ------------------------------------------------------------------ Admin routes
@api_router.get("/admin/worksheets")
async def admin_list_worksheets(search: Optional[str] = None, admin: dict = Depends(require_admin)):
    query = {}
    if search:
        query = {"$or": [
            {"nim": {"$regex": search, "$options": "i"}},
            {"nama": {"$regex": search, "$options": "i"}},
            {"title": {"$regex": search, "$options": "i"}},
        ]}
    cursor = db.worksheets.find(query).sort("updated_at", -1)
    docs = await cursor.to_list(2000)
    return [serialize_worksheet(d) for d in docs]


@api_router.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    total_students = await db.users.count_documents({"role": "student"})
    total_worksheets = await db.worksheets.count_documents({})
    return {"total_students": total_students, "total_worksheets": total_worksheets}


@api_router.get("/")
async def root():
    return {"message": "Lembar Kerja UT API"}


# ------------------------------------------------------------------ Startup
@app.on_event("startup")
async def startup():
    await db.users.create_index("nim", unique=True)
    await db.worksheets.create_index("user_id")
    admin_nim = os.environ.get("ADMIN_NIM", "admin")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"nim": admin_nim})
    if existing is None:
        await db.users.insert_one({
            "nim": admin_nim,
            "nama": "Administrator",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"nim": admin_nim}, {"$set": {"password_hash": hash_password(admin_password)}})


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
