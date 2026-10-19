"""Chronosignal Server Launcher
Starts the Chronosignal FastAPI application and serves both API and interactive frontend.
"""
import sys
import os
import uvicorn
from dotenv import load_dotenv

# Load .env BEFORE importing the app so env vars are available
load_dotenv()

from backend.main import app, engine, simulated_now
from backend.demo_data import get_ambient_background_signals, get_demo_stages
from datetime import datetime, timezone

def bootstrap_initial_state():
    """Initializes demo state with Stage 1 faint mentions so the dashboard is immediately live."""
    now = datetime.now(timezone.utc)
    # Add ambient clusters
    for amb in get_ambient_background_signals(now):
        engine.ingest_signal(amb, now=now)
    # Ingest Stage 1 signals
    stages = get_demo_stages(now)
    for sig in stages[1]:
        engine.ingest_signal(sig, now=now)
    print("Initialized Chronosignal temporal memory with Stage 1 signals and ambient clusters.")

if __name__ == "__main__":
    bootstrap_initial_state()
    print("=" * 70)
    print("  CHRONOSIGNAL: Temporal AI Memory & Weak Signal Radar")
    print("  Server running at: http://localhost:8000")
    print("  API Docs at:       http://localhost:8000/docs")
    print("=" * 70)
    uvicorn.run("backend.main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=False)
