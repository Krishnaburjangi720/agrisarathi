from fastapi.testclient import TestClient

def test_create_field_success(client: TestClient):
    # Setup farm
    client.post("/farms", json={"farm_id": "F-FLD-1", "name": "Test Farm"})

    payload = {
        "field_id": "FLD-001",
        "farm_id": "F-FLD-1",
        "field_area_hectares": 12.5,
        "soil_type": "loamy",
        "previous_crop": "mustard",
        "proposed_crop": "wheat",
        "irrigation_source": "borewell",
        "water_availability": "adequate"
    }
    response = client.post("/fields", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["field_id"] == "FLD-001"
    assert data["farm_id"] == "F-FLD-1"
    assert data["field_area_hectares"] == 12.5
    assert data["soil_type"] == "loamy"
    assert data["proposed_crop"] == "wheat"

def test_create_field_invalid_farm(client: TestClient):
    response = client.post("/fields", json={
        "field_id": "FLD-NOFARM",
        "farm_id": "NON-EXISTENT",
        "field_area_hectares": 5.0
    })
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

def test_create_field_duplicate_id(client: TestClient):
    client.post("/farms", json={"farm_id": "F-DUP", "name": "Dup Farm"})
    client.post("/fields", json={
        "field_id": "FLD-DUP",
        "farm_id": "F-DUP",
        "field_area_hectares": 3.0
    })
    res2 = client.post("/fields", json={
        "field_id": "FLD-DUP",
        "farm_id": "F-DUP",
        "field_area_hectares": 4.0
    })
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]

def test_create_field_invalid_inputs(client: TestClient):
    client.post("/farms", json={"farm_id": "F-VAL", "name": "Val Farm"})

    # Invalid area <= 0
    res1 = client.post("/fields", json={
        "field_id": "FLD-BAD-AREA",
        "farm_id": "F-VAL",
        "field_area_hectares": 0.0
    })
    assert res1.status_code == 422

    # Invalid ID with spaces
    res2 = client.post("/fields", json={
        "field_id": "FLD BAD ID",
        "farm_id": "F-VAL",
        "field_area_hectares": 5.0
    })
    assert res2.status_code == 422

def test_get_and_list_fields(client: TestClient):
    client.post("/farms", json={"farm_id": "F-LST-1", "name": "Farm 1"})
    client.post("/farms", json={"farm_id": "F-LST-2", "name": "Farm 2"})

    client.post("/fields", json={"field_id": "FLD-1", "farm_id": "F-LST-1", "field_area_hectares": 4.0})
    client.post("/fields", json={"field_id": "FLD-2", "farm_id": "F-LST-1", "field_area_hectares": 6.0})
    client.post("/fields", json={"field_id": "FLD-3", "farm_id": "F-LST-2", "field_area_hectares": 8.0})

    # List all fields
    res_all = client.get("/fields")
    assert res_all.status_code == 200
    assert res_all.json()["total"] == 3
    assert len(res_all.json()["fields"]) == 3

    # Filter by farm_id
    res_farm1 = client.get("/fields?farm_id=F-LST-1")
    assert res_farm1.status_code == 200
    assert res_farm1.json()["total"] == 2
    assert all(f["farm_id"] == "F-LST-1" for f in res_farm1.json()["fields"])

    # Get single field
    res_single = client.get("/fields/FLD-1")
    assert res_single.status_code == 200
    assert res_single.json()["field_id"] == "FLD-1"

    # Get non-existent
    res_404 = client.get("/fields/FLD-NONEXISTENT")
    assert res_404.status_code == 404

def test_patch_field(client: TestClient):
    client.post("/farms", json={"farm_id": "F-PCH", "name": "Patch Farm"})
    client.post("/fields", json={
        "field_id": "FLD-PCH",
        "farm_id": "F-PCH",
        "field_area_hectares": 10.0,
        "soil_type": "clay",
        "proposed_crop": "rice"
    })

    # Update only proposed_crop and area
    res = client.patch("/fields/FLD-PCH", json={
        "proposed_crop": "cotton",
        "field_area_hectares": 11.5
    })
    assert res.status_code == 200
    data = res.json()
    assert data["proposed_crop"] == "cotton"
    assert data["field_area_hectares"] == 11.5
    assert data["soil_type"] == "clay"  # retained omitted value
