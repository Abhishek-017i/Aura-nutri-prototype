import structlog
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Food

logger = structlog.get_logger()


def search_foods(
    db: Session,
    query: str | None = None,
    category: str | None = None,
    limit: int = 20,
) -> list[Food]:
    q = db.query(Food)

    if category:
        q = q.filter(Food.category.ilike(category))

    if query and query.strip():
        pattern = f"%{query.strip()}%"
        q = q.filter(
            or_(
                Food.name_en.ilike(pattern),
                Food.name_hi.ilike(pattern),
                Food.aliases.ilike(pattern),
            )
        )

    results = q.order_by(Food.name_en).limit(limit).all()

    logger.info(
        "food_search",
        query=query,
        category=category,
        limit=limit,
        result_count=len(results),
    )

    return results
