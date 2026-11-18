from fastapi import FastAPI

from .db import Base, engine
from .routers import auth, espacios, listas, tareas

Base.metadata.create_all(engine)

app = FastAPI(
    title="SuperClickUp API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

app.include_router(auth.router)
app.include_router(espacios.router)
app.include_router(listas.router)
app.include_router(tareas.router)


@app.get("/api/salud")
def salud():
    return {"ok": True}
