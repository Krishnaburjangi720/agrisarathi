from fastapi.testclient import TestClient

def test_download_report_field_not_found(client: TestClient):
    res = client.get("/fields/NONEXISTENT-FIELD/report")
    assert res.status_code == 404

def test_download_report_success(client: TestClient):
    # Setup farm and field
    client.post("/farms", json={"farm_id": "F-RPT-1", "name": "Report Farm"})
    client.post("/fields", json={
        "field_id": "FLD-RPT-1",
        "farm_id": "F-RPT-1",
        "field_area_hectares": 8.0,
        "soil_type": "loamy",
        "proposed_crop": "wheat"
    })

    # Add soil test
    client.post("/soil-tests", json={
        "soil_test_id": "ST-RPT-1",
        "field_id": "FLD-RPT-1",
        "soil_ph": 6.8,
        "nitrogen_kg_per_ha": 85.0
    })

    # Add activity
    client.post("/activities", json={
        "activity_id": "ACT-RPT-1",
        "field_id": "FLD-RPT-1",
        "title": "Irrigation cycle",
        "due_date": "2030-05-01"
    })

    # Download report
    res = client.get("/fields/FLD-RPT-1/report")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")
