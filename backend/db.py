import os
import mysql.connector
from dotenv import load_dotenv

# Load settings from the .env file
load_dotenv()


def get_connection():
    """Open and return a new connection to the MySQL database."""
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "research_portal"),
    )