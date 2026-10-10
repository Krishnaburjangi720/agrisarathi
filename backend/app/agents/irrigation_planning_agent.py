from app.agents.state import AgentState
from datetime import datetime, timezone

def irrigation_planning_node(state: AgentState) -> dict:
    profile = state.get("field_profile") or {}
    soil = state.get("soil_analysis") or {}
    weather = state.get("weather_analysis") or {}
    use_sensors = state.get("use_simulated_sensors", False)

    moisture = soil.get("soil_moisture_percent")
    source = profile.get("irrigation_source")
    precip = weather.get("precipitation_mm")

    provenance = "simulated sensor telemetry" if use_sensors else "historical soil test"

    assessment = {
        "decision": "Unknown",
        "reason": "Insufficient data to determine irrigation needs.",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    if precip is not None and precip > 10.0:
        assessment = {
            "decision": "No Immediate Irrigation Needed",
            "reason": f"Significant precipitation expected/recorded ({precip} mm).",
            "evidence": "weather_forecast",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    elif source == "rainfed":
        assessment = {
            "decision": "Rely on rainfall",
            "reason": "Field is strictly rainfed. Monitor weather forecasts closely.",
            "evidence": "field_profile",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    elif moisture is not None:
        if moisture < 20.0:
            assessment = {
                "decision": "Irrigation Recommended",
                "reason": f"Soil moisture is low ({moisture}%). Provide supplemental irrigation if water is available.",
                "evidence": provenance,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        else:
            assessment = {
                "decision": "No Immediate Irrigation Needed",
                "reason": f"Soil moisture is adequate ({moisture}%).",
                "evidence": provenance,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    else:
        return {
            "irrigation_assessment": assessment,
            "missing_information": ["soil_moisture_percent", "precipitation_mm"],
            "agent_status": {"irrigation_planning": "insufficient_data"}
        }

    return {
        "irrigation_assessment": assessment,
        "agent_status": {"irrigation_planning": "completed"}
    }
