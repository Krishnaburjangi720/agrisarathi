from fastapi.testclient import TestClient

def test_simulated_sensors_active(client: TestClient):
    # Seed 42 produces active status with valid readings
    res = client.get("/sensors/simulated?field_id=FLD-1&seed=42")
    assert res.status_code == 200
    data = res.json()
    assert data["field_id"] == "FLD-1"
    assert data["is_simulated"] is True
    assert "readings" in data

def test_simulated_sensors_deterministic_seed(client: TestClient):
    res1 = client.get("/sensors/simulated?field_id=FLD-1&seed=100")
    res2 = client.get("/sensors/simulated?field_id=FLD-1&seed=100")
    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res1.json()["readings"] == res2.json()["readings"]
