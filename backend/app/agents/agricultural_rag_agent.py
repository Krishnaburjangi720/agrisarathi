import os
import chromadb
from chromadb.utils import embedding_functions
from app.agents.state import AgentState
from app.core.config import settings

# ChromaDB default distance metric for embeddings is squared L2 distance.
# Vectors produced by DefaultEmbeddingFunction (all-MiniLM-L6-v2) are unit normalized,
# where distance = 2 - 2 * cosine_similarity.
# A distance threshold of 0.85 (cosine_similarity ~ 0.575) distinguishes relevant
# crop documents (< 0.85) from irrelevant cross-crop or unsupported queries (>= 0.85).
RAG_RELEVANCE_DISTANCE_THRESHOLD = 0.85

def get_chroma_client():
    db_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "chroma_db")
    if not os.path.exists(db_path):
        return None
    return chromadb.PersistentClient(path=db_path)

def agricultural_rag_node(state: AgentState) -> dict:
    crop = state.get("requested_crop", "")
    if not crop:
        return {"agent_status": {"rag_retrieval": "skipped"}}

    client = get_chroma_client()
    if not client:
        return {
            "retrieved_evidence": None,
            "source_references": [],
            "agent_status": {"rag_retrieval": "unavailable"},
            "missing_information": ["agricultural_knowledge_base"]
        }

    try:
        emb_fn = embedding_functions.DefaultEmbeddingFunction()
        collection = client.get_collection(name=settings.rag_collection_name, embedding_function=emb_fn)

        results = collection.query(
            query_texts=[f"{crop} soil requirements, irrigation, risks"],
            n_results=3
        )

        evidence_list = []
        source_refs = []

        if results and results.get("documents") and results.get("distances"):
            for docs, metas, dists in zip(results["documents"], results["metadatas"], results["distances"]):
                for doc, meta, dist in zip(docs, metas, dists):
                    if dist < RAG_RELEVANCE_DISTANCE_THRESHOLD:
                        evidence_list.append(doc)
                        src = f"{meta.get('source', 'Unknown')} ({meta.get('date', 'Unknown')})"
                        if src not in source_refs:
                            source_refs.append(src)

        if not evidence_list:
            return {
                "retrieved_evidence": None,
                "source_references": [],
                "agent_status": {"rag_retrieval": "no_data"},
                "missing_information": [f"guidelines for {crop}"]
            }

        return {
            "retrieved_evidence": {
                "passages": evidence_list,
                "sources": source_refs
            },
            "source_references": source_refs,
            "agent_status": {"rag_retrieval": "completed"}
        }
    except Exception as e:
        return {
            "retrieved_evidence": None,
            "source_references": [],
            "agent_status": {"rag_retrieval": "error"},
            "missing_information": ["agricultural_knowledge_base"],
            "errors": [f"RAG retrieval error: {str(e)}"]
        }
