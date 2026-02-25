import logging
import time
import uuid
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.engine import engine, QueryResponse

# --- LOGGING SETUP ---
logger = logging.getLogger("DeterministicAPI")

app = FastAPI(
    title="Deterministic SQL Assistant API",
    description="Enterprise-grade structured retrieval engine.",
    version="2.0.0"
)

# --- MODELS ---
class ChatRequest(BaseModel):
    prompt: str
    conversation_id: Optional[str] = None

# --- LIFECYCLE ---
@app.on_event("startup")
async def startup_event():
    """Starts the database pool on application startup."""
    logger.info("Starting up Deterministic SQL Assistant...")
    await engine.connect()

@app.on_event("shutdown")
async def shutdown_event():
    """Gracefully shuts down the database pool."""
    logger.info("Shutting down Deterministic SQL Assistant...")
    await engine.disconnect()

# --- MIDDLEWARE FOR REQUEST LOGGING ---
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Logs the lifecycle of every HTTP request."""
    start_time = time.time()
    response = await call_next(request)
    duration = (time.time() - start_time) * 1000
    logger.info(f"HTTP {request.method} {request.url.path} handled in {duration:.2f}ms | Status: {response.status_code}")
    return response

# --- ENDPOINTS ---
@app.post("/api/chat", summary="Chat interface for SQL retrieval")
async def handle_chat(request: ChatRequest):
    """
    Primary endpoint for the frontend.
    Matches the format expected by the React UI.
    """
    result = await engine.process_query(request.prompt)
    
    # Prepare response in the format frontend expects
    columns = []
    rows = []
    if result.success and result.data:
        rows = result.data
        if rows:
            columns = list(rows[0].keys())

    # Generate a dummy conversation ID if not provided
    convo_id = request.conversation_id or str(uuid.uuid4())

    # Map engine response to UI response
    return {
        "success": result.success,
        "message": "Here is the data I found:" if result.success else result.error,
        "sql": result.sql,
        "rows": rows,
        "columns": columns,
        "error": result.error if not result.success else None,
        "conversation_id": convo_id,
        "method": result.method
    }

@app.get("/health", summary="Check system health")
async def health_check():
    """Returns the current status of the engine and API."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "engine": "deterministic-v2-industry"
    }

# --- ERROR HANDLERS ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Globally catches unhandled exceptions and returns a clean JSON error response."""
    logger.critical(f"Unhandled API Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal Server Error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
