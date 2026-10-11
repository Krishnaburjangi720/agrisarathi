import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from datetime import datetime, timezone

from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
import os

def generate_field_report(field, farm, soil_test, weather, advisory, activities) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, title="AgriSārathi Field Report")
    styles = getSampleStyleSheet()

    # Register Unicode Font
    font_path = "C:/Windows/Fonts/arial.ttf"
    if os.path.exists(font_path):
        pdfmetrics.registerFont(TTFont('UnicodeFont', font_path))
        styles["Title"].fontName = 'UnicodeFont'
        styles["Heading2"].fontName = 'UnicodeFont'
        styles["Heading3"].fontName = 'UnicodeFont'
        styles["Normal"].fontName = 'UnicodeFont'

    # Custom styles
    title_style = styles["Title"]
    heading_style = styles["Heading2"]
    normal_style = styles["Normal"]
    alert_style = ParagraphStyle(
        "Alert",
        parent=styles["Normal"],
        textColor=colors.red
    )
    simulated_style = ParagraphStyle(
        "Simulated",
        parent=styles["Normal"],
        textColor=colors.purple
    )

    elements = []

    # Header
    elements.append(Paragraph(f"AgriSārathi Field Report", title_style))
    elements.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC", normal_style))
    elements.append(Spacer(1, 12))

    # 1. Farm and Field Details
    elements.append(Paragraph("Farm & Field Details", heading_style))
    farm_data = [
        ["Farm Name", farm.name],
        ["Field ID", field.field_id],
        ["Field Area (Hectares)", str(field.field_area_hectares)],
        ["Proposed Crop", field.proposed_crop or "N/A"]
    ]
    t = Table(farm_data, colWidths=[150, 300])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.lightgrey),
        ('GRID', (0,0), (-1,-1), 1, colors.grey)
    ]))
    elements.append(t)
    elements.append(Spacer(1, 12))

    # 2. Weather Information
    elements.append(Paragraph("Current Weather", heading_style))
    if weather:
        temp = weather.get('temperature_celsius')
        hum = weather.get('humidity_percent')
        wind = weather.get('wind_speed_kmh')
        weather_data = [
            ["Condition", str(weather.get("weather_description") or "Unknown").capitalize()],
            ["Temperature", f"{temp} °C" if temp is not None else "Unavailable"],
            ["Humidity", f"{hum} %" if hum is not None else "Unavailable"],
            ["Wind Speed", f"{wind} km/h" if wind is not None else "Unavailable"]
        ]
        t = Table(weather_data, colWidths=[150, 300])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.lightgrey),
            ('GRID', (0,0), (-1,-1), 1, colors.grey)
        ]))
        elements.append(t)
    else:
        elements.append(Paragraph("Weather data unavailable.", normal_style))
    elements.append(Spacer(1, 12))

    # 3. Soil and Sensor Readings
    elements.append(Paragraph("Soil Information", heading_style))
    if soil_test:
        source_label = getattr(soil_test, "measurement_source", None) or "Field Laboratory Soil Test"
        elements.append(Paragraph(f"Record Provenance: {source_label}", normal_style))
        soil_data = [
            ["pH", str(soil_test.soil_ph) if soil_test.soil_ph is not None else "N/A"],
            ["Moisture", f"{soil_test.soil_moisture_percent} %" if soil_test.soil_moisture_percent is not None else "N/A"],
            ["Nitrogen (N)", f"{soil_test.nitrogen_kg_per_ha} kg/ha" if soil_test.nitrogen_kg_per_ha is not None else "N/A"],
            ["Phosphorus (P)", f"{soil_test.phosphorus_kg_per_ha} kg/ha" if soil_test.phosphorus_kg_per_ha is not None else "N/A"],
            ["Potassium (K)", f"{soil_test.potassium_kg_per_ha} kg/ha" if soil_test.potassium_kg_per_ha is not None else "N/A"],
        ]
        t = Table(soil_data, colWidths=[150, 300])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.lightgrey),
            ('GRID', (0,0), (-1,-1), 1, colors.grey)
        ]))
        elements.append(t)
    else:
        elements.append(Paragraph("No soil tests available.", normal_style))
    elements.append(Spacer(1, 12))

    # 4. Advisories & ML Risks
    if advisory:
        elements.append(Paragraph("Crop Advisory & ML Risk Analysis", heading_style))
        if advisory.get("human_review_required"):
            elements.append(Paragraph("HUMAN REVIEW REQUIRED: Recommendations are advisory only.", alert_style))

        suitability = advisory.get('crop_suitability', {})
        if isinstance(suitability, dict):
            suit_text = suitability.get('category', 'N/A')
        else:
            suit_text = str(suitability)

        elements.append(Paragraph(f"Crop Suitability: {suit_text}", normal_style))
        elements.append(Spacer(1, 6))

        elements.append(Paragraph("Actionable Recommendations:", styles["Heading3"]))
        for rec in advisory.get("recommendations", []):
            elements.append(Paragraph(f"• {rec}", normal_style))

        elements.append(Spacer(1, 6))

        if advisory.get("source_references"):
            elements.append(Paragraph("Source References:", styles["Heading3"]))
            for ref in advisory.get("source_references", []):
                elements.append(Paragraph(f"• {ref}", normal_style))

    elements.append(Spacer(1, 12))

    # 5. Activity Planner
    elements.append(Paragraph("Scheduled Activities", heading_style))
    if activities:
        act_data = [["Title", "Due Date", "Status"]]
        for act in activities:
            act_data.append([act.title, act.due_date or "N/A", act.status.upper()])

        t = Table(act_data, colWidths=[200, 150, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
            ('GRID', (0,0), (-1,-1), 1, colors.grey)
        ]))
        elements.append(t)
    else:
        elements.append(Paragraph("No upcoming activities scheduled.", normal_style))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes
