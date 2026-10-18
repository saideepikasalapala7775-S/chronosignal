# tests/conftest.py
# Ensure .env is loaded before any backend module is imported during tests.
import os
from pathlib import Path
from dotenv import load_dotenv

# Walk up from tests/ to find the project root containing .env
project_root = Path(__file__).parent.parent
load_dotenv(project_root / ".env")
