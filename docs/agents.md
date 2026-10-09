# AgriSārathi — Agent Specifications

> **Document Status:** Phase 1 — Design Specification (not yet implemented)
> All agent behaviors described below are planned designs.

---

## Table of Contents

1. [Agent 1 — Farm & Field Profile Agent](#agent-1--farm--field-profile-agent)
2. [Agent 2 — Soil & Nutrient Analysis Agent](#agent-2--soil--nutrient-analysis-agent)
3. [Agent 3 — Weather & Climate Analysis Agent](#agent-3--weather--climate-analysis-agent)
4. [Agent 4 — Crop Planning & Suitability Agent](#agent-4--crop-planning--suitability-agent)
5. [Agent 5 — Irrigation Planning Agent](#agent-5--irrigation-planning-agent)
6. [Agent 6 — Crop Risk & Farm Advisory Agent](#agent-6--crop-risk--farm-advisory-agent)
7. [Optional — Agricultural Knowledge & Reviewer Agent](#optional--agricultural-knowledge--reviewer-agent)
8. [Suitability Categories](#suitability-categories)
9. [Cross-Agent Conventions](#cross-agent-conventions)

---

## Agent 1 — Farm & Field Profile Agent

### Objective

Collect, validate, and structure field information to establish the foundational context for all downstream agents. Identify missing or incomplete profile data that may affect analysis quality.

### Responsibilities

1. Accept and validate farm and field input data (area, location, soil type, crop history, irrigation source, water availability).
2. Verify that required fields are present and contain plausible values.
3. Identify missing information and add entries to the shared `missing_information` list.
4. Retrieve historical field records from the database if the field has been previously registered.
5. Compute a `completeness_score` (0.0–1.0) reflecting how much of the expected profile data is available.
6. Write the validated `field_profile` to the shared workflow state.

### Expected Inputs

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `farm_id` | string | Yes | Unique farm identifier |
| `field_id` | string | Yes | Unique field identifier |
| `field_area_hectares` | float | Yes | Field area in hectares |
| `latitude` | float | No | Field latitude (decimal degrees) |
| `longitude` | float | No | Field longitude (decimal degrees) |
| `soil_type` | string | Yes | Primary soil classification (e.g., "clay loam", "sandy", "alluvial") |
| `previous_crop` | string | No | Last crop grown on this field |
| `proposed_crop` | string | Yes | Crop the farmer intends to grow |
| `irrigation_source` | string | Yes | Water source (e.g., "canal", "borewell", "rainfed") |
| `water_availability` | string | Yes | Subjective or measured water status (e.g., "adequate", "limited", "seasonal") |

### Expected Outputs

```json
{
  "field_profile": {
    "farm_id": "FARM-001",
    "field_id": "FIELD-001",
    "field_area_hectares": 2.5,
    "latitude": 26.85,
    "longitude": 80.91,
    "soil_type": "alluvial",
    "previous_crop": "rice",
    "proposed_crop": "wheat",
    "irrigation_source": "canal",
    "water_availability": "adequate",
    "completeness_score": 1.0,
    "collected_at": "2025-01-15T10:30:00Z"
  },
  "missing_information": [],
  "agent_status": { "farm_profile": "completed" }
}
```

### Required Tools or Services

- **Database service** — To query historical field records.
- **Validation utilities** — Range checks, type checks, required-field enforcement.
- **Knowledge Base (ChromaDB)** — To retrieve valid soil type classifications and crop names.

### Dependencies on Other Agents

None. This agent executes independently and its output is consumed by Agents 2, 4, 5, and 6.

### Failure Handling

| Failure Scenario | Behavior |
|-----------------|----------|
| Required field missing (e.g., `proposed_crop`) | Return validation error to the API layer; do not proceed with workflow. |
| Optional field missing (e.g., `latitude`) | Record in `missing_information`; continue with reduced `completeness_score`. |
| Database unreachable | Log warning; proceed with submitted data only. Record error in `errors`. |
| Invalid data type (e.g., negative field area) | Return validation error with field-specific message. |

### Missing-Data Handling

- Missing `latitude`/`longitude`: Agent records "Field coordinates not provided — weather analysis will use approximate location if available." in `missing_information`.
- Missing `previous_crop`: Agent records "Previous crop not provided — crop rotation analysis will be limited." in `missing_information`.
- Missing data is **never** substituted with default values.

### Example Input and Output

**Input:**
```json
{
  "farm_id": "FARM-001",
  "field_id": "FIELD-002",
  "field_area_hectares": 1.8,
  "soil_type": "clay loam",
  "proposed_crop": "rice",
  "irrigation_source": "borewell",
  "water_availability": "limited"
}
```

**Output:**
```json
{
  "field_profile": {
    "farm_id": "FARM-001",
    "field_id": "FIELD-002",
    "field_area_hectares": 1.8,
    "latitude": null,
    "longitude": null,
    "soil_type": "clay loam",
    "previous_crop": null,
    "proposed_crop": "rice",
    "irrigation_source": "borewell",
    "water_availability": "limited",
    "completeness_score": 0.7,
    "collected_at": "2025-01-15T10:30:00Z"
  },
  "missing_information": [
    {
      "field": "latitude",
      "agent": "farm_profile",
      "impact": "Weather analysis will use approximate location if available"
    },
    {
      "field": "longitude",
      "agent": "farm_profile",
      "impact": "Weather analysis will use approximate location if available"
    },
    {
      "field": "previous_crop",
      "agent": "farm_profile",
      "impact": "Crop rotation analysis will be limited"
    }
  ],
  "agent_status": { "farm_profile": "completed" }
}
```

### Testing Requirements

- **Unit tests:** Validate completeness score calculation for various missing-field combinations.
- **Integration tests:** Verify database retrieval of historical field records.
- **Edge cases:** Empty `soil_type`, zero `field_area_hectares`, negative coordinates.
- **Scenario coverage:** Used in TC-05 (missing soil-test information).

---

## Agent 2 — Soil & Nutrient Analysis Agent

### Objective

Analyze soil test parameters, preserve original measured values without modification, and compare them against crop-specific reference ranges retrieved from the agricultural knowledge base.

### Responsibilities

1. Accept soil test data (pH, N, P, K, moisture, organic matter) with measurement timestamps and source attribution.
2. **Preserve all original measured values** — never silently modify or round soil test results.
3. Retrieve crop-specific soil requirement reference ranges from the knowledge base for the proposed crop.
4. Compare each measured value against the corresponding reference range and identify deviations.
5. Flag missing soil test parameters in the shared `missing_information` list.
6. Write the complete `soil_analysis` (with both measured values and reference comparisons) to the shared state.

### Expected Inputs

| Field | Type | Unit | Required | Description |
|-------|------|------|----------|-------------|
| `field_id` | string | — | Yes | Links to the field profile |
| `soil_ph` | float | pH units | No | Measured soil pH |
| `nitrogen_kg_per_ha` | float | kg/ha | No | Available nitrogen |
| `phosphorus_kg_per_ha` | float | kg/ha | No | Available phosphorus |
| `potassium_kg_per_ha` | float | kg/ha | No | Available potassium |
| `soil_moisture_percent` | float | % | No | Volumetric soil moisture |
| `organic_matter_percent` | float | % | No | Organic matter content |
| `measurement_timestamp` | string | ISO 8601 | Yes | When the measurement was taken |
| `measurement_source` | string | — | Yes | Lab name, sensor ID, or "farmer_reported" |

### Expected Outputs

```json
{
  "soil_analysis": {
    "measured_values": {
      "soil_ph": 6.5,
      "nitrogen_kg_per_ha": 180.0,
      "phosphorus_kg_per_ha": 22.0,
      "potassium_kg_per_ha": 140.0,
      "soil_moisture_percent": 28.0,
      "organic_matter_percent": null
    },
    "measurement_timestamp": "2025-01-10T09:00:00Z",
    "measurement_source": "District Soil Testing Lab, Lucknow",
    "reference_ranges": {
      "crop": "wheat",
      "source": "ICAR Wheat Cultivation Guide",
      "soil_ph": { "min": 6.0, "max": 7.5 },
      "nitrogen_kg_per_ha": { "min": 150, "max": 250 },
      "phosphorus_kg_per_ha": { "min": 20, "max": 40 },
      "potassium_kg_per_ha": { "min": 100, "max": 200 },
      "soil_moisture_percent": { "min": 20, "max": 40 }
    },
    "deviations": [],
    "data_quality_notes": [
      "Organic matter not measured — soil carbon assessment not possible"
    ]
  },
  "missing_information": [
    {
      "field": "organic_matter_percent",
      "agent": "soil_analysis",
      "impact": "Cannot assess soil carbon content or organic nutrient cycling"
    }
  ],
  "agent_status": { "soil_analysis": "completed" }
}
```

### Required Tools or Services

- **Knowledge Base (ChromaDB)** — Retrieve crop-specific soil parameter reference ranges.
- **Validation utilities** — pH range checks (0–14), non-negative nutrient values.
- **Sensor data service** — Accept simulated or real sensor moisture readings (planned).

### Dependencies on Other Agents

- Reads `proposed_crop` from Agent 1's `field_profile` to determine which crop reference ranges to retrieve.

### Failure Handling

| Failure Scenario | Behavior |
|-----------------|----------|
| No soil test data provided at all | Set all `measured_values` to `null`; add comprehensive `missing_information` entry; set status to `completed` with note. |
| Knowledge base unreachable | Log error; skip reference comparison; note "Reference ranges unavailable" in `data_quality_notes`. |
| Soil pH outside valid range (0–14) | Reject value; record validation error; do not substitute a default. |
| Measurement source not provided | Flag as data quality issue; proceed with analysis but note provenance gap. |

### Missing-Data Handling

- Missing `soil_ph`: "Soil pH not provided — cannot assess acidity/alkalinity suitability."
- Missing all nutrient values: "No nutrient data available — nutrient suitability cannot be assessed. Full soil test recommended."
- Missing data is **never treated as zero**. A missing nitrogen value does not mean nitrogen = 0 kg/ha.

### Example Input and Output

**Input (pH outside crop range):**
```json
{
  "field_id": "FIELD-001",
  "soil_ph": 5.2,
  "nitrogen_kg_per_ha": 180.0,
  "phosphorus_kg_per_ha": 22.0,
  "potassium_kg_per_ha": 140.0,
  "soil_moisture_percent": 28.0,
  "measurement_timestamp": "2025-01-10T09:00:00Z",
  "measurement_source": "District Soil Testing Lab"
}
```

**Output:**
```json
{
  "soil_analysis": {
    "measured_values": {
      "soil_ph": 5.2,
      "nitrogen_kg_per_ha": 180.0,
      "phosphorus_kg_per_ha": 22.0,
      "potassium_kg_per_ha": 140.0,
      "soil_moisture_percent": 28.0,
      "organic_matter_percent": null
    },
    "measurement_timestamp": "2025-01-10T09:00:00Z",
    "measurement_source": "District Soil Testing Lab",
    "reference_ranges": {
      "crop": "wheat",
      "source": "ICAR Wheat Cultivation Guide",
      "soil_ph": { "min": 6.0, "max": 7.5 }
    },
    "deviations": [
      {
        "parameter": "soil_ph",
        "measured": 5.2,
        "reference_min": 6.0,
        "reference_max": 7.5,
        "status": "below_range",
        "note": "Measured pH 5.2 is below the reference minimum 6.0 for wheat. Soil is more acidic than the recommended range."
      }
    ],
    "data_quality_notes": [
      "Organic matter not measured"
    ]
  },
  "agent_status": { "soil_analysis": "completed" }
}
```

### Testing Requirements

- **Unit tests:** Deviation detection for pH above, below, and within range.
- **Critical constraint:** Verify that `measured_values` in the output exactly match the input — no rounding, no modification.
- **Edge cases:** All soil values `null`, pH = 0 (invalid), negative nutrient values.
- **Scenario coverage:** TC-01 (suitable conditions), TC-02 (pH outside range), TC-05 (missing soil data).

---

## Agent 3 — Weather & Climate Analysis Agent

### Objective

Retrieve current and forecast weather information from an external weather API for the field's location, recording timestamps, data source, and forecast periods for full provenance.

### Responsibilities

1. Determine the weather query location from the field profile (coordinates or fallback region).
2. Call an external weather API to retrieve current conditions and a multi-day forecast.
3. Parse the API response into a standardized internal format.
4. Record the API source name, retrieval timestamp, and forecast period.
5. Identify weather conditions that may be significant for agriculture (heavy rainfall, extreme temperatures, high humidity).
6. Write the `weather_analysis` to the shared workflow state.

### Expected Inputs

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `latitude` | float | Preferred | From field profile |
| `longitude` | float | Preferred | From field profile |
| `fallback_location` | string | If no coords | City or district name for geocoding |
| `forecast_days` | int | No (default: 7) | Number of forecast days requested |

### Expected Outputs

```json
{
  "weather_analysis": {
    "current_conditions": {
      "temperature_celsius": 22.5,
      "humidity_percent": 65.0,
      "rainfall_mm": 0.0,
      "wind_speed_kmh": 12.0
    },
    "forecast": [
      {
        "date": "2025-01-16",
        "temperature_min_celsius": 8.0,
        "temperature_max_celsius": 24.0,
        "precipitation_mm": 0.0,
        "precipitation_probability_percent": 10,
        "humidity_percent": 60.0,
        "wind_speed_kmh": 10.0,
        "summary": "Clear sky"
      },
      {
        "date": "2025-01-17",
        "temperature_min_celsius": 9.0,
        "temperature_max_celsius": 22.0,
        "precipitation_mm": 15.0,
        "precipitation_probability_percent": 80,
        "humidity_percent": 78.0,
        "wind_speed_kmh": 18.0,
        "summary": "Moderate rain expected"
      }
    ],
    "forecast_period_days": 7,
    "api_source": "Open-Meteo",
    "retrieved_at": "2025-01-15T10:35:00Z",
    "significant_conditions": [
      {
        "type": "rainfall",
        "date": "2025-01-17",
        "detail": "15mm rainfall forecast with 80% probability",
        "agricultural_relevance": "May affect irrigation scheduling and field operations"
      }
    ]
  },
  "agent_status": { "weather_analysis": "completed" }
}
```

### Required Tools or Services

- **Weather API client** — HTTP client for Open-Meteo, OpenWeatherMap, or equivalent. The specific API will be selected during Phase 4 implementation based on free-tier availability and forecast reliability.
- **Geocoding service** — Convert location names to coordinates if the field profile lacks lat/lng (may be provided by the same weather API).

### Dependencies on Other Agents

- Reads `latitude`, `longitude` from Agent 1's `field_profile`.
- If coordinates are unavailable, may use a fallback location derived from `farm_id` metadata.

### Failure Handling

| Failure Scenario | Behavior |
|-----------------|----------|
| Weather API unreachable (network error) | Retry up to 2 times with exponential backoff. If all retries fail, set `weather_analysis` to `null`, record error, and allow downstream agents to proceed with "weather data unavailable" caveat. |
| API returns malformed data | Log the raw response for debugging; set `weather_analysis` to `null`; record error. |
| No field coordinates and no fallback location | Record in `missing_information`: "Cannot retrieve weather — no location data available." |
| API rate limit exceeded | Record error with retry-after interval; set status to `failed`. |

### Missing-Data Handling

- No coordinates: Append to `missing_information` with impact description.
- API unavailable: All downstream agents that read `weather_analysis` will see `null` and must handle this gracefully (e.g., crop suitability reports "weather data unavailable — assessment based on soil data only").
- Partial forecast data: Include available days; note truncated forecast period.

### Example Input and Output

**Input (no coordinates):**
```json
{
  "latitude": null,
  "longitude": null,
  "fallback_location": "Lucknow, Uttar Pradesh",
  "forecast_days": 5
}
```

**Output (using geocoded location):**
```json
{
  "weather_analysis": {
    "current_conditions": {
      "temperature_celsius": 18.0,
      "humidity_percent": 72.0,
      "rainfall_mm": 0.0,
      "wind_speed_kmh": 8.0
    },
    "forecast": [],
    "forecast_period_days": 5,
    "api_source": "Open-Meteo (geocoded from 'Lucknow, Uttar Pradesh')",
    "retrieved_at": "2025-01-15T10:35:00Z",
    "location_note": "Coordinates geocoded from fallback location. Weather data may not reflect exact field microclimate.",
    "significant_conditions": []
  },
  "missing_information": [
    {
      "field": "latitude/longitude",
      "agent": "weather_analysis",
      "impact": "Weather data geocoded from fallback location; may not reflect exact field microclimate"
    }
  ],
  "agent_status": { "weather_analysis": "completed" }
}
```

### Testing Requirements

- **Unit tests:** API response parsing, significant condition detection, retry logic.
- **Integration tests:** Live API call (mocked in CI, live in development).
- **Edge cases:** API timeout, empty forecast array, extreme temperature values.
- **Scenario coverage:** TC-01 (suitable weather), TC-04 (significant rainfall), TC-06 (high humidity and temperature).

---

## Agent 4 — Crop Planning & Suitability Agent

### Objective

Compare aggregated field conditions (field profile, soil analysis, weather analysis) against retrieved crop-specific requirements to determine suitability. Classify the result into one of four categories with a clear explanation of favorable conditions, limitations, and missing information.

### Responsibilities

1. Read `field_profile`, `soil_analysis`, and `weather_analysis` from the shared state.
2. Retrieve crop-specific requirements from the agricultural knowledge base (soil pH range, nutrient needs, temperature range, moisture needs, climate preferences).
3. Compare each measured condition against the corresponding crop requirement.
4. Classify overall suitability using the four-category system.
5. List favorable conditions, limiting conditions, and missing information separately.
6. Write `crop_requirements` and `crop_suitability` to the shared state.

### Expected Inputs

Read from shared state:

| State Field | Source Agent | Key Data Used |
|------------|-------------|---------------|
| `field_profile` | Agent 1 | `proposed_crop`, `soil_type`, `irrigation_source`, `water_availability` |
| `soil_analysis` | Agent 2 | `measured_values`, `deviations`, `reference_ranges` |
| `weather_analysis` | Agent 3 | `current_conditions`, `forecast`, `significant_conditions` |

### Expected Outputs

```json
{
  "crop_requirements": {
    "crop": "wheat",
    "source": "ICAR Wheat Production Technology Handbook",
    "temperature_range_celsius": { "min": 10, "max": 25 },
    "soil_ph_range": { "min": 6.0, "max": 7.5 },
    "rainfall_range_mm": { "min": 450, "max": 650 },
    "preferred_soil_types": ["loamy", "clay loam", "alluvial"],
    "water_requirement_mm_per_season": 450,
    "growing_season_days": 120
  },
  "crop_suitability": {
    "suitability_category": "Suitable",
    "favorable_conditions": [
      "Soil pH 6.5 is within the recommended range (6.0–7.5) for wheat",
      "Soil type 'alluvial' is among preferred soil types for wheat",
      "Current temperature 22.5°C is within the optimal range (10–25°C)",
      "Nitrogen 180 kg/ha meets the minimum requirement for wheat",
      "Canal irrigation with adequate water availability supports wheat water needs"
    ],
    "limiting_conditions": [],
    "missing_information": [],
    "explanation": "Based on available soil test data, current weather conditions, and field profile, this field appears suitable for wheat cultivation. All measured parameters fall within the recommended ranges per ICAR guidelines.",
    "source_references": [
      {
        "title": "ICAR Wheat Production Technology Handbook",
        "relevance": "Crop requirement reference ranges",
        "retrieved_from": "Agricultural Knowledge Base"
      }
    ]
  },
  "agent_status": { "crop_suitability": "completed" }
}
```

### Required Tools or Services

- **Knowledge Base (ChromaDB)** — Retrieve crop-specific requirement documents and reference ranges.
- **Comparison engine** — Programmatic logic to evaluate measured values against reference ranges.

### Dependencies on Other Agents

- **Agent 1** — Requires `field_profile` (proposed crop, soil type, irrigation).
- **Agent 2** — Requires `soil_analysis` (measured values, deviations).
- **Agent 3** — Requires `weather_analysis` (temperature, rainfall, humidity).

This agent cannot execute until Agents 1, 2, and 3 have completed.

### Failure Handling

| Failure Scenario | Behavior |
|-----------------|----------|
| `soil_analysis` is `null` (Agent 2 had no data) | Classify as "Additional Information Required"; note soil data is missing. |
| `weather_analysis` is `null` (Agent 3 failed) | Assess suitability based on soil data only; note weather data is unavailable. |
| Crop not found in knowledge base | Classify as "Agronomic Review Required"; note that crop requirements are unavailable for the requested crop. |
| Multiple limiting conditions | Classify as "Suitable with Conditions" if conditions are manageable; "Agronomic Review Required" if conditions are complex or conflicting. |

### Missing-Data Handling

- If any upstream agent output is `null`, this agent evaluates based on available data and explicitly lists what could not be assessed.
- Missing upstream data escalates the suitability category toward "Additional Information Required" when critical parameters are absent.

### Example Input and Output

**Input (pH below range):**
*Reads from shared state where Agent 2 reported `soil_ph: 5.2` with a deviation.*

**Output:**
```json
{
  "crop_suitability": {
    "suitability_category": "Suitable with Conditions",
    "favorable_conditions": [
      "Soil type 'alluvial' is among preferred soil types for wheat",
      "Current temperature 22.5°C is within the optimal range (10–25°C)",
      "Nitrogen 180 kg/ha meets the minimum requirement"
    ],
    "limiting_conditions": [
      "Soil pH 5.2 is below the recommended range (6.0–7.5) for wheat. The soil is more acidic than optimal. Lime application may be considered after agronomic consultation."
    ],
    "missing_information": [],
    "explanation": "Field conditions are generally favorable for wheat, but soil pH is below the recommended range. Wheat grows best in neutral to slightly alkaline soils. Acidic soil (pH 5.2) may reduce nutrient availability, particularly phosphorus. Consider soil amendment after consulting with a local agronomist.",
    "source_references": [
      {
        "title": "ICAR Wheat Production Technology Handbook",
        "relevance": "pH suitability range for wheat",
        "retrieved_from": "Agricultural Knowledge Base"
      }
    ]
  },
  "agent_status": { "crop_suitability": "completed" }
}
```

### Testing Requirements

- **Unit tests:** Category classification for each of the four categories.
- **Integration tests:** Knowledge base retrieval for multiple crops.
- **Edge cases:** All upstream data `null`, unknown crop name, conflicting soil and weather assessments.
- **Scenario coverage:** TC-01 (suitable), TC-02 (pH outside range), TC-04 (significant rainfall), TC-05 (missing data).

---

## Agent 5 — Irrigation Planning Agent

### Objective

Evaluate soil moisture status, crop-stage water needs, expected rainfall, irrigation history, and available water supply to provide irrigation decision support with transparent reasoning.

### Responsibilities

1. Read current soil moisture from `soil_analysis` (and/or simulated sensor data).
2. Read expected rainfall from `weather_analysis`.
3. Read crop water needs at the current growth stage from `crop_requirements`.
4. Assess the moisture deficit or surplus.
5. Consider the irrigation source and water availability from `field_profile`.
6. Generate an irrigation recommendation with reasoning — not a rigid schedule.
7. Write `irrigation_assessment` to the shared state.

### Expected Inputs

Read from shared state:

| State Field | Source | Key Data Used |
|------------|--------|---------------|
| `field_profile` | Agent 1 | `irrigation_source`, `water_availability` |
| `soil_analysis` | Agent 2 | `soil_moisture_percent` |
| `weather_analysis` | Agent 3 | `forecast` (precipitation), `current_conditions` |
| `crop_requirements` | Agent 4 | Water requirements per crop stage |

Additional input (when available):

| Field | Type | Source |
|-------|------|--------|
| `sensor_soil_moisture` | float | Simulated or real sensor data |
| `last_irrigation_date` | string | Database / user input |
| `crop_growth_stage` | string | User input or estimated |

### Expected Outputs

```json
{
  "irrigation_assessment": {
    "current_moisture_status": "adequate",
    "current_moisture_percent": 28.0,
    "moisture_source": "soil_test",
    "crop_water_need_mm": 25.0,
    "crop_growth_stage": "tillering",
    "expected_rainfall_mm": 15.0,
    "expected_rainfall_probability": 80,
    "moisture_deficit_mm": null,
    "irrigation_recommendation": "Defer irrigation for 48–72 hours",
    "reasoning": "Current soil moisture is 28% (adequate for wheat at tillering stage). Forecast indicates 15mm rainfall with 80% probability in the next 48 hours. If rainfall materializes, soil moisture will be replenished without irrigation. Recommend monitoring soil moisture after the forecast rain event and irrigating only if moisture drops below 20%.",
    "confidence_level": "moderate",
    "confidence_note": "Recommendation depends on forecast rainfall materializing. Forecast confidence decreases beyond 48 hours.",
    "source_references": [
      {
        "title": "Wheat Irrigation Scheduling Guide",
        "relevance": "Crop water requirements at tillering stage"
      }
    ]
  },
  "agent_status": { "irrigation_planning": "completed" }
}
```

### Required Tools or Services

- **Sensor data service** — To retrieve latest simulated or real soil moisture readings.
- **Knowledge Base (ChromaDB)** — Crop-stage water requirement references.
- **Calculation utilities** — Moisture deficit estimation (crop need minus available moisture minus expected rainfall).

### Dependencies on Other Agents

- **Agent 1** — `field_profile` (irrigation source, water availability).
- **Agent 2** — `soil_analysis` (soil moisture measurement).
- **Agent 3** — `weather_analysis` (forecast rainfall).
- **Agent 4** — `crop_requirements` (crop water needs).

This agent executes after Agent 4.

### Failure Handling

| Failure Scenario | Behavior |
|-----------------|----------|
| Soil moisture data unavailable | Note "Soil moisture unknown — cannot assess irrigation need. Manual field inspection recommended." |
| Weather forecast unavailable | Assess based on current soil moisture only; note "Rainfall forecast unavailable — recommendation does not account for expected precipitation." |
| Crop water requirements not found | Use general irrigation guidance; note "Crop-specific water requirements unavailable — using general irrigation principles." |
| Water availability is "limited" | Factor scarcity into recommendation; prioritize water conservation. |

### Missing-Data Handling

- Missing soil moisture triggers "Additional Information Required" for irrigation assessment specifically.
- Missing rainfall forecast reduces confidence level to "low" and the agent notes the limitation.
- The agent never produces a rigid irrigation schedule (e.g., "irrigate every 5 days") — it provides reasoned decision support for the current situation.

### Example Input and Output

**Input (low soil moisture, no rain expected):**
*Reads from shared state: `soil_moisture_percent: 12.0`, forecast shows 0mm rain for 5 days.*

**Output:**
```json
{
  "irrigation_assessment": {
    "current_moisture_status": "low",
    "current_moisture_percent": 12.0,
    "moisture_source": "soil_test",
    "crop_water_need_mm": 30.0,
    "crop_growth_stage": "flowering",
    "expected_rainfall_mm": 0.0,
    "expected_rainfall_probability": 5,
    "moisture_deficit_mm": 18.0,
    "irrigation_recommendation": "Irrigation recommended within 24 hours",
    "reasoning": "Soil moisture at 12% is below the critical threshold for wheat at flowering stage. No significant rainfall is forecast for the next 5 days. Flowering is a moisture-sensitive growth stage where water stress can significantly affect grain formation. Recommend applying approximately 30mm of irrigation water. Monitor moisture levels after irrigation.",
    "confidence_level": "high",
    "confidence_note": "High confidence due to clear moisture deficit and dry forecast.",
    "source_references": []
  },
  "agent_status": { "irrigation_planning": "completed" }
}
```

### Testing Requirements

- **Unit tests:** Moisture deficit calculation, recommendation logic for various moisture levels.
- **Integration tests:** Sensor data ingestion, weather forecast integration.
- **Edge cases:** Moisture = 0 (impossible but should be validated), no weather data, rainfed field with limited water.
- **Scenario coverage:** TC-01 (suitable conditions), TC-03 (low moisture), TC-04 (significant rainfall).

---

## Agent 6 — Crop Risk & Farm Advisory Agent

### Objective

Combine findings from all preceding agents and relevant ML predictions to identify and prioritize environmental crop risks, generate explainable recommendations with evidence citations, and propose farming activities.

### Responsibilities

1. Read all agent outputs from the shared state: `field_profile`, `soil_analysis`, `weather_analysis`, `crop_suitability`, `irrigation_assessment`.
2. Request ML risk predictions from the ML service (when available).
3. Identify environmental risks (heat stress, frost, waterlogging, disease-favorable conditions, nutrient deficiency impacts).
4. Prioritize risks by severity and likelihood.
5. Generate explainable recommendations with supporting evidence and source citations.
6. Disclose uncertainty and distinguish between measured data, retrieved references, and ML predictions.
7. Propose a preliminary farming activity plan.
8. Write `risk_findings`, `recommendations`, and `ml_prediction` to the shared state.

### Expected Inputs

Read from shared state:

| State Field | Source Agent | Key Data Used |
|------------|-------------|---------------|
| `field_profile` | Agent 1 | All field context |
| `soil_analysis` | Agent 2 | Deviations, measured values |
| `weather_analysis` | Agent 3 | Forecast, significant conditions |
| `crop_suitability` | Agent 4 | Category, limiting conditions |
| `irrigation_assessment` | Agent 5 | Moisture status, recommendation |

External input:

| Field | Source | Description |
|-------|--------|-------------|
| ML risk prediction | ML Service | Model output with confidence score |

### Expected Outputs

```json
{
  "risk_findings": [
    {
      "risk_id": "RISK-001",
      "risk_type": "disease_favorable_conditions",
      "severity": "medium",
      "likelihood": "moderate",
      "description": "Forecast indicates 3 consecutive days of humidity above 80% combined with temperatures of 25–30°C. These conditions are favorable for fungal diseases in wheat, particularly leaf rust and powdery mildew.",
      "evidence": [
        {
          "type": "weather_forecast",
          "detail": "Humidity 82–88%, Temperature 25–30°C forecast for Jan 18–20",
          "source": "Open-Meteo forecast retrieved 2025-01-15T10:35:00Z"
        }
      ],
      "disclaimer": "This identifies environmental conditions favorable to disease development. It is NOT a confirmed disease diagnosis. Field inspection is recommended.",
      "mitigation_options": [
        "Monitor crop canopy for early signs of fungal infection",
        "Ensure adequate plant spacing for air circulation",
        "Consult a local agronomist if symptoms appear"
      ]
    }
  ],
  "recommendations": [
    {
      "recommendation_id": "REC-001",
      "recommendation_type": "risk_mitigation",
      "priority": "high",
      "recommendation_text": "Monitor wheat crop closely for fungal disease symptoms during the upcoming high-humidity period (Jan 18–20). Environmental conditions will be favorable for leaf rust and powdery mildew development.",
      "supporting_evidence": [
        "Weather forecast: 3 days of humidity >80% with temperatures 25–30°C",
        "Crop suitability assessment: wheat is in tillering stage, which is susceptible to foliar diseases"
      ],
      "source_references": [
        {
          "title": "ICAR Disease Management in Wheat",
          "relevance": "Conditions favorable for leaf rust"
        }
      ],
      "uncertainty": "Forecast confidence decreases beyond 48 hours. Actual disease development depends on pathogen presence, which cannot be assessed remotely.",
      "requires_human_approval": true,
      "created_at": "2025-01-15T10:40:00Z",
      "approval_status": "awaiting_review"
    }
  ],
  "ml_prediction": {
    "model_name": "crop_risk_classifier_v1",
    "prediction": {
      "disease_risk_score": 0.72,
      "yield_impact_category": "moderate"
    },
    "confidence_score": 0.68,
    "features_used": ["humidity_forecast", "temperature_forecast", "crop_stage", "soil_moisture"],
    "prediction_timestamp": "2025-01-15T10:38:00Z",
    "model_note": "ML prediction is supplementary. Confidence score of 0.68 indicates moderate model certainty. This prediction should be considered alongside the evidence-based analysis above."
  },
  "agent_status": { "risk_advisory": "completed" }
}
```

### Required Tools or Services

- **ML Service** — Request crop risk predictions; receive structured prediction with confidence.
- **Knowledge Base (ChromaDB)** — Retrieve disease and risk management reference material.
- **Risk prioritization engine** — Logic to rank risks by severity × likelihood.

### Dependencies on Other Agents

- **All preceding agents (1–5)** — This agent reads the complete shared state.
- **ML Service** — External dependency; agent must function even if ML service is unavailable.

This agent executes last in the workflow.

### Failure Handling

| Failure Scenario | Behavior |
|-----------------|----------|
| ML service unavailable | Proceed without ML predictions; note "ML risk prediction unavailable — assessment based on rule-based analysis and agent findings only." |
| One upstream agent failed | Assess risks based on available data; note gaps explicitly. |
| All upstream agents failed | Set status to `failed`; record "Insufficient data for risk assessment." |
| Knowledge base unreachable | Use agent reasoning without retrieved references; note the limitation. |

### Missing-Data Handling

- Missing weather data: Cannot assess weather-related risks; note the gap.
- Missing soil data: Cannot assess nutrient-related risks; note the gap.
- Missing ML prediction: The agent produces recommendations based on rule-based analysis only; explicitly notes that ML predictions were unavailable.
- The agent **never describes environmental risk conditions as confirmed diagnoses**.

### Example Input and Output

See the full example above in Expected Outputs.

### Testing Requirements

- **Unit tests:** Risk prioritization logic, recommendation generation, evidence citation formatting.
- **Integration tests:** ML service integration (mocked), knowledge base retrieval.
- **Critical constraint:** Verify that disease-favorable conditions are not labeled as "diagnosed" or "confirmed."
- **Scenario coverage:** TC-01 (no significant risks), TC-02 (soil limitation advisory), TC-03 (moisture advisory), TC-04 (rainfall advisory), TC-06 (disease-favorable conditions).

---

## Optional — Agricultural Knowledge & Reviewer Agent

> **Status:** Optional. This agent may be implemented if time permits. The six required agents above cover all assignment requirements.

### Objective

Serve as a specialized knowledge retrieval agent that manages the ChromaDB knowledge base, retrieves and ranks agricultural references, and cross-checks agent recommendations against established agricultural literature.

### Responsibilities

1. Index and manage agricultural reference documents in ChromaDB.
2. Handle retrieval queries from other agents.
3. Rank retrieved documents by relevance.
4. Cross-reference final recommendations against knowledge base content.
5. Flag recommendations that contradict established agricultural guidance.

### Dependencies

- ChromaDB vector database.
- Agricultural reference documents (ICAR guidelines, FAO resources, regional crop manuals).

> This agent would reduce the knowledge retrieval logic duplicated across Agents 1–6 into a single service. If not implemented, each agent will perform its own knowledge base queries directly.

---

## Suitability Categories

All agents use a consistent four-category suitability classification:

| Category | Meaning | Example Trigger |
|----------|---------|-----------------|
| **Suitable** | All assessed conditions meet crop requirements | Soil pH, nutrients, temperature, and moisture all within range |
| **Suitable with Conditions** | Conditions are acceptable but specific adjustments are recommended | Soil pH slightly below range; lime application may help |
| **Additional Information Required** | Critical data is missing; no reliable determination can be made | No soil test data provided; soil suitability cannot be assessed |
| **Agronomic Review Required** | Conditions are complex, conflicting, or outside the system's reliable assessment scope | Multiple severe deviations; contradictory weather patterns; crop not in knowledge base |

### Category Selection Rules

1. If **any critical parameter is missing** → at minimum "Additional Information Required."
2. If **all parameters are within reference ranges** → "Suitable."
3. If **one or two parameters are outside range but manageable** → "Suitable with Conditions."
4. If **multiple parameters are significantly outside range**, or conditions are contradictory, or the crop is not in the knowledge base → "Agronomic Review Required."

---

## Cross-Agent Conventions

### Data Provenance

All agents must:
- Record the source of every data point (sensor ID, lab name, API name, knowledge base document title).
- Record the timestamp of every measurement or retrieval.
- Distinguish between measured data, retrieved references, ML predictions, and agent reasoning.

### Missing Information Format

All agents append to `missing_information` using a consistent structure:

```json
{
  "field": "<field_name>",
  "agent": "<agent_identifier>",
  "impact": "<human-readable description of the impact>"
}
```

### Error Format

All agents append to `errors` using a consistent structure:

```json
{
  "agent": "<agent_identifier>",
  "error_type": "<category: validation | external_service | processing>",
  "message": "<human-readable error description>",
  "timestamp": "<ISO 8601>"
}
```

### Source Reference Format

All agents append to `source_references` using a consistent structure:

```json
{
  "title": "<document or source title>",
  "relevance": "<why this source is relevant>",
  "retrieved_from": "<knowledge_base | weather_api | database | ml_service>"
}
```
