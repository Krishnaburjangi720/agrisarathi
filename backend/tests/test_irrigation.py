from app.agents.irrigation_planning_agent import irrigation_planning_node

def test_irrigation_rainfed():
    state = {"field_profile": {"irrigation_source": "rainfed"}}
    res = irrigation_planning_node(state)
    assert res["irrigation_assessment"]["decision"] == "Rely on rainfall"
    assert res["agent_status"]["irrigation_planning"] == "completed"

def test_irrigation_precip():
    state = {"weather_analysis": {"precipitation_mm": 15.0}}
    res = irrigation_planning_node(state)
    assert res["irrigation_assessment"]["decision"] == "No Immediate Irrigation Needed"

def test_irrigation_insufficient_data():
    state = {}
    res = irrigation_planning_node(state)
    assert res["agent_status"]["irrigation_planning"] == "insufficient_data"
    assert "soil_moisture_percent" in res["missing_information"]

def test_irrigation_sensor_provenance():
    state = {
        "soil_analysis": {"soil_moisture_percent": 15.0},
        "use_simulated_sensors": True
    }
    res = irrigation_planning_node(state)
    assert res["irrigation_assessment"]["evidence"] == "simulated sensor telemetry"
    assert res["irrigation_assessment"]["decision"] == "Irrigation Recommended"

def test_irrigation_historical_provenance():
    state = {
        "soil_analysis": {"soil_moisture_percent": 25.0},
        "use_simulated_sensors": False
    }
    res = irrigation_planning_node(state)
    assert res["irrigation_assessment"]["evidence"] == "historical soil test"
    assert res["irrigation_assessment"]["decision"] == "No Immediate Irrigation Needed"
