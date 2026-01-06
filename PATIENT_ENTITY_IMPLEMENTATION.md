# Patient (利用者) Core Entity Implementation

## Overview

The Patient entity has been implemented as a persistent core entity representing fixed baseline information for patients. This document explains the schema changes and implementation details.

## Schema Changes

### 1. Patients Table (利用者)

**Location**: `supabase/migrations/20240105000001_create_patients_table.sql`

The `patients` table stores fixed baseline patient information:

- **id** (UUID): Primary key
- **user_id** (UUID): Foreign key to `auth.users` (owner)
- **name** (TEXT): Patient name (利用者名)
- **age** (INTEGER): Patient age
- **gender** (TEXT): Patient gender
- **primary_diagnosis** (TEXT): Primary diagnosis (主疾患)
- **individual_notes** (TEXT): Individual notes for the patient
- **status** (TEXT): Patient status (active/inactive/archived)
- **created_at** (TIMESTAMP): Record creation time
- **updated_at** (TIMESTAMP): Last update time

**Key Features**:
- Unique constraint on (user_id, name) to prevent duplicate patient names per user
- Row Level Security (RLS) policies ensure users can only access their own patients
- Status check constraint ensures valid status values

### 2. Care Plans Table

**Location**: `supabase/migrations/20240105000002_create_care_plans_table.sql`

The `care_plans` table references patients via foreign key:

- **patient_id** (UUID): Foreign key to `patients.id`
- One patient can have multiple care plans over time
- Care plans are linked to the patient entity, not embedded

### 3. SOAP Records (Visit Records) Table

**Location**: `supabase/migrations/20240105000003_update_soap_records_add_patient_id.sql`

The `soap_records` table has been updated to reference patients:

- **patient_id** (UUID, nullable): Foreign key to `patients.id`
- **patient_name** (TEXT): Kept for backward compatibility (will be removed in future)
- **diagnosis** (TEXT): Kept for backward compatibility (will be removed in future)

**Important**: Patient attributes are NOT embedded in visit records. The `patient_id` foreign key is the preferred way to reference patients. The `patient_name` and `diagnosis` fields are maintained temporarily for backward compatibility with existing data.

## Relationships

```
patients (1) ──< (many) care_plans
patients (1) ──< (many) soap_records
```

- **One patient can have multiple care plans**: A patient can have multiple care plans created over time, each with different start/end dates and statuses.
- **One patient can have multiple visit records**: A patient can have multiple SOAP visit records, each representing a different visit date.

## API Endpoints

### Patient CRUD Operations

All endpoints require authentication via Supabase JWT token.

- **POST `/patients`**: Create a new patient
- **GET `/patients`**: List all patients (with optional status filter)
- **GET `/patients/{patient_id}`**: Get a single patient by ID
- **PATCH `/patients/{patient_id}`**: Update a patient
- **DELETE `/patients/{patient_id}`**: Delete a patient

### Care Plan Operations

- **POST `/care-plans`**: Create a new care plan for a patient
- **GET `/patients/{patient_id}/care-plans`**: Get all care plans for a patient

### Updated Endpoints

- **POST `/generate`**: Now accepts `patient_id` (optional). If provided, patient data is fetched from the patients table. If not provided, falls back to `userName` and `diagnosis` for backward compatibility.
- **GET `/records`**: Now includes `patient_id` in response and supports filtering by `patient_id`

## Implementation Details

### Database Service

**Location**: `src/backend/services/database_service.py`

The database service includes:
- Patient CRUD operations: `create_patient()`, `get_patients()`, `get_patient_by_id()`, `update_patient()`, `delete_patient()`
- Care plan operations: `create_care_plan()`, `get_care_plans_by_patient()`
- Updated SOAP record operations: `save_soap_record()` now accepts `patient_id` as the preferred parameter

### API Routes

**Location**: `src/backend/api/routes.py`

- Patient CRUD endpoints have been added
- Care plan endpoints have been added
- Generate endpoint updated to use `patient_id` when provided
- Records endpoints updated to include `patient_id` in responses

### Models

**Location**: `src/backend/models.py`

- `PatientCreateRequest`: Request model for creating patients
- `PatientUpdateRequest`: Request model for updating patients
- `PatientResponse`: Response model for patient data
- `PatientsListResponse`: Response model for list of patients
- `CarePlanCreateRequest`: Request model for creating care plans
- `CarePlanResponse`: Response model for care plan data
- `CarePlansListResponse`: Response model for list of care plans

## Data Flow

### Creating a Visit Record

1. **With patient_id** (preferred):
   - Client sends `patient_id` in generate request
   - Backend fetches patient data from `patients` table
   - Visit record is saved with `patient_id` foreign key
   - Patient attributes are NOT stored in `soap_records`

2. **Without patient_id** (backward compatibility):
   - Client sends `userName` and `diagnosis`
   - Visit record is saved with `patient_name` and `diagnosis` (temporary)
   - These fields will be removed in a future migration

### Querying Visit Records

- Visit records can be filtered by `patient_id`
- Patient information can be retrieved by joining with `patients` table
- Patient attributes in `soap_records` are for display convenience only

## Future Migration Steps

To fully remove embedded patient attributes from visit records:

1. **Data Migration**: For each unique (user_id, patient_name, diagnosis) combination:
   - Create or find matching patient record
   - Update `soap_records.patient_id` to reference the patient

2. **Schema Cleanup**:
   - Make `patient_id` NOT NULL
   - Remove `patient_name` and `diagnosis` columns from `soap_records`

3. **Update Application Code**:
   - Remove backward compatibility code
   - Ensure all new records require `patient_id`

## Benefits

1. **Data Integrity**: Patient information is stored once in the `patients` table, preventing inconsistencies
2. **Normalization**: Follows database normalization principles
3. **Flexibility**: Easy to update patient information without touching all visit records
4. **Relationships**: Clear foreign key relationships enable proper joins and queries
5. **Scalability**: Efficient queries using indexes on foreign keys

## Summary

The Patient entity is now a persistent core entity with:
- ✅ All required fields (name, age, gender, primary_diagnosis, individual_notes, status)
- ✅ Proper relationships with care plans and visit records
- ✅ Patient attributes NOT embedded in visit records (using foreign key instead)
- ✅ Complete CRUD API endpoints
- ✅ Backward compatibility maintained during transition period

