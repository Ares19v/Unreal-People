# API Reference
The backend operates on a FastAPI server on `localhost:8000`.

## 1. Upload Model
`POST /api/upload_model`
* **Payload:** `multipart/form-data` (file, type)
* **Response:** `{ "status": "SUCCESS" }`

## 2. Initialize Local Engine
`POST /api/initialize_engine`
* **Payload:** `json` (model_filename, lora_filename, precision, quant_level)
* **Response:** `{ "status": "ENGINE_INITIALIZED" }`

## 3. Execute Crew Protocol
`POST /api/execute_crew`
* **Payload:** `json` (team_name, task, agents, api_key, provider, api_model)
* **Response:** `{ "status": "SUCCESS", "result": "Markdown" }`
