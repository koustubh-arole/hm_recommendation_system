"""
api/auth.py
-----------
JWT authentication router.
"""

import hashlib
import hmac
import os
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:
    import jwt
except ImportError:
    raise ImportError("Run:  pip install PyJWT")

from api.models import Token, TokenData, UserLogin, UserOut, UserRegister

SECRET_KEY = os.getenv("JWT_SECRET", "CHANGE_ME_IN_PRODUCTION_use_openssl_rand")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8
DB_PATH = ROOT / "data" / "users.db"

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer()


# ══════════════════════════════════════════════════════════════════════
# DATABASE
# ══════════════════════════════════════════════════════════════════════

def _get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                username    TEXT    UNIQUE NOT NULL,
                email       TEXT    UNIQUE NOT NULL,
                password    TEXT    NOT NULL,
                role        TEXT    NOT NULL DEFAULT 'user',
                customer_id TEXT,
                created_at  TEXT    DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        cur = conn.execute("SELECT COUNT(*) FROM users")
        if cur.fetchone()[0] == 0:
            conn.execute(
                "INSERT INTO users (username, email, password, role) VALUES (?,?,?,?)",
                ("admin", "admin@hm.local", _hash_password("admin123"), "admin"),
            )
            conn.commit()
            print("[auth] Default admin seeded — username: admin  password: admin123")


def _hash_password(p: str) -> str:
    return hashlib.sha256(p.encode()).hexdigest()


def _verify_password(plain: str, hashed: str) -> bool:
    return hmac.compare_digest(_hash_password(plain), hashed)


def db_get_user(username: str) -> Optional[sqlite3.Row]:
    with _get_conn() as conn:
        return conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()


def db_create_user(user: UserRegister) -> None:
    with _get_conn() as conn:
        try:
            conn.execute(
                "INSERT INTO users (username,email,password,role,customer_id) VALUES(?,?,?,?,?)",
                (user.username, user.email, _hash_password(user.password),
                 user.role, user.customer_id),
            )
            conn.commit()
        except sqlite3.IntegrityError:
            raise HTTPException(status.HTTP_409_CONFLICT, "Username or email already exists.")


def db_list_users() -> list[dict]:
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT id,username,email,role,customer_id,created_at FROM users"
        ).fetchall()
    return [dict(r) for r in rows]


def db_delete_user(user_id: int) -> None:
    with _get_conn() as conn:
        conn.execute("DELETE FROM users WHERE id=?", (user_id,))
        conn.commit()


# ══════════════════════════════════════════════════════════════════════
# JWT
# ══════════════════════════════════════════════════════════════════════

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenData(username=payload.get("sub"), role=payload.get("role"))
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token.")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(401, "Invalid token.")

    customer_id = payload.get("customer_id")
    role        = payload.get("role", "user")
    sub         = payload.get("sub", "")

    # Customer-ID direct login — sub won't match any DB user
    if customer_id and role == "user":
        user = db_get_user(sub)
        if not user:
            return {
                "id":          0,
                "username":    sub,
                "email":       "",
                "role":        "user",
                "customer_id": customer_id,
                "created_at":  "",
            }
        # DB user with customer_id — return dict with customer_id from JWT
        user_dict = dict(user)
        user_dict["customer_id"] = customer_id  # ensure JWT customer_id is used
        return user_dict

    # Normal DB login (admin or user without customer_id in JWT)
    user = db_get_user(sub)
    if not user:
        raise HTTPException(401, "User not found.")
    return dict(user)
def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required."
        )
    return current_user


@router.post("/register", response_model=UserOut)
def register(payload: UserRegister, _admin=Depends(require_admin)):
    db_create_user(payload)
    user = db_get_user(payload.username)
    return UserOut(**dict(user))


@router.get("/me", response_model=UserOut)
def me(current_user: dict = Depends(get_current_user)):
    return UserOut(**current_user)


@router.get("/users", response_model=list[dict])
def list_users(_admin=Depends(require_admin)):
    return db_list_users()


@router.delete("/users/{user_id}")
def delete_user(user_id: int, _admin=Depends(require_admin)):
    db_delete_user(user_id)
    return {"detail": f"User {user_id} deleted."}


# ══════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════

@router.post("/login", response_model=Token)
def login(payload: UserLogin):
    user = db_get_user(payload.username)
    if not user or not _verify_password(payload.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )
    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return Token(
        access_token=token,
        role=user["role"],
        username=user["username"],
        customer_id=user["customer_id"],
    )


@router.post("/login/customer")
def login_as_customer(payload: UserLogin):
    import pandas as pd

    customer_id = payload.username.strip()

    rfm_path = ROOT / "data" / "processed" / "rfm_segmented.csv"
    if not rfm_path.exists():
        raise HTTPException(503, "RFM data not ready.")

    df = pd.read_csv(rfm_path, dtype={"customer_id": str})
    row = df[df["customer_id"] == customer_id]
    if row.empty:
        stripped = customer_id.lstrip("0")
        row = df[df["customer_id"].str.lstrip("0") == stripped]
    if row.empty:
        raise HTTPException(401, "Customer ID not found in our records.")

    cluster = int(row.iloc[0]["cluster"])

    token = create_access_token({
        "sub":         customer_id[:16],
        "role":        "user",
        "customer_id": customer_id,
        "cluster":     cluster,
    })

    return Token(
        access_token=token,
        role="user",
        username=f"Customer {customer_id[:8]}...",
        customer_id=customer_id,
    )