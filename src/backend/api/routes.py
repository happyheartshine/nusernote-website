"""API routes for NurseNote AI backend.

This module combines all domain-specific routers into a single main router.
Routes are organized by domain in separate router modules:
- Health check routes
- SOAP generation routes
- SOAP records routes
- PDF generation routes
- Patient CRUD routes
- Care plan routes
"""

from fastapi import APIRouter

from api.routers import (
    care_plans_router,
    generation_router,
    health_router,
    patients_router,
    pdf_router,
    plans_router,
    records_router,
    reports_router,
)

# Create main router
router = APIRouter()

# Include all domain-specific routers
router.include_router(health_router)
router.include_router(generation_router)
router.include_router(records_router)
router.include_router(pdf_router)
router.include_router(patients_router)
router.include_router(care_plans_router)
router.include_router(plans_router)
router.include_router(reports_router)
