"""
AgriSārathi — FastAPI Application Entry Point

Initialises the database, registers routers, and configures
global exception handlers and OpenAPI documentation.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.config import settings
from app.database.connection import init_db
from app.api import health, farms, fields, soil_tests, advisories, sensors, activities, reports

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.DEBUG if settings.app_debug else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AgriSārathi backend starting up — initialising database …")
    init_db()
    logger.info("Database initialised.")
    yield
    logger.info("AgriSārathi backend shutting down.")


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Agentic AI Agricultural Crop Planning & Precision Farming System.\n\n"
        "**Phase 2** — Farm & Field data management with validated SQLite persistence.\n\n"
        "**Status:** Phase 2 complete. Agent orchestration is planned for Phase 3."
    ),
    contact={
        "name": "AgriSārathi Project",
        "url": "https://github.com/brightcone-ai/agrisarathi",
    },
    license_info={"name": "Private — Academic Assignment"},
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------
@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    """Return a 409 for database constraint violations (e.g. duplicate IDs)."""
    logger.warning("IntegrityError on %s: %s", request.url, exc.orig)
    return JSONResponse(
        status_code=409,
        content={
            "detail": "A record with the given identifier already exists.",
            "error": "conflict",
        },
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    """Return a 500 without exposing internal details to the client."""
    logger.exception("Unhandled exception on %s", request.url)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected server error occurred. Please try again later.",
            "error": "internal_server_error",
        },
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(health.router)
app.include_router(farms.router, prefix="/farms", tags=["Farms"])
app.include_router(fields.router, prefix="/fields", tags=["Fields"])
app.include_router(soil_tests.router, tags=["Soil Tests"])
app.include_router(advisories.router, prefix="/advisories", tags=["Advisories"])
app.include_router(sensors.router)
app.include_router(activities.router, prefix="/activities", tags=["Activities"])
app.include_router(reports.router, prefix="/fields", tags=["Reports"])
