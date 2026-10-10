import os
import chromadb
from chromadb.utils import embedding_functions
from app.agents.state import AgentState
from app.core.config import settings

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
        if results and results.get("documents"):
            for docs, metas in zip(results["documents"], results["metadatas"]):
                for doc, meta in zip(docs, metas):
                    evidence_list.append(doc)
                    src = f"{meta.get('source', 'Unknown')} ({meta.get('date', 'Unknown')})"
                    if src not in source_refs:
                        source_refs.append(src)

        if not evidence_list:
            return {
                "retrieved_evidence": None,
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
            "agent_status": {"rag_retrieval": "error"},
            "missing_information": ["agricultural_knowledge_base"],
            "errors": [f"RAG retrieval error: {str(e)}"]
        }
