from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

def test_weather_field_not_found(client: TestClient):
    res = client.get("/weather/current?field_id=NONEXISTENT")
    assert res.status_code == 404

def test_weather_missing_coordinates(client: TestClient):
    client.post("/farms", json={"farm_id": "F-NO-COORD", "name": "No Coord Farm"})
    client.post("/fields", json={
        "field_id": "FLD-NO-COORD",
        "farm_id": "F-NO-COORD",
        "field_area_hectares": 5.0
    })

    res = client.get("/weather/current?field_id=FLD-NO-COORD")
    assert res.status_code == 404
    assert "coordinates" in res.json()["detail"].lower()

def test_weather_success_with_coordinates(client: TestClient):
    client.post("/farms", json={
        "farm_id": "F-COORD",
        "name": "Coord Farm",
        "latitude": 26.85,
        "longitude": 80.91
    })
    client.post("/fields", json={
        "field_id": "FLD-COORD",
        "farm_id": "F-COORD",
        "field_area_hectares": 10.0
    })

    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "current": {
            "temperature_2m": 24.5,
            "relative_humidity_2m": 60,
            "precipitation": 0.0,
            "wind_speed_10m": 12.0
        }
    }
    mock_resp.raise_for_status = MagicMock()

    with patch("httpx.get", return_value=mock_resp):
        res = client.get("/weather/current?field_id=FLD-COORD")
        assert res.status_code == 200
        data = res.json()
        assert data["field_id"] == "FLD-COORD"
        assert data["temperature_c"] == 24.5
        assert data["humidity_percent"] == 60
        assert data["conditions"] == "clear_sky"
