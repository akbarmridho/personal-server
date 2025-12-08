from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.config import settings
from app.api.routes import router as api_router, initialize_services

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize services eagerly
    print("Initializing services...")
    initialize_services()
    print("Services initialized successfully")
    yield
    # Shutdown: cleanup if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

app.include_router(api_router)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
