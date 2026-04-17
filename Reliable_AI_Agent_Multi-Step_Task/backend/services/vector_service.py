"""FAISS-backed vector memory service for contextual retrieval."""

from __future__ import annotations

from typing import Any

import faiss
from sentence_transformers import SentenceTransformer


class VectorService:
    """Manage embeddings and FAISS index operations for task memory."""

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> None:
        self.model = SentenceTransformer(model_name)
        self.index: faiss.IndexFlatL2 | None = None
        self.documents: list[str] = []

    def add_documents(self, texts: list[str]) -> None:
        """Embed and insert new context documents into the FAISS index."""
        if not texts:
            return

        vectors = self.model.encode(texts)
        if self.index is None:
            self.index = faiss.IndexFlatL2(len(vectors[0]))
        self.index.add(vectors)
        self.documents.extend(texts)

    def search(self, query: str, k: int = 5) -> list[dict[str, Any]]:
        """Return top-k nearest documents for a query string."""
        if self.index is None or not self.documents:
            return []

        query_vector = self.model.encode([query])
        distances, indices = self.index.search(query_vector, k)

        results: list[dict[str, Any]] = []
        for rank, index in enumerate(indices[0]):
            if index < 0 or index >= len(self.documents):
                continue
            results.append(
                {
                    "rank": rank + 1,
                    "document": self.documents[index],
                    "distance": float(distances[0][rank]),
                }
            )
        return results


# TODO: Persist index snapshots and metadata for warm restarts.
