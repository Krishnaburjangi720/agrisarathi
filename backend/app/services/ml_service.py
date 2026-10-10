import os
import joblib
import pandas as pd

class MLService:
    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        model_path = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "risk_model.joblib")
        if os.path.exists(model_path):
            self.model = joblib.load(model_path)

    def predict_risk(self, soil_ph: float, soil_moisture_percent: float, temperature_c: float, precipitation_mm: float) -> str:
        if not self.model:
            return "Unknown (Model unavailable)"

        features = pd.DataFrame([{
            'soil_ph': soil_ph,
            'soil_moisture_percent': soil_moisture_percent,
            'temperature_c': temperature_c,
            'precipitation_mm': precipitation_mm
        }])

        try:
            pred = self.model.predict(features)[0]
            if pred == 0:
                return "Low Risk"
            elif pred == 1:
                return "Medium Risk"
            else:
                return "High Risk"
        except Exception:
            return "Error calculating risk"

ml_service = MLService()
