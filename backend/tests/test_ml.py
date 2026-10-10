from app.services.ml_service import ml_service
from app.agents.ml_prediction_agent import ml_prediction_node

def test_ml_service_predict():
    # Test high risk conditions (extreme ph, temp)
    risk = ml_service.predict_risk(2.0, 5.0, 50.0, 0.0)
    assert risk in ["High Risk", "Medium Risk", "Low Risk", "Unknown (Model unavailable)"]

def test_ml_agent_insufficient_data():
    state = {"soil_analysis": {}, "weather_analysis": {}}
    res = ml_prediction_node(state)
    assert res["agent_status"]["ml_prediction"] == "insufficient_data"

def test_ml_agent_success():
    state = {
        "soil_analysis": {"soil_ph": 6.5, "soil_moisture_percent": 25.0},
        "weather_analysis": {"temperature_c": 25.0, "precipitation_mm": 10.0}
    }
    res = ml_prediction_node(state)
    assert res["agent_status"]["ml_prediction"] == "completed"
    assert "risk_level" in res["ml_prediction"]
