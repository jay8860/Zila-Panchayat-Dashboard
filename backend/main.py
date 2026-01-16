import json
import os
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

# --- Setup ---
app = FastAPI()

# Enable CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for now (dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use ENV variable for storage path (Railway Volume)
DATA_DIR = os.environ.get("DATA_DIR", ".")
DB_FILE = os.path.join(DATA_DIR, "dashboard_data.json")

# --- Models ---
class Officer(BaseModel):
    name: str
    designation: str

class Group(BaseModel):
    id: str
    title: str
    schemes: List[str]

class DashboardConfig(BaseModel):
    schemes: List[str]
    nodalOfficers: Dict[str, Officer]
    sheetUrls: Dict[str, str]
    schemeGroups: List[Group]

# --- Default Data (Fallback) ---
DEFAULT_DATA = {
    "schemes": [
        "MNREGA",
        "Swachh Bharat Mission (SBM)",
        "Pradhan Mantri Awas Yojana (PMAY)",
        "National Rural Livelihood Mission (NRLM)"
    ],
    "nodalOfficers": {
        "MNREGA": { "name": "Mr. Rajesh Sharma", "designation": "Project Officer" },
        "Swachh Bharat Mission (SBM)": { "name": "Ms. Priya Singh", "designation": "District Consultant" },
        "Pradhan Mantri Awas Yojana (PMAY)": { "name": "Mr. Amit Verma", "designation": "Housing Coordinator" },
        "National Rural Livelihood Mission (NRLM)": { "name": "Ms. Sunita Gupta", "designation": "District Manager" }
    },
    "sheetUrls": {
        "MNREGA": "",
        "Swachh Bharat Mission (SBM)": "",
        "Pradhan Mantri Awas Yojana (PMAY)": "",
        "National Rural Livelihood Mission (NRLM)": ""
    },
    "schemeGroups": [
        {
            "id": "default_group",
            "title": "General Schemes",
            "schemes": ["MNREGA", "Swachh Bharat Mission (SBM)", "Pradhan Mantri Awas Yojana (PMAY)", "National Rural Livelihood Mission (NRLM)"]
        }
    ]
}

# --- Persistence Layer ---
def load_db() -> DashboardConfig:
    if not os.path.exists(DB_FILE):
        save_db(DEFAULT_DATA)
        return DashboardConfig(**DEFAULT_DATA)
    try:
        with open(DB_FILE, "r") as f:
            data = json.load(f)
            return DashboardConfig(**data)
    except Exception as e:
        print(f"Error loading DB: {e}")
        return DashboardConfig(**DEFAULT_DATA)

def save_db(data: Any):
    # If data is a Pydantic model, convert to dict
    if hasattr(data, "model_dump"):
        data_dict = data.model_dump()
    elif hasattr(data, "dict"):
        data_dict = data.dict()
    else:
        data_dict = data

    with open(DB_FILE, "w") as f:
        json.dump(data_dict, f, indent=4)

# --- Routes ---

@app.get("/api/config", response_model=DashboardConfig)
def get_config():
    return load_db()

@app.post("/api/config", response_model=DashboardConfig)
def update_config(config: DashboardConfig):
    save_db(config)
    return config

@app.post("/api/schemes")
def add_scheme(name: str):
    db = load_db()
    if name not in db.schemes:
        db.schemes.append(name)
        # Initialize others
        db.sheetUrls[name] = ""
        db.nodalOfficers[name] = Officer(name="Assign Officer", designation="N/A")
        # Add to first group default
        if db.schemeGroups:
            db.schemeGroups[0].schemes.append(name)
        save_db(db)
    return db

# --- Serve Frontend (Production) ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Mount static assets if they exist (built frontend)
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist")

if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Allow API calls to pass through
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        
        # Serve file if it exists (e.g. favicon.ico)
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Fallback to index.html for SPA routing
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
else:
    print("Warning: 'dist' directory not found. Frontend will not be served.")


if __name__ == "__main__":
    import uvicorn
    # Use PORT env variable for Railway
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
