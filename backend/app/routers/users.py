import structlog
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError
from app.models import User
from app.schemas import UserCreate, UserRead, UserUpdate

logger = structlog.get_logger()
router = APIRouter(prefix="/api/users", tags=["users"])


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


@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: str, payload: UserUpdate, db: Session = Depends(get_db)
) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise AppError("user_not_found", "User not found", status=404)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    logger.info("user_updated", user_id=user_id)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, db: Session = Depends(get_db)) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise AppError("user_not_found", "User not found", status=404)
    db.delete(user)
    db.commit()
    logger.info("user_deleted", user_id=user_id)
