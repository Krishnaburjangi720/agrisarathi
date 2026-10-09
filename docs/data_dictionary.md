# AgriSārathi — Data Dictionary

> **Document Status:** Phase 1 — Design Specification (not yet implemented)
> All field definitions below describe the planned data model.

---

## Table of Contents

1. [A. Farm and Field](#a-farm-and-field)
2. [B. Soil Test](#b-soil-test)
3. [C. Weather](#c-weather)
4. [D. Sensor Data](#d-sensor-data)
5. [E. Recommendation](#e-recommendation)
6. [General Conventions](#general-conventions)

---

## A. Farm and Field

| Field | Type | Unit | Required | Validation | Data Source | Missing-Value Behavior |
|-------|------|------|----------|------------|-------------|----------------------|
| `farm_id` | string | — | Yes | Non-empty, alphanumeric with hyphens, max 50 chars | User input / system generated | Reject request — farm identity is required |
| `field_id` | string | — | Yes | Non-empty, alphanumeric with hyphens, max 50 chars, unique within farm | User input / system generated | Reject request — field identity is required |
| `field_area_hectares` | float | hectares | Yes | > 0, ≤ 10,000 | User input | Reject request — field area is required for yield and irrigation calculations |
| `latitude` | float | decimal degrees | No | -90.0 to 90.0 | User input / GPS | Record in `missing_information`: "Field coordinates not provided — weather analysis will use approximate location if available." |
| `longitude` | float | decimal degrees | No | -180.0 to 180.0 | User input / GPS | Record in `missing_information`: same as latitude |
| `soil_type` | string | — | Yes | Must be a recognized soil classification (e.g., "alluvial", "clay loam", "sandy", "laterite", "black cotton") | User input / soil test report | Reject request — soil type is needed for suitability assessment |
| `previous_crop` | string | — | No | Recognized crop name if provided | User input | Record in `missing_information`: "Previous crop unknown — crop rotation analysis limited." |
| `proposed_crop` | string | — | Yes | Recognized crop name present in the knowledge base | User input | Reject request — proposed crop is the basis for all agent analysis |
| `irrigation_source` | string | — | Yes | One of: "canal", "borewell", "tubewell", "pond", "river", "rainfed", "drip", "sprinkler", "other" | User input | Reject request — irrigation source is required for water assessment |
| `water_availability` | string | — | Yes | One of: "adequate", "limited", "seasonal", "unknown" | User input / assessment | If not provided, default to "unknown" and record in `missing_information` |

### Notes

- `latitude` and `longitude` should always be provided together. If only one is present, both are treated as missing.
- `soil_type` values are validated against the knowledge base. Unrecognized soil types trigger a warning but do not reject the request.
- `proposed_crop` is validated against the knowledge base. If the crop is not found, the suitability assessment returns "Agronomic Review Required."

---

## B. Soil Test

| Field | Type | Unit | Required | Validation | Data Source | Missing-Value Behavior |
|-------|------|------|----------|------------|-------------|----------------------|
| `soil_ph` | float | pH units | No | 0.0–14.0 (practical range: 3.5–10.0) | Soil testing lab / sensor | Record in `missing_information`: "pH not available — acidity/alkalinity assessment not possible." **Never default to 7.0 (neutral).** |
| `nitrogen_kg_per_ha` | float | kg/ha | No | ≥ 0 | Soil testing lab | Record in `missing_information`: "Nitrogen data missing — nutrient suitability assessment limited." **Never treat as 0.** |
| `phosphorus_kg_per_ha` | float | kg/ha | No | ≥ 0 | Soil testing lab | Record in `missing_information`: "Phosphorus data missing." **Never treat as 0.** |
| `potassium_kg_per_ha` | float | kg/ha | No | ≥ 0 | Soil testing lab | Record in `missing_information`: "Potassium data missing." **Never treat as 0.** |
| `soil_moisture_percent` | float | % (volumetric) | No | 0.0–100.0 | Soil testing lab / sensor | Record in `missing_information`: "Soil moisture unknown — irrigation assessment requires manual field check." **Never treat as 0.** |
| `organic_matter_percent` | float | % | No | 0.0–100.0 (practical range: 0.1–15.0) | Soil testing lab | Record in `missing_information`: "Organic matter not measured — soil carbon assessment not possible." |
| `measurement_timestamp` | string (ISO 8601) | — | Yes (if any soil data is provided) | Valid ISO 8601 datetime | Lab report / sensor | If absent when soil data is present, flag as data quality issue: "Measurement date unknown — data freshness cannot be verified." |
| `measurement_source` | string | — | Yes (if any soil data is provided) | Non-empty | Lab name / sensor ID / "farmer_reported" | If absent, flag as data quality issue: "Measurement source unknown — provenance cannot be verified." |

### Critical Constraints

1. **Raw values are immutable.** The system must store and display original measured values exactly as received. Rounding, averaging, or "correcting" soil test values is prohibited.
2. **Missing ≠ Zero.** A `null` or absent soil parameter must never be treated as 0. It must be explicitly flagged as missing information. This is especially critical for `soil_ph` (missing pH ≠ neutral soil) and nutrient values (missing nitrogen ≠ no nitrogen in soil).
3. **Reference ranges are crop-specific.** The acceptable range for soil pH varies by crop. The same pH may be "suitable" for one crop and "below range" for another.

---

## C. Weather

| Field | Type | Unit | Required | Validation | Data Source | Missing-Value Behavior |
|-------|------|------|----------|------------|-------------|----------------------|
| `temperature_celsius` | float | °C | Yes (in API response) | -60.0 to 60.0 | Weather API (current) | If weather API fails, record "Weather data unavailable" in `missing_information`. |
| `rainfall_mm` | float | mm | Yes (in API response) | ≥ 0 | Weather API (current) | Same as above. |
| `precipitation_probability_percent` | int | % | Yes (in forecast) | 0–100 | Weather API (forecast) | If absent, note "Precipitation probability not available for this forecast source." |
| `humidity_percent` | float | % | Yes (in API response) | 0.0–100.0 | Weather API | Same as temperature. |
| `wind_speed_kmh` | float | km/h | No | ≥ 0 | Weather API | Omit from analysis if not provided. Not critical for most crop suitability assessments. |
| `forecast_period` | string | — | Yes (in forecast) | Date string (YYYY-MM-DD) or period descriptor | Weather API | Each forecast entry must specify its period. |
| `timestamp` | string (ISO 8601) | — | Yes | Valid ISO 8601 datetime | Weather API response header or payload | Record the exact retrieval time. |
| `source` | string | — | Yes | Non-empty (e.g., "Open-Meteo", "OpenWeatherMap") | System configuration | Must always be recorded for provenance. |

### Notes

- Weather data is inherently time-sensitive. Forecasts older than 24 hours should be flagged for re-retrieval.
- All temperature values use Celsius. Conversion from Fahrenheit, if needed, must happen at the API client layer.
- `wind_speed_kmh` is included where relevant (e.g., for evapotranspiration estimation or storm risk) but is not required for basic crop suitability assessment.
- The `source` field must always reflect the actual API used, not a generic label.

---

## D. Sensor Data

| Field | Type | Unit | Required | Validation | Data Source | Missing-Value Behavior |
|-------|------|------|----------|------------|-------------|----------------------|
| `sensor_id` | string | — | Yes | Non-empty, unique identifier | Sensor hardware / simulator | Reject reading — sensor identity is required for provenance |
| `field_id` | string | — | Yes | Must match an existing field | Sensor configuration | Reject reading — cannot associate data with a field |
| `soil_moisture_percent` | float | % (volumetric) | No | 0.0–100.0 | Soil moisture sensor | Omit if not measured by this sensor type |
| `temperature_celsius` | float | °C | No | -40.0 to 70.0 | Temperature sensor | Omit if not measured by this sensor type |
| `humidity_percent` | float | % | No | 0.0–100.0 | Humidity sensor | Omit if not measured by this sensor type |
| `timestamp` | string (ISO 8601) | — | Yes | Valid ISO 8601 datetime, not in the future | Sensor clock / simulator | Reject reading — timestamp is required for time-series analysis |
| `sensor_status` | string | — | Yes | One of: "active", "inactive", "error", "calibrating" | Sensor health check / simulator | Default to "unknown" and flag for review |

### Notes

- **All sensor data in Phase 1 is simulated.** This must be clearly documented wherever sensor data appears. Simulated data is useful for development and testing but does not reflect actual field conditions.
- Sensors may report a subset of the available fields. A soil moisture sensor may not report temperature or humidity.
- `sensor_status` helps identify unreliable readings. Data from sensors in "error" or "calibrating" status should be flagged with reduced confidence.
- Sensor readings should be timestamped at the point of measurement (or simulation), not at the point of database insertion.

---

## E. Recommendation

| Field | Type | Unit | Required | Validation | Data Source | Missing-Value Behavior |
|-------|------|------|----------|------------|-------------|----------------------|
| `recommendation_id` | string | — | Yes | Non-empty, system-generated UUID | System | Auto-generated; never missing |
| `field_id` | string | — | Yes | Must match an existing field | From workflow context | Must be present — every recommendation is linked to a field |
| `recommendation_type` | string | — | Yes | One of: "crop_suitability", "irrigation", "risk_mitigation", "nutrient_management", "general_advisory" | Agent 6 / orchestrator | Must be categorized; defaults to "general_advisory" if type cannot be determined |
| `recommendation_text` | string | — | Yes | Non-empty, human-readable advisory text | Agent 6 | Must always be present — empty recommendations are rejected |
| `supporting_evidence` | list of strings | — | Yes | At least one evidence item | Agent 6 / upstream agents | If no evidence is available, the recommendation must state: "No supporting evidence available — this recommendation is based on general agricultural knowledge and should be verified." |
| `source_references` | list of objects | — | Yes (if evidence is cited) | Each object has: `title` (string), `relevance` (string) | Knowledge base / API sources | If no references are available, the field is an empty list `[]` with a note in the recommendation text |
| `uncertainty` | string | — | Yes | Non-empty, human-readable uncertainty statement | Agent 6 | Must always be present. Example: "Moderate — based on forecast data that may change." If certainty is high, state: "Low uncertainty — based on measured soil test data from a certified lab." |
| `created_at` | string (ISO 8601) | — | Yes | Valid ISO 8601 datetime | System clock | Auto-generated; never missing |
| `approval_status` | string | — | Yes | One of: "awaiting_review", "approved", "rejected" | Human action via API | Default: "awaiting_review". Updated only by explicit human action. |
| `reviewer_comments` | string | — | No | Free text | Human input | `null` until a reviewer provides comments. Used primarily when `approval_status` is "rejected" to capture the reason. |

### Critical Constraints

1. **Every recommendation must have an uncertainty statement.** The system must never imply 100% confidence in an agricultural recommendation.
2. **Approval status requires human action.** No automated process may change `approval_status` from "awaiting_review" to "approved."
3. **Supporting evidence must be traceable.** Each evidence item should reference specific measured data, retrieved references, or model outputs — not vague generalities.
4. **The system does not invent fertilizer quantities, pesticide names, or specific dosages.** Recommendations must be directional ("soil pH may benefit from lime application — consult an agronomist for specific quantities") rather than prescriptive.

---

## General Conventions

### Timestamps

All timestamps in the system use **ISO 8601 format** with timezone information:
- Example: `2025-01-15T10:30:00Z` (UTC) or `2025-01-15T16:00:00+05:30` (IST).
- Timezone-naive timestamps should be avoided. If the source does not provide a timezone, the ingestion layer records the assumed timezone.

### Identifiers

- `farm_id`, `field_id`, `sensor_id`: User-provided or system-generated. Format: uppercase alphanumeric with hyphens (e.g., `FARM-001`, `FIELD-A12`).
- `recommendation_id`, `request_id`: System-generated UUIDs (e.g., `550e8400-e29b-41d4-a716-446655440000`).

### Null Handling

| Context | `null` Meaning | Prohibited Interpretation |
|---------|---------------|--------------------------|
| Soil test value | Parameter was not measured | Zero, average, or "normal" |
| Weather field | Data unavailable from API | Zero, average, or "clear sky" |
| Sensor reading | Sensor did not report this parameter | Zero or "no reading" |
| Previous crop | Farmer did not provide this information | "No crop was grown" |

### Units

All numeric measurements use **metric units** consistently:
- Area: hectares
- Temperature: Celsius
- Rainfall / Precipitation: millimeters
- Soil nutrients: kg/ha
- Soil moisture: volumetric percentage
- Wind speed: km/h
- Humidity: percentage

### Data Source Categories

| Category | Description | Examples |
|----------|-------------|---------|
| `measured` | Direct measurement from a lab, instrument, or calibrated sensor | Soil pH from a testing lab, sensor moisture reading |
| `farmer_reported` | Data provided by the farmer without formal measurement | "Soil feels dry", estimated field area |
| `api_retrieved` | Data fetched from an external API | Weather forecast, geocoding result |
| `knowledge_base` | Reference data retrieved from the agricultural knowledge base | Crop pH requirements, disease threshold ranges |
| `ml_predicted` | Output of a machine learning model | Crop risk score, yield impact prediction |
| `agent_generated` | Reasoning or text produced by an AI agent | Recommendation text, suitability explanation |
| `simulated` | Data generated by the sensor simulator for development | All sensor data during Phase 1 |
