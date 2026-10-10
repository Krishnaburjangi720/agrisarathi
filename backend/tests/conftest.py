"""
AgriSārathi — Shared test fixtures

Uses a temporary file-based SQLite database (not :memory:) to avoid
connection-sharing complications. Tables are created once per session
and rows are cleared between tests.
"""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

# ── Test DB path ─────────────────────────────────────────────────────────────
_HERE = os.path.dirname(__file__)
TEST_DB_PATH = os.path.join(_HERE, "test_agrisarathi.db")
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

# ── Build test engine ────────────────────────────────────────────────────────
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)


@event.listens_for(test_engine, "connect")
def _fk_on(dbapi_conn, _):
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA foreign_keys=ON")
    cur.close()


TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# ── Redirect app's connection module to the test engine BEFORE importing app ─
import app.database.connection as _conn  # noqa: E402

_conn.engine = test_engine
_conn.SessionLocal = TestingSession

# ── Now import the app (lifespan will call init_db on test_engine) ────────────
from app.database.base import Base                   # noqa: E402
from app.database.connection import get_db           # noqa: E402
from app.main import app as fastapi_app              # noqa: E402

# Force-register models with Base.metadata
import app.models.farm       # noqa: E402, F401
import app.models.field      # noqa: E402, F401
import app.models.soil_test  # noqa: E402, F401


# ── Session-scoped: create tables once, drop them and remove file at end ─────
@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


# ── Function-scoped: wipe rows before each test ───────────────────────────────
@pytest.fixture(scope="function", autouse=True)
def _truncate(_setup_db):
    with test_engine.connect() as conn:
        conn.execute(text("DELETE FROM activities"))
        conn.execute(text("DELETE FROM soil_tests"))
        conn.execute(text("DELETE FROM fields"))
        conn.execute(text("DELETE FROM farms"))
        conn.commit()


# ── DB session for tests that need direct DB access ──────────────────────────
@pytest.fixture(scope="function")
def db(_setup_db):
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


# ── TestClient fixture ────────────────────────────────────────────────────────
@pytest.fixture(scope="function")
def client(db, _truncate):
    def _override():
        yield db

    fastapi_app.dependency_overrides[get_db] = _override
    with TestClient(fastapi_app, raise_server_exceptions=True) as c:
        yield c
    fastapi_app.dependency_overrides.clear()
