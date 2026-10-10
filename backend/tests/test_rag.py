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
        "metadatas": [[{"source": "Test Source", "date": "2023"}]]
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

    mock_collection.query.return_value = {"documents": [], "metadatas": []}
    mock_client.get_collection.return_value = mock_collection
    mock_get_client.return_value = mock_client

    state = {"requested_crop": "dragonfruit"}

    with patch("app.agents.agricultural_rag_agent.embedding_functions.DefaultEmbeddingFunction"):
        result = agricultural_rag_node(state)

    assert result["agent_status"]["rag_retrieval"] == "no_data"
    assert any("dragonfruit" in m for m in result["missing_information"])
