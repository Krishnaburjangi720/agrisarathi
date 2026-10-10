import os
import json
from app.agents.state import AgentState

def risk_advisory_node(state: AgentState) -> dict:
    recs = []
    risks = {"environmental_risks": []}

    suitability = state.get("crop_suitability") or {}
    if suitability.get("category") == "Suitable with Conditions":
        recs.append("Implement soil amendments or water conservation based on limiting factors.")
        risks["environmental_risks"].append("Suboptimal growing conditions identified.")

    evidence = state.get("retrieved_evidence")
    if evidence and evidence.get("passages"):
        risks["environmental_risks"].append("Potential environmental risks identified from agricultural knowledge base.")
        recs.append("Review detailed authoritative guidelines for crop-specific disease and risk management.")

    ml = state.get("ml_prediction") or {}
    risk_level = ml.get("risk_level")
    if risk_level:
        risks["environmental_risks"].append(f"ML Model predicts: {risk_level}")
        if risk_level == "High Risk":
            recs.append("Extreme caution advised due to high predicted risk level.")

    missing = state.get("missing_information") or []
    if missing:
        recs.append(f"Collect missing data for better planning: {', '.join(missing)}.")

    weather_status = state.get("agent_status", {}).get("weather_analysis")
    if weather_status == "unavailable":
        recs.append("Weather service unavailable; monitor local conditions manually.")

    narrative = None
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            prompt = f"""
            You are an agricultural advisor. Synthesize the following structured evidence into a short, cohesive narrative advisory paragraph.
            Do not invent measurements or facts. Just summarize what is given.

            Crop: {state.get("requested_crop")}
            Suitability: {suitability.get("category")}
            ML Risk: {risk_level}
            Missing Info: {missing}
            Recommendations: {recs}
            """
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                timeout=5.0
            )
            narrative = response.choices[0].message.content.strip()
        except Exception:
            # Fallback gracefully if API fails
            pass

    return {
        "risk_findings": risks,
        "recommendations": recs,
        "narrative_advisory": narrative,
        "human_review_required": True,
        "agent_status": {"risk_advisory": "completed"}
    }
