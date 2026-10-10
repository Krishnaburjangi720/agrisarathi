from langgraph.graph import StateGraph, END, START
from app.agents.state import AgentState
from app.agents.farm_profile_agent import farm_profile_node
from app.agents.soil_analysis_agent import soil_analysis_node
from app.agents.weather_analysis_agent import weather_analysis_node
from app.agents.agricultural_rag_agent import agricultural_rag_node
from app.agents.crop_planning_agent import crop_planning_node
from app.agents.irrigation_planning_agent import irrigation_planning_node
from app.agents.ml_prediction_agent import ml_prediction_node
from app.agents.risk_advisory_agent import risk_advisory_node

def route_after_farm(state: AgentState):
    if state.get("errors"):
        return END
    return "soil_analysis"

workflow = StateGraph(AgentState)

workflow.add_node("farm_profile", farm_profile_node)
workflow.add_node("soil_analysis", soil_analysis_node)
workflow.add_node("weather_analysis", weather_analysis_node)
workflow.add_node("rag_retrieval", agricultural_rag_node)
workflow.add_node("crop_planning", crop_planning_node)
workflow.add_node("irrigation_planning", irrigation_planning_node)
workflow.add_node("ml_prediction", ml_prediction_node)
workflow.add_node("risk_advisory", risk_advisory_node)

workflow.add_edge(START, "farm_profile")
workflow.add_conditional_edges("farm_profile", route_after_farm, {"soil_analysis": "soil_analysis", END: END})
workflow.add_edge("soil_analysis", "weather_analysis")
workflow.add_edge("weather_analysis", "rag_retrieval")
workflow.add_edge("rag_retrieval", "crop_planning")
workflow.add_edge("crop_planning", "irrigation_planning")
workflow.add_edge("irrigation_planning", "ml_prediction")
workflow.add_edge("ml_prediction", "risk_advisory")
workflow.add_edge("risk_advisory", END)

app_graph = workflow.compile()
