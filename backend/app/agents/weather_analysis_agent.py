import httpx
from app.agents.state import AgentState
from app.core.config import settings

def weather_analysis_node(state: AgentState) -> dict:
    profile = state.get("field_profile") or {}
    lat = profile.get("latitude")
    lon = profile.get("longitude")

    if lat is None or lon is None:
        return {
            "weather_analysis": None,
            "agent_status": {"weather_analysis": "missing_coordinates"},
            "missing_information": ["weather_forecast (no coordinates provided)"]
        }

    url = settings.weather_api_url

    try:
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,precipitation",
            "timezone": "auto"
        }
        resp = httpx.get(url, params=params, timeout=5.0)
        resp.raise_for_status()
        data = resp.json()

        current = data.get("current", {})
        weather_analysis = {
            "temperature_c": current.get("temperature_2m"),
            "humidity_percent": current.get("relative_humidity_2m"),
            "precipitation_mm": current.get("precipitation"),
            "source_url": url,
            "provider": "Open-Meteo"
        }

        return {
            "weather_analysis": weather_analysis,
            "agent_status": {"weather_analysis": "completed"}
        }
    except Exception as e:
        return {
            "weather_analysis": None,
            "agent_status": {"weather_analysis": "unavailable"},
            "missing_information": ["weather_forecast (service unavailable)"],
            "errors": [f"Weather API error: {str(e)}"]
        }
