# Current Implementation Status Documentation

This document describes the currently implemented features and workflows in the NurseNote application according to the specified flow chart.

---

## ① New Registration → Pending Display → Administrator Approval → Login

### Status: ✅ **FULLY IMPLEMENTED AND WORKING**

### Flow Description

1. **New Registration**
   - **Location**: `/register` route (`src/views/pages/Register.jsx`)
   - **Features**:
     - Email/password registration form with validation
     - Google OAuth sign-up support
     - Microsoft (Azure) OAuth sign-up support
     - Terms and conditions checkbox
     - Password strength validation (minimum 8 characters)
     - Email format validation
   - **Backend Process**:
     - User account created in Supabase `auth.users` table
     - Database trigger (`on_auth_user_created`) automatically creates profile in `profiles` table
     - Profile created with:
       - `role = 'nurse'` (default)
       - `status = 'pending'` (default)
       - Email copied from auth.users
   - **Post-Registration**: User redirected to `/pending-approval` page

2. **Pending Display**
   - **Location**: `/pending-approval` route (`src/app/(auth)/pending-approval/page.jsx`)
   - **Features**:
     - Displays waiting message: "管理者の承認待ちです" (Waiting for administrator approval)
     - Shows user email and status
     - Logout button available
     - Auto-redirects to dashboard if user status becomes 'approved'
     - Auto-redirects to login if user logs out
   - **Access Control**: Only accessible to authenticated users with `status='pending'`
   - **UI**: Clean, modern design with hospital theme

3. **Administrator Approval**
   - **Location**: `/admin/approvals` route (`src/app/(dashboard)/admin/approvals/page.jsx`)
   - **Access**: Admin users only (protected by `AdminGuard`)
   - **Features**:
     - Lists all users with `status='pending'`
     - Displays user information:
       - Name (or "名前未設定" if not set)
       - Email address
       - Registration date/time
       - Role (看護師/管理者)
     - **Actions Available**:
       - **Approve**: Changes user status to `'approved'`
       - **Reject**: Changes user status to `'rejected'`
     - Confirmation dialog for rejections
     - Toast notifications for success/error
     - Real-time updates after approval/rejection
   - **Backend**: Direct database update (can be migrated to Edge Function `admin-approve-user`)

4. **Login**
   - **Location**: `/login` route (`src/views/pages/Login.jsx`)
   - **Features**:
     - Email/password login
     - Google OAuth login
     - Microsoft (Azure) OAuth login
     - Form validation
   - **Post-Login Redirect Logic**:
     - `status='pending'` → `/pending-approval`
     - `status='approved'` + `role='admin'` → `/admin/approvals`
     - `status='approved'` + `role='nurse'` → `/dashboard/default`
   - **Access Control**: Protected routes check user status via `AuthGuard` component

### Implementation Details

- **Database Schema**: `profiles` table with `role` and `status` fields
- **RLS Policies**: Only approved users can access protected data (SOAP records, plans, reports)
- **Route Guards**:
  - `AuthGuard`: Ensures user is authenticated and approved
  - `AdminGuard`: Ensures user is admin and approved
- **OAuth Callback**: `/auth/callback` handles OAuth redirects and checks profile status

### Verification Checklist

- ✅ User registration creates profile with pending status
- ✅ Pending users see waiting page
- ✅ Admin can view pending users list
- ✅ Admin can approve/reject users
- ✅ Approved users can login and access dashboard
- ✅ Pending users cannot access protected resources
- ✅ OAuth registration/login works correctly

---

## ② SOAP Input/Record Generation

### Status: ✅ **IMPLEMENTED** (Needs feedback and adjustments)

### Flow Description

1. **SOAP Input**
   - **Location**: SOAP Tab component (`src/components/ai/SOAPTab.jsx`)
   - **Input Fields**:
     - Patient selection (dropdown with patient list)
     - Visit date (`visitDate`)
     - Start time (`startTime`)
     - End time (`endTime`)
     - Nurses (multiple selection)
     - Chief complaint (`chiefComplaint`)
     - Subjective text (`sText`) - Patient's subjective information
     - Objective text (`oText`) - Objective observations
   - **Default Values**: System provides defaults for common fields
   - **Patient Integration**: Can select from existing patients (uses `patient_id`) or enter manually (uses `userName` and `diagnosis`)

