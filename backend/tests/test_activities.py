from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta

def test_create_activity(client: TestClient, db):
    # Setup field
    client.post("/farms", json={"farm_id": "F-ACT-1", "name": "Test"})
    client.post("/fields/", json={
        "field_id": "FLD-ACT-1", "farm_id": "F-ACT-1",
        "field_area_hectares": 5.0, "soil_type": "loamy", "previous_crop": "corn", "proposed_crop": "wheat",
        "irrigation_source": "borewell", "water_availability": "adequate"
    })

    response = client.post(
        "/activities/",
        json={
            "activity_id": "ACT-1",
            "field_id": "FLD-ACT-1",
            "title": "Planting",
            "due_date": "2030-01-01"
        }
    )
    assert response.status_code == 201
    assert response.json()["title"] == "Planting"
    assert response.json()["status"] == "pending"

def test_activity_not_found(client: TestClient):
    response = client.get("/activities/ACT-999")
    assert response.status_code == 404

def test_overdue_activity(client: TestClient, db):
    # Setup field
    client.post("/farms", json={"farm_id": "F-ACT-2", "name": "Test"})
    client.post("/fields/", json={
        "field_id": "FLD-ACT-2", "farm_id": "F-ACT-2",
        "field_area_hectares": 5.0, "soil_type": "loamy", "previous_crop": "corn", "proposed_crop": "wheat",
        "irrigation_source": "borewell", "water_availability": "adequate"
    })

    # Create past due date activity
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    client.post(
        "/activities",
        json={
            "activity_id": "ACT-2",
            "field_id": "FLD-ACT-2",
            "title": "Harvesting",
            "due_date": yesterday
        }
    )

    # Get lists and trigger overdue logic
    response = client.get("/activities/?field_id=FLD-ACT-2")
    assert response.status_code == 200
    activities = response.json()["items"]
    act = next(a for a in activities if a["activity_id"] == "ACT-2")
    assert act["status"] == "overdue"

def test_update_activity(client: TestClient, db):
    client.post("/farms", json={"farm_id": "F-ACT-3", "name": "Test"})
    client.post("/fields/", json={
        "field_id": "FLD-ACT-3", "farm_id": "F-ACT-3",
        "field_area_hectares": 5.0, "soil_type": "loamy", "previous_crop": "corn", "proposed_crop": "wheat",
        "irrigation_source": "borewell", "water_availability": "adequate"
    })

    client.post(
        "/activities",
        json={
            "activity_id": "ACT-3",
            "field_id": "FLD-ACT-3",
            "title": "Weeding",
        }
    )

    res = client.patch("/activities/ACT-3", json={"status": "completed"})
    assert res.status_code == 200
    assert res.json()["status"] == "completed"
