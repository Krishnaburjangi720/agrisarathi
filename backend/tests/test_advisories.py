import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

def test_advisory_successful_execution(client: TestClient):
    # Create Farm
    client.post("/farms", json={"farm_id": "FARM-1", "name": "Farm"})

    # Create Field
    client.post("/fields", json={
        "field_id": "FIELD-1",
        "farm_id": "FARM-1",
        "field_area_hectares": 2.5,
        "soil_type": "loamy",
        "irrigation_source": "borewell",
        "water_availability": "adequate"
    })

    # Create Soil Test
    client.post("/soil-tests", json={
        "soil_test_id": "ST-1",
        "field_id": "FIELD-1",
        "soil_ph": 6.5,
        "soil_moisture_percent": 25.0
    })

    # Request Advisory
    with patch("app.agents.weather_analysis_agent.httpx.get") as mock_weather, \
         patch("app.agents.agricultural_rag_agent.get_chroma_client") as mock_rag:

        mock_resp = MagicMock()
        mock_resp.json.return_value = {"current": {"temperature_2m": 25.0, "precipitation": 0.0}}
        mock_weather.return_value = mock_resp
        mock_rag.return_value = None

        resp = client.post("/advisories/analyze", json={
            "field_id": "FIELD-1",
            "requested_crop": "wheat"
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["field_id"] == "FIELD-1"
    assert data["requested_crop"] == "wheat"
    assert data["field_profile"]["soil_type"] == "loamy"
    assert data["soil_analysis"]["soil_ph"] == 6.5

    # Suitability Categories
    assert data["crop_suitability"]["category"] == "Suitable"

    # Weather Analysis fallback (since missing coords in FARM-1)
    assert "weather_analysis" in data["agent_status"]
    assert data["agent_status"]["weather_analysis"] == "missing_coordinates"

def test_advisory_nonexistent_field(client: TestClient):
    resp = client.post("/advisories/analyze", json={
        "field_id": "NONEXISTENT",
        "requested_crop": "wheat"
    })

    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()

def test_advisory_unsupported_crop(client: TestClient):
    client.post("/farms", json={"farm_id": "FARM-2", "name": "Farm"})
    client.post("/fields", json={"field_id": "FIELD-2", "farm_id": "FARM-2", "field_area_hectares": 2.5})

    with patch("app.agents.weather_analysis_agent.httpx.get"), patch("app.agents.agricultural_rag_agent.get_chroma_client"):
        resp = client.post("/advisories/analyze", json={
            "field_id": "FIELD-2",
            "requested_crop": "dragonfruit"
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["agent_status"]["crop_planning"] == "unsupported_crop"
    assert data["crop_suitability"]["category"] == "Insufficient Data: Crop Unspecified"

def test_advisory_missing_soil_test(client: TestClient):
    client.post("/farms", json={"farm_id": "FARM-3", "name": "Farm"})
    client.post("/fields", json={"field_id": "FIELD-3", "farm_id": "FARM-3", "field_area_hectares": 2.5})

    with patch("app.agents.weather_analysis_agent.httpx.get"), patch("app.agents.agricultural_rag_agent.get_chroma_client"):
        resp = client.post("/advisories/analyze", json={
            "field_id": "FIELD-3",
            "requested_crop": "wheat"
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["agent_status"]["soil_analysis"] == "no_data"
    assert "soil_test" in data["missing_information"]

def test_advisory_unsuitable_conditions(client: TestClient):
    client.post("/farms", json={"farm_id": "FARM-4", "name": "Farm"})
    client.post("/fields", json={
        "field_id": "FIELD-4",
        "farm_id": "FARM-4",
        "field_area_hectares": 2.5,
        "water_availability": "seasonal"
    })

    client.post("/soil-tests", json={
        "soil_test_id": "ST-4",
        "field_id": "FIELD-4",
        "soil_ph": 6.5,
        "soil_moisture_percent": 25.0
    })

    with patch("app.agents.weather_analysis_agent.httpx.get"), patch("app.agents.agricultural_rag_agent.get_chroma_client"):
        resp = client.post("/advisories/analyze", json={
            "field_id": "FIELD-4",
            "requested_crop": "wheat"  # requires adequate water
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["crop_suitability"]["category"] == "Agronomic Review Required"
    assert any("availability is seasonal" in f for f in data["crop_suitability"]["limiting_factors"])
