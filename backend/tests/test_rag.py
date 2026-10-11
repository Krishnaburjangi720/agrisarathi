import pytest
from unittest.mock import patch, MagicMock
from app.agents.agricultural_rag_agent import agricultural_rag_node

def test_rag_missing_crop():
    state = {"requested_crop": ""}
    result = agricultural_rag_node(state)
    assert result["agent_status"]["rag_retrieval"] == "skipped"

@patch("app.agents.agricultural_rag_agent.get_chroma_client")
def test_rag_success(mock_get_client):
    mock_client = MagicMock()
    mock_collection = MagicMock()

    mock_collection.query.return_value = {
        "documents": [["Document chunk about wheat"]],
        "metadatas": [[{"source": "Test Source", "date": "2023"}]],
        "distances": [[0.5]]
    }
    mock_client.get_collection.return_value = mock_collection
    mock_get_client.return_value = mock_client

    state = {"requested_crop": "wheat"}

    with patch("app.agents.agricultural_rag_agent.embedding_functions.DefaultEmbeddingFunction"):
        result = agricultural_rag_node(state)

    assert result["agent_status"]["rag_retrieval"] == "completed"
    assert "Document chunk about wheat" in result["retrieved_evidence"]["passages"]
    assert "Test Source (2023)" in result["retrieved_evidence"]["sources"]

@patch("app.agents.agricultural_rag_agent.get_chroma_client")
def test_rag_no_data(mock_get_client):
    mock_client = MagicMock()
    mock_collection = MagicMock()

    mock_collection.query.return_value = {"documents": [], "metadatas": [], "distances": []}
    mock_client.get_collection.return_value = mock_collection
    mock_get_client.return_value = mock_client

    state = {"requested_crop": "dragonfruit"}

    with patch("app.agents.agricultural_rag_agent.embedding_functions.DefaultEmbeddingFunction"):
        result = agricultural_rag_node(state)

    assert result["agent_status"]["rag_retrieval"] == "no_data"
    assert any("dragonfruit" in m for m in result["missing_information"])

@patch("app.agents.agricultural_rag_agent.get_chroma_client")
def test_rag_maize_partial_relevance(mock_get_client):
    mock_client = MagicMock()
    mock_collection = MagicMock()

    # One relevant maize doc, one irrelevant wheat doc
    mock_collection.query.return_value = {
        "documents": [["Maize doc", "Wheat doc"]],
        "metadatas": [[{"source": "Maize Source", "date": "2022"}, {"source": "Wheat Source", "date": "2023"}]],
        "distances": [[0.6, 0.9]]
    }
    mock_client.get_collection.return_value = mock_collection
    mock_get_client.return_value = mock_client

    state = {"requested_crop": "maize"}

    with patch("app.agents.agricultural_rag_agent.embedding_functions.DefaultEmbeddingFunction"):
        result = agricultural_rag_node(state)

    assert result["agent_status"]["rag_retrieval"] == "completed"
    assert "Maize doc" in result["retrieved_evidence"]["passages"]
    assert "Wheat doc" not in result["retrieved_evidence"]["passages"]
    assert "Maize Source (2022)" in result["retrieved_evidence"]["sources"]

@patch("app.agents.agricultural_rag_agent.get_chroma_client")
def test_rag_dragonfruit_low_relevance(mock_get_client):
    mock_client = MagicMock()
    mock_collection = MagicMock()

    # Returned docs are above threshold (irrelevant)
    mock_collection.query.return_value = {
        "documents": [["Maize doc", "Wheat doc"]],
        "metadatas": [[{"source": "Maize Source", "date": "2022"}, {"source": "Wheat Source", "date": "2023"}]],
        "distances": [[1.05, 1.12]]
    }
    mock_client.get_collection.return_value = mock_collection
    mock_get_client.return_value = mock_client

    state = {"requested_crop": "dragonfruit"}

    with patch("app.agents.agricultural_rag_agent.embedding_functions.DefaultEmbeddingFunction"):
        result = agricultural_rag_node(state)

    assert result["agent_status"]["rag_retrieval"] == "no_data"
    assert result["retrieved_evidence"] is None
    assert result["source_references"] == []

@patch("app.agents.agricultural_rag_agent.get_chroma_client")
def test_rag_retrieval_error(mock_get_client):
    mock_client = MagicMock()
    mock_collection = MagicMock()
    mock_collection.query.side_effect = Exception("ChromaDB error")

    mock_client.get_collection.return_value = mock_collection
    mock_get_client.return_value = mock_client

    state = {"requested_crop": "wheat"}

    with patch("app.agents.agricultural_rag_agent.embedding_functions.DefaultEmbeddingFunction"):
        result = agricultural_rag_node(state)

    assert result["agent_status"]["rag_retrieval"] == "error"
    assert result["retrieved_evidence"] is None
    assert result["source_references"] == []
    assert any("ChromaDB error" in err for err in result["errors"])

@patch("app.agents.agricultural_rag_agent.get_chroma_client")
def test_rag_threshold_boundary(mock_get_client):
    mock_client = MagicMock()
    mock_collection = MagicMock()

    # Boundary test:
    # doc1 at 0.8499 (< 0.85) should be accepted
    # doc2 at 0.8500 (== 0.85) should be rejected
    # doc3 at 0.8501 (> 0.85) should be rejected
    mock_collection.query.return_value = {
        "documents": [["Borderline acceptable doc", "Exact threshold doc", "Above threshold doc"]],
        "metadatas": [[
            {"source": "Accepted Source", "date": "2024"},
            {"source": "Rejected Source 1", "date": "2024"},
            {"source": "Rejected Source 2", "date": "2024"}
        ]],
        "distances": [[0.8499, 0.8500, 0.8501]]
    }
    mock_client.get_collection.return_value = mock_collection
    mock_get_client.return_value = mock_client

    state = {"requested_crop": "wheat"}

    with patch("app.agents.agricultural_rag_agent.embedding_functions.DefaultEmbeddingFunction"):
        result = agricultural_rag_node(state)

    assert result["agent_status"]["rag_retrieval"] == "completed"
    assert "Borderline acceptable doc" in result["retrieved_evidence"]["passages"]
    assert "Exact threshold doc" not in result["retrieved_evidence"]["passages"]
    assert "Above threshold doc" not in result["retrieved_evidence"]["passages"]
    assert result["source_references"] == ["Accepted Source (2024)"]
    assert result["retrieved_evidence"]["sources"] == ["Accepted Source (2024)"]

@patch("app.agents.agricultural_rag_agent.get_chroma_client")
def test_rag_threshold_boundary_all_rejected(mock_get_client):
    mock_client = MagicMock()
    mock_collection = MagicMock()

    mock_collection.query.return_value = {
        "documents": [["Exact threshold doc"]],
        "metadatas": [[{"source": "Rejected Source", "date": "2024"}]],
        "distances": [[0.8500]]
    }
    mock_client.get_collection.return_value = mock_collection
    mock_get_client.return_value = mock_client

    state = {"requested_crop": "wheat"}

    with patch("app.agents.agricultural_rag_agent.embedding_functions.DefaultEmbeddingFunction"):
        result = agricultural_rag_node(state)

    assert result["agent_status"]["rag_retrieval"] == "no_data"
    assert result["retrieved_evidence"] is None
    assert result["source_references"] == []
