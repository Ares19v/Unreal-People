from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil

from core.crew_engine import execute_api_crew

app = FastAPI(title="Unreal People - Core Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models", "gguf")
LORA_DIR = os.path.join(BASE_DIR, "models", "lora")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(LORA_DIR, exist_ok=True)

# --- QUARANTINED LOCAL HARDWARE STATE ---
ACTIVE_LOCAL_MODEL_PATH = None

class LoadLocalModelRequest(BaseModel):
    model_filename: str
    lora_filename: str = None
    precision: str = "FULL"
    quant_level: str = "Q4"

class CrewApiExecutionRequest(BaseModel):
    team_name: str
    task: str
    agents: list
    api_key: str
    provider: str
    api_model: str

@app.get("/")
def read_root():
    return {"status": "SYSTEM_ONLINE", "hardware": "RTX_5060_READY", "api": "CLOUD_READY"}

# --- QUARANTINED PAGE 2 LOGIC ---
@app.post("/api/upload_model")
async def upload_model(file: UploadFile = File(...), type: str = Form(...)):
    try:
        target_dir = LORA_DIR if type == "LORA" else MODELS_DIR
        file_path = os.path.join(target_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"status": "SUCCESS", "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/initialize_engine")
async def initialize_engine(request: LoadLocalModelRequest):
    global ACTIVE_LOCAL_MODEL_PATH
    model_path = os.path.join(MODELS_DIR, request.model_filename)
    
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail="Model file not found on disk.")

    ACTIVE_LOCAL_MODEL_PATH = model_path
    print(f"\n// [PAGE_2_ISOLATION] -> RTX 5060 VRAM LOCKED TO: {request.model_filename}")
    
    return {"status": "ENGINE_INITIALIZED", "model": request.model_filename}

# --- PURE CLOUD API CREW LOGIC ---
@app.post("/api/execute_crew")
async def execute_crew(request: CrewApiExecutionRequest):
    if not request.api_key:
        raise HTTPException(status_code=400, detail="NO_API_KEY: Please enter an API Key in the CrewAI Hub.")
    
    if not request.agents:
        raise HTTPException(status_code=400, detail="NO_AGENTS_ASSIGNED: The selected team has no active members.")

    try:
        final_result = execute_api_crew(
            team_name=request.team_name,
            task_description=request.task,
            agents_data=request.agents,
            api_key=request.api_key,
            provider=request.provider,
            api_model=request.api_model
        )
        return {"status": "SUCCESS", "result": final_result}
    except Exception as e:
        print(f"// [FATAL ERROR] -> CLOUD CREW EXECUTION CRASHED: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
