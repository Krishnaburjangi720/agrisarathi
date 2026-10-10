from app.agents.state import AgentState
from app.services.ml_service import ml_service

def ml_prediction_node(state: AgentState) -> dict:
    soil = state.get("soil_analysis") or {}
    weather = state.get("weather_analysis") or {}

    ph = soil.get("soil_ph")
    moisture = soil.get("soil_moisture_percent")
    temp = weather.get("temperature_c")
    precip = weather.get("precipitation_mm")

    if ph is None or moisture is None or temp is None or precip is None:
        return {
            "ml_prediction": None,
            "agent_status": {"ml_prediction": "insufficient_data"},
            "missing_information": ["Complete features required for ML prediction (ph, moisture, temp, precip)"]
        }

    risk_level = ml_service.predict_risk(ph, moisture, temp, precip)

    return {
        "ml_prediction": {
            "risk_level": risk_level,
            "model": "RandomForestClassifier (Synthetic Data)",
            "features_used": ["soil_ph", "soil_moisture_percent", "temperature_c", "precipitation_mm"]
        },
        "agent_status": {"ml_prediction": "completed"}
    }
