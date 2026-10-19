from collections.abc import Iterator
from typing import Any

from firebase_admin import firestore  # type: ignore[import-untyped]
from google.cloud.firestore import Client


from app.services.firebase_auth import _initialize

_firestore_client: Client | None = None


def get_firestore_client() -> Client:
    """Return the Firestore client using the initialized Firebase App."""
    global _firestore_client
    if _firestore_client is None:
        app = _initialize()
        _firestore_client = firestore.client(app)
    return _firestore_client


def iter_collection(collection_name: str, batch_size: int = 500) -> Iterator[dict[str, Any]]:
    """Yield all document snapshots from a collection as dictionaries."""
    db = get_firestore_client()
    query = db.collection(collection_name).limit(batch_size)
    docs = list(query.stream())

    while docs:
        for doc in docs:
            data = doc.to_dict() or {}
            data["id"] = doc.id
            yield data
        last_doc = docs[-1]
        docs = list(db.collection(collection_name).start_after(last_doc).limit(batch_size).stream())
