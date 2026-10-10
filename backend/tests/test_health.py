"""
Tests for GET /health
"""


def test_health_returns_ok(client):
    """Health endpoint returns HTTP 200 with status='ok'."""
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "version" in body
    assert "environment" in body
