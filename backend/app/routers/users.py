import structlog
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError
from app.models import User
from app.schemas import LoginIn, LoginOut, UserCreate, UserRead, UserUpdate
from app.services.phase_engine import calculate_dynamic_rdas

logger = structlog.get_logger()
router = APIRouter(prefix="/api/users", tags=["users"])


# This is a mock password shared by every user in the prototype. It is
# intentionally not hashed because real authentication (Firebase phone OTP)
# is explicitly out of scope for Round 2. Do not copy this pattern to
# production.
_MOCK_PASSWORD = "test123"


@router.post("/login", response_model=LoginOut)
async def login(payload: LoginIn, db: Session = Depends(get_db)) -> LoginOut:
    """Mock login.

    Accepts any username. If the username has not been seen before, creates
    the user with name = username and phase unset. The password is a hardcoded
    prototype constant; on mismatch we return 401 so the frontend can show a
    clear "wrong password" message.
    """
    # Hardcoded prototype password check. Not real auth. Validate credentials
    # before touching the database so a wrong password does not create a user.
    if payload.password != _MOCK_PASSWORD:
        raise AppError("invalid_credentials", "Incorrect username or password", status=401)

    user = db.query(User).filter(User.username == payload.username).first()
    if user is None:
        user = User(
            username=payload.username,
            name=payload.username,
            phase=None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("user_created_on_login", user_id=user.id, username=user.username)

    logger.info("user_logged_in", user_id=user.id, username=user.username)
    return LoginOut(
        user_id=user.id,
        username=user.username,
        name=user.name,
        phase=user.phase,
        token=user.id,
    )


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    user = User(**payload.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("user_created", user_id=user.id)
    return user


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: str, db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise AppError("user_not_found", "User not found", status=404)
    return user


def _apply_phase_targets_from_age(user: User) -> None:
    """Recalculate targets when age changes while a phase is already set."""
    if not user.phase:
        return
    try:
        targets = calculate_dynamic_rdas(
            base_age=user.age or 30,
            base_gender=user.gender or "female",
            phase=user.phase,
        )
    except ValueError:
        return
    user.target_iron_mg = targets.target_iron_mg
    user.target_calcium_mg = targets.target_calcium_mg
    user.target_vit_d_iu = targets.target_vit_d_mcg * 40.0
    user.target_b12_mcg = targets.target_b12_mcg


@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: str, payload: UserUpdate, db: Session = Depends(get_db)
) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise AppError("user_not_found", "User not found", status=404)

    data = payload.model_dump(exclude_unset=True)

    if "username" in data and data["username"] != user.username:
        existing = (
            db.query(User).filter(User.username == data["username"]).first()
        )
        if existing is not None:
            raise AppError(
                "username_taken",
                "This username is already taken. Please choose another one.",
                status=409,
            )

    age_changed = "age" in data and data["age"] != user.age
    for field, value in data.items():
        setattr(user, field, value)

    if age_changed:
        _apply_phase_targets_from_age(user)

    db.commit()
    db.refresh(user)
    logger.info("user_updated", user_id=user_id, fields=list(data.keys()))
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, db: Session = Depends(get_db)) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise AppError("user_not_found", "User not found", status=404)
    db.delete(user)
    db.commit()
    logger.info("user_deleted", user_id=user_id)
