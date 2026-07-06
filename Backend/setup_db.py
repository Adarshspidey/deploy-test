"""Configure PostgreSQL connection and create the school_db database."""

import getpass
import sys
from pathlib import Path
from urllib.parse import quote_plus

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

ENV_PATH = Path(__file__).parent / ".env"
DB_NAME = "school_db"
DB_USER = "postgres"
DB_HOST = "127.0.0.1"
DB_PORT = 5432


def read_env() -> dict[str, str]:
    values: dict[str, str] = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip()
    return values


def write_database_url(password: str) -> None:
    encoded_password = quote_plus(password)
    database_url = f"postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

    lines: list[str] = []
    if ENV_PATH.exists():
        lines = ENV_PATH.read_text(encoding="utf-8").splitlines()

    updated = False
    for index, line in enumerate(lines):
        if line.startswith("DATABASE_URL="):
            lines[index] = f"DATABASE_URL={database_url}"
            updated = True
            break

    if not updated:
        lines.insert(0, f"DATABASE_URL={database_url}")

    ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Updated {ENV_PATH.name} with your PostgreSQL credentials.")


def test_connection(password: str, database: str = "postgres") -> psycopg2.extensions.connection:
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=password,
        dbname=database,
    )


def create_database(password: str) -> None:
    conn = test_connection(password)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
    if cur.fetchone():
        print(f"Database '{DB_NAME}' already exists.")
    else:
        cur.execute(f'CREATE DATABASE "{DB_NAME}"')
        print(f"Created database '{DB_NAME}'.")
    cur.close()
    conn.close()


def main() -> int:
    print("PostgreSQL setup for School Management Backend")
    print(f"Host: {DB_HOST}:{DB_PORT}  User: {DB_USER}  Database: {DB_NAME}")
    print()

    env = read_env()
    password = env.get("POSTGRES_PASSWORD") or getpass.getpass(f"Enter password for PostgreSQL user '{DB_USER}': ")

    try:
        test_connection(password)
        print("Connection successful.")
    except psycopg2.OperationalError as exc:
        print(f"Connection failed: {exc}")
        print()
        print("Tips:")
        print("  - Use the password you set when installing PostgreSQL")
        print("  - Ensure PostgreSQL is running on localhost:5432")
        return 1

    try:
        create_database(password)
        write_database_url(password)
    except psycopg2.Error as exc:
        print(f"Setup failed: {exc}")
        return 1

    print()
    print("Next steps:")
    print("  python init_db.py")
    print("  uvicorn app.main:app --reload --port 8000")
    return 0


if __name__ == "__main__":
    sys.exit(main())