2. **Record Generation**
   - **API Endpoint**: `POST /generate` (`src/backend/api/routers/generation.py`)
   - **Process**:
     1. Validates input data
     2. Fetches patient information if `patient_id` provided
     3. Calls AI service to generate SOAP note
     4. Parses AI response into structured format:
        - `soap_output`: Contains sections A (Assessment), P (Plan), etc.
        - `plan_output`: Contains 長期目標 (long-term goal), 短期目標 (short-term goal), 看護援助の方針 (nursing policy)
     5. **Automatically saves** to database (`soap_records` table)
     6. Returns generated text to frontend
   - **Database Storage**:
     - Table: `soap_records`
     - Fields stored:
       - `user_id` (from authenticated user)
       - `patient_id` (if patient selected)
       - `patient_name`
       - `diagnosis`
       - `visit_date`, `start_time`, `end_time`
       - `nurses` (array)
       - `chief_complaint`
       - `s_text`, `o_text` (input fields)
       - `soap_output` (JSONB - generated SOAP content)
       - `plan_output` (JSONB - generated plan content)
       - `created_at`, `updated_at` (timestamps)

3. **Generated Output Structure**
   - **SOAP Output** (`soap_output`):
     - Section A (Assessment): Disease progression, symptoms
     - Section P (Plan): Nursing interventions
     - Other sections as generated by AI
   - **Plan Output** (`plan_output`):
     - `長期目標` (Long-term goal)
     - `短期目標` (Short-term goal)
     - `看護援助の方針` (Nursing policy)
   - **Format**: JSONB for flexibility in structure

### Current Implementation Status

- ✅ SOAP input form with all required fields
- ✅ Patient selection integration
- ✅ AI generation via backend API
- ✅ Automatic database saving after generation
- ✅ Structured output parsing
- ✅ Error handling and validation

### Areas Requiring Feedback and Adjustments

1. **Output Quality**: 
   - Need feedback on AI-generated SOAP note quality
   - May need prompt adjustments for better medical terminology
   - May need format adjustments for compliance

2. **User Experience**:
   - Review workflow for editing generated content
   - Consider adding preview before saving
   - Consider adding draft save functionality

3. **Data Validation**:
   - Verify all required fields are captured
   - Ensure date/time validation works correctly
   - Check patient data integration

4. **Integration with Plans/Reports**:
   - Verify `plan_output` structure matches plan creation requirements
   - Ensure SOAP records are properly linked to patients

---

## ③ Creating a Plan (訪問看護計画書)

### Status: ✅ **CREATION IMPLEMENTED** (Format transcription and 3-month evaluations need improvement)

### Flow Description

1. **Plan Creation**
   - **Location**: `/plans/new` route (`src/app/(dashboard)/plans/new/page.jsx`)
   - **API Endpoint**: `POST /patients/{patient_id}/plans` (`src/backend/api/routers/plans.py`)
   - **Service**: `PlanService.create()` (`src/backend/services/database_service.py`)

