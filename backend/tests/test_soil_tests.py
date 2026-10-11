from fastapi.testclient import TestClient
from datetime import datetime, timezone

def test_create_soil_test_success(client: TestClient):
    client.post("/farms", json={"farm_id": "F-ST-1", "name": "Farm"})
    client.post("/fields", json={"field_id": "FLD-ST-1", "farm_id": "F-ST-1", "field_area_hectares": 5.0})

    now_iso = datetime.now(timezone.utc).isoformat()
    payload = {
        "soil_test_id": "ST-001",
        "field_id": "FLD-ST-1",
        "soil_ph": 6.8,
        "nitrogen_kg_per_ha": 90.0,
        "phosphorus_kg_per_ha": 42.0,
        "potassium_kg_per_ha": 58.0,
        "soil_moisture_percent": 22.5,
        "measurement_timestamp": now_iso,
        "measurement_source": "District Soil Testing Lab"
    }

    res = client.post("/soil-tests", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["soil_test_id"] == "ST-001"
    assert data["field_id"] == "FLD-ST-1"
    assert data["soil_ph"] == 6.8
    assert data["nitrogen_kg_per_ha"] == 90.0
    assert data["measurement_source"] == "District Soil Testing Lab"

def test_soil_test_missing_values_preserved_not_zero(client: TestClient):
    client.post("/farms", json={"farm_id": "F-ST-2", "name": "Farm"})
    client.post("/fields", json={"field_id": "FLD-ST-2", "farm_id": "F-ST-2", "field_area_hectares": 5.0})

    payload = {
        "soil_test_id": "ST-002",
        "field_id": "FLD-ST-2",
        "soil_ph": 7.0
        # N, P, K, moisture omitted
    }
    res = client.post("/soil-tests", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["soil_ph"] == 7.0
    assert data["nitrogen_kg_per_ha"] is None
    assert data["phosphorus_kg_per_ha"] is None
    assert data["potassium_kg_per_ha"] is None
    assert data["soil_moisture_percent"] is None

def test_soil_test_invalid_inputs(client: TestClient):
    client.post("/farms", json={"farm_id": "F-ST-3", "name": "Farm"})
    client.post("/fields", json={"field_id": "FLD-ST-3", "farm_id": "F-ST-3", "field_area_hectares": 5.0})

    # pH out of range (> 14)
    res_ph = client.post("/soil-tests", json={
        "soil_test_id": "ST-BAD-PH",
        "field_id": "FLD-ST-3",
        "soil_ph": 15.5
    })
    assert res_ph.status_code == 422

    # Negative nitrogen
    res_n = client.post("/soil-tests", json={
        "soil_test_id": "ST-BAD-N",
        "field_id": "FLD-ST-3",
        "nitrogen_kg_per_ha": -5.0
    })
    assert res_n.status_code == 422

    # Non-existent field
    res_fld = client.post("/soil-tests", json={
        "soil_test_id": "ST-NO-FLD",
        "field_id": "FLD-DOES-NOT-EXIST",
        "soil_ph": 6.5
    })
    assert res_fld.status_code == 404

def test_soil_test_history_and_latest(client: TestClient):
    client.post("/farms", json={"farm_id": "F-ST-4", "name": "Farm"})
    client.post("/fields", json={"field_id": "FLD-ST-4", "farm_id": "F-ST-4", "field_area_hectares": 5.0})

    # Check 404 on latest when empty
    res_empty = client.get("/fields/FLD-ST-4/latest-soil-test")
    assert res_empty.status_code == 404

    # Post test 1
    client.post("/soil-tests", json={
        "soil_test_id": "ST-1",
        "field_id": "FLD-ST-4",
        "soil_ph": 6.2,
        "measurement_timestamp": "2025-01-01T08:00:00Z"
    })

    # Post test 2
    client.post("/soil-tests", json={
        "soil_test_id": "ST-2",
        "field_id": "FLD-ST-4",
        "soil_ph": 6.7,
        "measurement_timestamp": "2025-06-01T08:00:00Z"
    })

    # History
    res_hist = client.get("/fields/FLD-ST-4/soil-tests")
    assert res_hist.status_code == 200
    assert res_hist.json()["total"] == 2
    assert res_hist.json()["soil_tests"][0]["soil_test_id"] == "ST-1"
    assert res_hist.json()["soil_tests"][1]["soil_test_id"] == "ST-2"

    # Latest
    res_latest = client.get("/fields/FLD-ST-4/latest-soil-test")
    assert res_latest.status_code == 200
    assert res_latest.json()["soil_test_id"] == "ST-2"
    assert res_latest.json()["soil_ph"] == 6.7
