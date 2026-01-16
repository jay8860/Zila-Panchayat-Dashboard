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
        "PMAY",
        "Spl - PMAY",
        "NNN - PMAY",
        "MMAY",
        "JSA Phase 1",
        "JSA Phase 2",
        "AWC - VBGRAM",
        "PDS - VBGRAM",
        "GP Bhawan - VBGRAM",
        "NNN - VBGRAM",
        "Yuktdhara",
        "NNN - SBM",
        "LWE - SBM",
        "Pariwar Saturation - NRLM",
        "Bank Linkage Fresh - NRLM",
        "Women Led Financing - NRLM",
        "DAR NRLM",
        "DAR Income - NRLM",
        "Myntra Device Purchase",
        "Samarth Panchayat - Taxpayers",
        "Bank Linkage Renewal - NRLM"
    ],
    "nodalOfficers": {
        "PMAY": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "Spl - PMAY": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "NNN - PMAY": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "MMAY": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "JSA Phase 1": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "JSA Phase 2": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "AWC - VBGRAM": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "PDS - VBGRAM": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "GP Bhawan - VBGRAM": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "NNN - VBGRAM": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "Yuktdhara": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "NNN - SBM": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "LWE - SBM": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "Pariwar Saturation - NRLM": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "Women Led Financing - NRLM": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "DAR NRLM": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "DAR Income - NRLM": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "Myntra Device Purchase": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "Samarth Panchayat - Taxpayers": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "Bank Linkage Renewal - NRLM": {
            "name": "Assign Officer",
            "designation": "N/A"
        },
        "Bank Linkage Fresh - NRLM": {
            "name": "Assign Officer",
            "designation": "N/A"
        }
    },
    "sheetUrls": {
        "PMAY": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pubhtml?gid=0&single=true",
        "Spl - PMAY": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pubhtml?gid=1441267455&single=true",
        "NNN - PMAY": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pubhtml?gid=960638649&single=true",
        "MMAY": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pubhtml?gid=1078988846&single=true",
        "JSA Phase 1": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pub?gid=1021040699&single=true&output=csv",
        "JSA Phase 2": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pub?gid=1179983276&single=true&output=csv",
        "AWC - VBGRAM": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pub?gid=566650955&single=true&output=csv",
        "PDS - VBGRAM": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pub?gid=20360312&single=true&output=csv",
        "GP Bhawan - VBGRAM": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pub?gid=1612284308&single=true&output=csv",
        "NNN - VBGRAM": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pub?gid=1491266536&single=true&output=csv",
        "Yuktdhara": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pub?gid=1837566088&single=true&output=csv",
        "NNN - SBM": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pub?gid=1988188525&single=true&output=csv",
        "LWE - SBM": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pubhtml?gid=1993356611&single=true",
        "Pariwar Saturation - NRLM": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pubhtml?gid=1102053304&single=true",
        "Women Led Financing - NRLM": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pubhtml?gid=313103742&single=true",
        "DAR NRLM": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pubhtml?gid=995491369&single=true",
        "DAR Income - NRLM": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pubhtml?gid=464672580&single=true",
        "Myntra Device Purchase": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pubhtml?gid=1689211237&single=true",
        "Samarth Panchayat - Taxpayers": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pubhtml?gid=920954477&single=true",
        "Bank Linkage Renewal - NRLM": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pubhtml?gid=1388433194&single=true",
        "Bank Linkage Fresh - NRLM": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzKPa7DLZVeOUJzGWYTuC5cLmbEjV-I2Wh9acB-cydNFQwii2d_qg11jDWxJhnfODeSuv5KPdsOetU/pubhtml?gid=321373274&single=true"
    },
    "schemeGroups": [
        {
            "id": "group_1768476789134",
            "title": "PMAY",
            "schemes": [
                "PMAY",
                "Spl - PMAY",
                "NNN - PMAY",
                "MMAY"
            ]
        },
        {
            "id": "group_1768477226468",
            "title": "VBGRAM",
            "schemes": [
                "JSA Phase 1",
                "JSA Phase 2",
                "AWC - VBGRAM",
                "PDS - VBGRAM",
                "GP Bhawan - VBGRAM",
                "NNN - VBGRAM",
                "Yuktdhara"
            ]
        },
        {
            "id": "group_1768476795696",
            "title": "SBM",
            "schemes": [
                "NNN - SBM",
                "LWE - SBM"
            ]
        },
        {
            "id": "group_1768476799895",
            "title": "NRLM",
            "schemes": [
                "Pariwar Saturation - NRLM",
                "Women Led Financing - NRLM",
                "DAR NRLM",
                "DAR Income - NRLM",
                "Bank Linkage Fresh - NRLM",
                "Bank Linkage Renewal - NRLM"
            ]
        },
        {
            "id": "default_group",
            "title": "Panchayat Department",
            "schemes": [
                "Samarth Panchayat - Taxpayers"
            ]
        },
        {
            "id": "group_1768476805880",
            "title": "Misc",
            "schemes": [
                "Myntra Device Purchase"
            ]
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