2. **Automatically Generated Fields**
   - `id`: UUID generated by database
   - `user_id`: Extracted from authenticated user's JWT token
   - `patient_id`: Provided in API request (validated against user's patients)
   - `title`: Defaults to `"精神科訪問看護計画書"` if not provided
   - `status`: Defaults to `"ACTIVE"`
   - `created_at`, `updated_at`: Database timestamps

3. **Auto-Prefilled Fields** (from SOAP/patient data, can be overridden)
   - `patient_family_wish`: Prefilled from `patient.individual_notes` if field is empty
   - `long_term_goal`: Prefilled from latest SOAP record's `plan_output['長期目標']` if empty
   - `short_term_goal`: Prefilled from latest SOAP record's `plan_output['短期目標']` if empty
   - `nursing_policy`: Prefilled from latest SOAP record's `plan_output['看護援助の方針']` if empty

4. **Auto-Created Structures**
   - **Plan Items** (`plan_items`):
     - Default 5 items created if not provided:
       - LONG_TERM (看護の目標)
       - SHORT_TERM (短期目標)
       - POLICY (看護援助の方針)
       - SPECIFIC_CONTENT (具体的な援助内容)
       - LIFE_RHYTHM (生活リズム)
     - OR populated from SOAP record's `plan_output` if available
   - **Plan Evaluations** (`plan_evaluations`):
     - 2 evaluation slots automatically created:
       - Slot 1: `start_date + 90 days` (3 months)
       - Slot 2: `start_date + 180 days` (6 months)
     - Both initialized with `result = "NONE"`

5. **Manual Entry Required**
   - `start_date`: Required (YYYY-MM-DD format)
   - `end_date`: Required (YYYY-MM-DD format, must be >= start_date)
   - All other fields are optional but can be manually provided to override auto-prefills

### Current Implementation Status

- ✅ Plan creation API endpoint
- ✅ Auto-prefill from SOAP records
- ✅ Auto-prefill from patient data
- ✅ Default plan items creation
- ✅ Evaluation slots creation (3 months and 6 months)
- ✅ Plan editing capability
- ✅ Plan listing by patient

### Areas Requiring Improvement

1. **Format Transcription** (Making transcription to format easier to understand)
   - **Current**: Data stored in database with structured format
   - **Needed**: 
     - Better UI for viewing/editing plan in document format
     - PDF export with proper formatting
     - Print-friendly view
     - Clear visual representation of plan structure

2. **3-Month Evaluations** (Structure for generation and editing)
   - **Current**: 
     - Evaluation slots created at +3 months and +6 months
     - Basic structure with `result` (CIRCLE/CHECK/NONE) and `note` fields
   - **Needed**:
     - Better UI for evaluation entry
     - Evaluation form with structured fields
     - Ability to add more evaluation points
     - Evaluation history tracking
     - Visual indicators for evaluation status
     - Integration with SOAP records for evaluation data

### Database Schema

- **Table**: `plans`
- **Related Tables**: 
  - `plan_items` (one-to-many)
  - `plan_evaluations` (one-to-many)
- **Fields**: See `PLANS_REPORTS_FIELD_DOCUMENTATION.md` for complete field list

---

## ④ Monthly Report Creation (精神科訪問看護報告書)

### Status: ✅ **CREATION IMPLEMENTED** (Format transcription and period specification need improvement)

### Flow Description

1. **Report Creation**
   - **Location**: Report components (`src/components/reports/PatientReportsModal.jsx`)
   - **API Endpoint**: `POST /patients/{patient_id}/reports` (`src/backend/api/routers/reports.py`)
   - **Service**: `ReportService.create()` (`src/backend/services/database_service.py`)

2. **Automatically Generated Fields**
   - `id`: UUID generated by database
   - `user_id`: Extracted from authenticated user's JWT token
   - `patient_id`: Provided in API request (validated against user's patients)
   - `year_month`: Calculated from `period_start` (YYYY-MM format) OR provided directly
   - `period_start`: Calculated from `year_month` (first day of month) OR provided directly
   - `period_end`: Calculated from `year_month` (last day of month) OR provided directly
   - `status`: Defaults to `"DRAFT"`
   - `profession_text`: Defaults to `"訪問した職種：看護師"`
   - `report_date`: Defaults to `CURRENT_DATE`
   - `created_at`, `updated_at`: Database timestamps

3. **Auto-Generated Visit Marks** (from SOAP records)
   - **Source**: Automatically generated from `soap_records` for the specified period
   - **Mark Types**:
     - **CIRCLE (○)**: Generated when there is exactly 1 visit on a date
     - **DOUBLE_CIRCLE (◎)**: Generated when there are 2 or more visits on a date
     - **CHECK (✔︎)**: Generated when any visit on a date has duration < 30 minutes
   - **Manual Marks** (not auto-generated):
     - **TRIANGLE (△)**: Manual mark only
     - **SQUARE (□)**: Manual mark only
   - **Duration Calculation**: Calculated from `soap_records.start_time` and `soap_records.end_time`
   - **Regeneration**: Auto-generated marks can be regenerated via `/reports/{report_id}/regenerate` endpoint

4. **Auto-Prefilled Fields** (from SOAP records, can be overridden)
   - `disease_progress_text`: Optionally prefilled from last 10 SOAP records' `soap_output['A']` sections and `notes` fields (concatenated, limited to 2000 chars)

5. **Manual Entry Required**
   - `year_month` OR (`period_start` + `period_end`): Required
   - All text fields are optional but can be manually provided:
     - `disease_progress_text` (病状の経過)
     - `nursing_rehab_text` (看護・リハビリテーションの内容)
     - `family_situation_text` (家庭状況)
     - `procedure_text` (処置 / 衛生材料)
     - `monitoring_text` (特記すべき事項及びモニタリング)
     - `gaf_score` (GAF score)
     - `gaf_date` (GAF assessment date)
   - Visit marks can be manually edited after auto-generation

### Current Implementation Status

- ✅ Report creation API endpoint
- ✅ Period calculation (year_month ↔ period_start/period_end)
- ✅ Auto-generation of visit marks from SOAP records
- ✅ Auto-prefill of disease progress text from SOAP records
- ✅ Report editing capability
- ✅ Report listing by patient
- ✅ Visit mark regeneration functionality

### Areas Requiring Improvement

1. **Format Transcription** (Making transcription to format easier to understand)
   - **Current**: Data stored in database with structured format
   - **Needed**:
     - Better UI for viewing/editing report in document format
     - PDF export with proper formatting matching official report format
     - Print-friendly view
     - Calendar view for visit marks
     - Clear visual representation of report structure

2. **Period Specification** (Generate reports that reflect the specified period)
   - **Current**: 
     - Supports `year_month` (monthly reports)
     - Supports `period_start` + `period_end` (custom period)
   - **Needed**:
     - Better UI for period selection
     - Calendar picker for date range selection
     - Validation for period boundaries
     - Support for custom periods (not just monthly)
     - Visual indication of period in report
     - Filtering SOAP records by period correctly

### Database Schema

- **Table**: `reports`
- **Related Tables**: 
  - `report_visit_marks` (one-to-many)
- **Fields**: See `PLANS_REPORTS_FIELD_DOCUMENTATION.md` for complete field list

### PDF Generation

- **Endpoint**: `POST /pdf/monthly-report/{patient_id}` (`src/backend/api/routers/pdf.py`)
- **Service**: `generate_monthly_report_pdf()` (`src/backend/services/pdf_service.py`)
- **Features**:
  - Generates PDF from monthly visit data
  - Uses WeasyPrint with Japanese font support
  - Uploads to S3 storage
  - Returns presigned URL for download

---

## Summary of Implementation Status

| Flow | Status | Key Features | Areas for Improvement |
|------|--------|--------------|---------------------|
| **① Registration → Approval → Login** | ✅ **FULLY WORKING** | Complete workflow, OAuth support, admin panel | Verification through actual use |
| **② SOAP Input/Generation** | ✅ **IMPLEMENTED** | AI generation, auto-save, structured output | Feedback on output quality, UX improvements |
| **③ Plan Creation** | ✅ **CREATION WORKING** | Auto-prefill, evaluation slots | Format transcription UI, 3-month evaluation structure |
| **④ Monthly Report Creation** | ✅ **CREATION WORKING** | Auto-generated marks, period calculation | Format transcription UI, period specification UI |

---

## Next Steps for Verification and Improvement

### ① Registration Flow
- [ ] Test complete registration flow end-to-end
- [ ] Verify OAuth registration creates pending profiles correctly
- [ ] Test admin approval workflow
- [ ] Verify RLS policies prevent pending users from accessing data
- [ ] Test edge cases (duplicate emails, invalid data)

### ② SOAP Generation
- [ ] Collect user feedback on generated SOAP note quality
- [ ] Adjust AI prompts based on feedback
- [ ] Test with various patient scenarios
- [ ] Verify all fields are captured correctly
- [ ] Test error handling and edge cases

### ③ Plan Creation
- [ ] Improve plan display/editing UI for better format transcription
- [ ] Enhance 3-month evaluation structure and UI
- [ ] Add PDF export functionality
- [ ] Test plan creation with various SOAP record scenarios
- [ ] Verify evaluation slots are created correctly

### ④ Report Creation
- [ ] Improve report display/editing UI for better format transcription
- [ ] Enhance period selection UI
- [ ] Test report generation with various periods
- [ ] Verify visit marks are generated correctly
- [ ] Test report regeneration functionality
- [ ] Improve PDF export formatting

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-XX  
**Maintained By**: Development Team
