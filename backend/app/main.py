import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.errors import add_exception_handler
from app.middleware.firebase_auth import FirebaseAuthMiddleware
from app.routers import chat, cheat_day, dashboard, foods, health, logs, parse, phase, streak, transcribe, users

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger()


def create_app() -> FastAPI:
    app = FastAPI(title="AURA-Nutri API", version="0.1.0")

    app.add_middleware(FirebaseAuthMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "https://aura-nutri-prototype.vercel.app"],
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    add_exception_handler(app)

    Base.metadata.create_all(bind=engine)

    from sqlalchemy.orm import Session
    from app.models import Food
    from scripts.seed_db import seed

    with Session(engine) as session:
        if session.query(Food).count() == 0:
            logger.info("database_empty_seeding_now")
            seed()

    app.include_router(health.router)
    app.include_router(users.router)
    app.include_router(foods.router)
    app.include_router(logs.router)
    app.include_router(parse.router)
    app.include_router(dashboard.router)
    app.include_router(cheat_day.router)
    app.include_router(streak.router)
    app.include_router(phase.router)
    app.include_router(chat.router)
    app.include_router(transcribe.router)

    @app.get("/health")
    async def health_check() -> dict[str, str]:
        logger.info("health_check_called")
        return {"status": "ok"}

    return app


app = create_app()
