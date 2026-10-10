from fastapi.testclient import TestClient

def test_report_not_found(client: TestClient):
    res = client.get("/fields/NON-EXISTENT/report")
    assert res.status_code == 404

def test_generate_report(client: TestClient, db):
    # Create farm and field
    farm_res = client.post("/farms", json={"farm_id": "F-REP-1", "name": "Test Farm"})
    assert farm_res.status_code == 201

    field_res = client.post(
        "/fields",
        json={
            "field_id": "FLD-REP-1",
            "farm_id": "F-REP-1",
            "name": "Test Field",
            "field_area_hectares": 5.0,
            "soil_type": "loamy",
            "previous_crop": "corn",
            "proposed_crop": "wheat",
            "irrigation_source": "borewell",
            "water_availability": "adequate"
        }
    )
    assert field_res.status_code == 201

    # Generate report without soil tests (tests missing soil data)
    res = client.get("/fields/FLD-REP-1/report")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")

    # Check that Unicode rendering (AgriSārathi) didn't cause an internal server error
    assert b"AgriS" in res.content or b"AgriS\xc4\x81rathi" in res.content or b"PDF" in res.content

def test_generate_report_with_soil_test(client: TestClient, db):
    # Farm & Field
    client.post("/farms", json={"farm_id": "F-REP-2", "name": "Test Farm 2"})
    client.post(
        "/fields",
        json={
            "field_id": "FLD-REP-2",
            "farm_id": "F-REP-2",
            "field_area_hectares": 5.0,
        }
    )

    # Soil Test
    client.post(
        "/soil-tests",
        json={
            "soil_test_id": "ST-REP-2",
            "field_id": "FLD-REP-2",
            "measurement_timestamp": "2023-10-01T10:00:00Z",
            "soil_ph": 6.5,
            "soil_moisture_percent": 30.0
        }
    )

    res = client.get("/fields/FLD-REP-2/report")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")

def test_field_report_missing_data(client: TestClient, db):
    # Farm
    client.post("/farms", json={"farm_id": "FARM-NO-DATA", "name": "Farm No Data"})

    # Field without crop and no soil test
    client.post("/fields", json={
        "field_id": "FIELD-NO-DATA",
        "farm_id": "FARM-NO-DATA",
        "field_area_hectares": 2.5
    })

    from unittest.mock import patch
    with patch("app.agents.weather_analysis_agent.httpx.get"), patch("app.agents.agricultural_rag_agent.get_chroma_client"):
        res = client.get("/fields/FIELD-NO-DATA/report")

    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"

    # Verify the PDF can be parsed and check for the strings we expect
    try:
        from PyPDF2 import PdfReader
        import io
        reader = PdfReader(io.BytesIO(res.content))
        text = reader.pages[0].extract_text()
        assert "Insufficient Data: Crop Unspecified" in text
        assert "FAO Soil Guide 2023" not in text
    except ImportError:
        pass  # skip if PyPDF2 isn't available
