# Database Setup Guide - Backend Implementation

## Overview

The backend now automatically saves all SOAP records to Supabase after successful AI generation. This document explains the setup and workflow.

## Workflow

### 1. User Clicks Generate Button (Frontend)
- Frontend sends POST request to `/generate` endpoint with form data
- Includes Supabase JWT token in Authorization header

### 2. Backend Processing
- **Location**: `backend/api/routes.py` - `generate_note()` function
- Validates request data
- Generates SOAP notes using AI service
- **Parses AI output** into structured format
- **Saves to Supabase database** automatically
- Returns generated output to frontend

### 3. Database Save
- **Service**: `backend/services/database_service.py`
- **Parser**: `backend/utils/response_parser.py`
- Data is saved to `soap_records` table
- If save fails, error is logged but request still succeeds (user gets output)

## Setup Instructions

### Step 1: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install `supabase>=2.0.0` along with other dependencies.

### Step 2: Create Database Table

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open and run: `backend/supabase_schema.sql`

This creates:
- `soap_records` table with all necessary columns
- Indexes for performance
- Row Level Security (RLS) policies
- Automatic timestamp updates

### Step 3: Configure Environment Variables

Add to your `backend/.env` file:

```env
# Existing variables
OPENAI_API_KEY=sk-xxxx
SUPABASE_PROJECT_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret

# NEW: Required for database operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**How to get SUPABASE_SERVICE_ROLE_KEY:**
1. Go to Supabase Dashboard
2. Navigate to **Settings** → **API**
3. Find **service_role** key (NOT the anon key)
4. Copy and add to `.env`

⚠️ **Important**: The service_role key has admin privileges. Keep it secure and never expose it in frontend code.

### Step 4: Verify Setup

1. Start your backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

2. Test the endpoint - the save should happen automatically after generation

3. Check Supabase dashboard:
   - Go to **Table Editor** → `soap_records`
   - You should see new records after each generation

## Database Schema

### Table: `soap_records`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `user_id` | UUID | Foreign key to auth.users |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |
| `patient_name` | TEXT | 利用者名 |
| `diagnosis` | TEXT | 主疾患 |
| `visit_date` | DATE | 訪問日 |
| `start_time` | TIME | 訪問開始時間 |
| `end_time` | TIME | 訪問終了時間 |
| `nurses` | TEXT[] | 看護師名 (array) |
| `chief_complaint` | TEXT | 主訴 |
| `s_text` | TEXT | S（主観）入力 |
| `o_text` | TEXT | O（客観）入力 |
| `soap_output` | JSONB | Generated SOAP structure |
| `plan_output` | JSONB | Generated Plan structure |
| `notes` | TEXT | Optional notes |

## Code Structure

### Database Service
- **File**: `backend/services/database_service.py`
- **Function**: `save_soap_record()`
- Handles all Supabase database operations
- Uses service role key for admin access

### Response Parser
- **File**: `backend/utils/response_parser.py`
- **Function**: `parse_soap_response()`
- Parses AI-generated text into structured JSON format
- Extracts S, O, A (with sub-sections), P (with sub-sections), and Plan sections

### Route Handler
- **File**: `backend/api/routes.py`
- **Function**: `generate_note()`
- After successful AI generation:
  1. Parses the output
  2. Saves to database
  3. Returns output to frontend

## Data Flow

```
Frontend Request
    ↓
Backend /generate endpoint
    ↓
Validate & Generate AI Output
    ↓
Parse Output (response_parser.py)
    ↓
Save to Supabase (database_service.py)
    ↓
Return Output to Frontend
```

## Error Handling

- **Database save failures**: Logged but don't fail the request
- User still receives generated output even if save fails
- This ensures the app remains functional if database is temporarily unavailable

## Security

- **Row Level Security (RLS)**: Enabled on `soap_records` table
- **Policies**: Users can only access their own records
- **Service Role Key**: Used only in backend (never exposed to frontend)
- **Authentication**: All operations require valid Supabase JWT token

## Troubleshooting

### Issue: "SUPABASE_SERVICE_ROLE_KEY environment variable is required"
**Solution**: Add `SUPABASE_SERVICE_ROLE_KEY` to your `backend/.env` file

### Issue: "relation 'soap_records' does not exist"
**Solution**: Run the SQL schema file in Supabase SQL Editor

### Issue: "Failed to save record"
**Solution**: 
1. Check Supabase connection
2. Verify service role key is correct
3. Check backend logs for detailed error messages

### Issue: Data not saving but no error
**Solution**:
1. Check backend logs for database errors
2. Verify RLS policies are correctly set up
3. Ensure service role key has proper permissions

## Testing

After setup, test by:
1. Making a POST request to `/generate` with valid data
2. Checking Supabase dashboard for new record
3. Verifying all fields are saved correctly

## Next Steps

- Consider adding update/delete endpoints if needed
- Add query endpoints to retrieve saved records
- Implement pagination for record listing
- Add filtering/search capabilities

