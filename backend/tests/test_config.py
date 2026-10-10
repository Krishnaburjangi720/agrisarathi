import os
from app.core.config import Settings

def test_database_url_normalization():
    # Test normalization of postgres schemes
    s1 = Settings(DATABASE_URL='postgres://user:pass@localhost:5432/db')
    assert s1.database_url == 'postgresql+psycopg2://user:pass@localhost:5432/db'

    s2 = Settings(DATABASE_URL='postgresql://user:pass@localhost:5432/db')
    assert s2.database_url == 'postgresql+psycopg2://user:pass@localhost:5432/db'

    s3 = Settings(DATABASE_URL='postgresql+psycopg://user:pass@localhost:5432/db')
    assert s3.database_url == 'postgresql+psycopg2://user:pass@localhost:5432/db'

    # Test that SQLite is unchanged
    s4 = Settings(DATABASE_URL='sqlite:///./test.db')
    assert s4.database_url == 'sqlite:///./test.db'

