import os
import sys
import glob
import logging
import chromadb
from chromadb.utils import embedding_functions

# Add the backend directory to sys.path so 'app' can be imported when running as a script
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

logger = logging.getLogger(__name__)

def ingest_knowledge_base():
    try:
        from app.core.config import settings
    except ImportError:
        logger.error("Could not import app.core.config.settings")
        return

    try:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        data_dir = os.path.join(base_dir, "data")
        kb_dir = os.path.join(data_dir, "knowledge_base")
        db_path = os.path.join(data_dir, "chroma_db")

        if not os.path.exists(kb_dir):
            logger.warning(f"Knowledge base directory not found: {kb_dir}")
            return

        if not os.path.exists(data_dir):
            os.makedirs(data_dir, exist_ok=True)

        # Initialize ChromaDB client
        client = chromadb.PersistentClient(path=db_path)
        emb_fn = embedding_functions.DefaultEmbeddingFunction()

        collection_name = settings.rag_collection_name

        # Create or get collection
        collection = client.get_or_create_collection(
            name=collection_name,
            embedding_function=emb_fn
        )

        md_files = glob.glob(os.path.join(kb_dir, "*.md"))
        if not md_files:
            logger.info("No markdown files found in knowledge base.")
            return

        documents = []
        metadatas = []
        ids = []

        for md_file in md_files:
            filename = os.path.basename(md_file)
            if filename.lower() == "readme.md":
                continue

            try:
                with open(md_file, "r", encoding="utf-8") as f:
                    content = f.read()

                if not content.strip():
                    continue

                doc_id = filename.replace(".md", "")

                documents.append(content)
                metadatas.append({"source": filename, "date": "2026"})
                ids.append(doc_id)
            except Exception as e:
                logger.error(f"Failed to process file {filename}: {e}")

        if documents:
            # upsert handles updating existing documents without duplicating them
            collection.upsert(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            logger.info(f"Successfully upserted {len(documents)} documents into ChromaDB collection '{collection_name}'.")
        else:
            logger.info("No valid documents to ingest.")

    except Exception as e:
        logger.error(f"Unhandled exception during RAG ingestion: {e}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    ingest_knowledge_base()
