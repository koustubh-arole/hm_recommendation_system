"""
api/models.py
-------------
Pydantic models for auth and user management.
"""
from pydantic import BaseModel, EmailStr
from typing import Literal, Optional


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Literal["user", "admin"] = "user"
    customer_id: Optional[str] = None   # link to HM customer for recommendations


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: Literal["user", "admin"]
    customer_id: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Literal["user", "admin"]
    username: str
    customer_id: Optional[str] = None


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
