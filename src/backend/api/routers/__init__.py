"""API routers module."""

from api.routers.care_plans import router as care_plans_router
from api.routers.generation import router as generation_router
from api.routers.health import router as health_router
from api.routers.patients import router as patients_router
from api.routers.pdf import router as pdf_router
from api.routers.plans import router as plans_router
from api.routers.records import router as records_router

__all__ = [
    "care_plans_router",
    "generation_router",
    "health_router",
    "patients_router",
    "pdf_router",
    "plans_router",
    "records_router",
]

