from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from api.core.security import create_access_token, hash_password, verify_password
from api.db.deps import get_db
from api.db.models import User
from api.schemas.auth import RegisterRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    pw_bytes = payload.password.encode("utf-8")
    print("REGISTER password bytes length =", len(pw_bytes), "repr =", repr(payload.password))

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    try:
        hashed = hash_password(payload.password)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    user = User(email=payload.email, hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut(id=user.id, email=user.email)


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Swagger sends "username", we'll treat it as email
    email = form_data.username
    password = form_data.password

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token)
