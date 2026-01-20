# NurseNote Project Requirements Documentation

This document provides comprehensive documentation of the NurseNote application covering database definitions, screen structure, format-related data, and configuration information.

---

## 1. Database Definitions

### 1.1 Core Tables

#### 1.1.1 `profiles` Table
User profile information extending Supabase auth.users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, REFERENCES auth.users(id) | User ID (matches auth.users) |
| `email` | TEXT | UNIQUE, NOT NULL | User email address |
| `role` | TEXT | NOT NULL, CHECK ('admin' OR 'nurse') | User role (default: 'nurse') |
| `status` | TEXT | NOT NULL, CHECK ('pending', 'approved', 'rejected') | Approval status (default: 'pending') |
| `name` | TEXT | NULLABLE | Full name |
| `birthday` | DATE | NULLABLE | Date of birth |
| `gender` | TEXT | NULLABLE | Gender |
| `address` | TEXT | NULLABLE | Address |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_profiles_email` on `email`
- `idx_profiles_role` on `role`
- `idx_profiles_status` on `status`
- `idx_profiles_role_status` on `(role, status)`

**RLS Policies:**
- Users can view/insert/update/delete their own profile
- Service role can bypass RLS

---

#### 1.1.2 `patients` Table (利用者)
Fixed baseline patient information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Patient ID |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner user ID |
| `name` | TEXT | NOT NULL | Patient name (利用者名) |
| `age` | INTEGER | NULLABLE | Patient age |
| `gender` | TEXT | NULLABLE | Patient gender |
| `primary_diagnosis` | TEXT | NULLABLE | Primary diagnosis (主疾患) |
| `individual_notes` | TEXT | NULLABLE | Individual notes |
| `status` | TEXT | NOT NULL, DEFAULT 'active', CHECK ('active', 'inactive', 'archived') | Patient status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Constraints:**
- `UNIQUE (user_id, name)` - Unique patient names per user

**Indexes:**
- `idx_patients_user_id` on `user_id`
- `idx_patients_name` on `name`
- `idx_patients_status` on `status`
- `idx_patients_created_at` on `created_at DESC`

**RLS Policies:**
- Users can view/insert/update/delete their own patients
- Service role can bypass RLS

---

#### 1.1.3 `soap_records` Table
Visit records storing SOAP notes and care plans.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Record ID |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner user ID |
| `patient_id` | UUID | NULLABLE, REFERENCES patients(id) ON DELETE CASCADE | Patient ID (foreign key) |
| `patient_name` | TEXT | NOT NULL | Patient name (backward compatibility) |
| `diagnosis` | TEXT | NULLABLE | Diagnosis (backward compatibility) |
| `visit_date` | DATE | NOT NULL | Visit date |
| `start_time` | TIME | NULLABLE | Visit start time |
| `end_time` | TIME | NULLABLE | Visit end time |
| `nurses` | TEXT[] | DEFAULT '{}' | Array of nurse names |
| `chief_complaint` | TEXT | NULLABLE | Chief complaint (主訴) |
| `s_text` | TEXT | NULLABLE | Subjective input (S) |
| `o_text` | TEXT | NULLABLE | Objective input (O) |
| `soap_output` | JSONB | NULLABLE | Generated SOAP structure (JSON) |
| `plan_output` | JSONB | NULLABLE | Generated care plan structure (JSON) |
| `status` | TEXT | NULLABLE | Record status |
| `notes` | TEXT | NULLABLE | Optional notes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_soap_records_user_id` on `user_id`
- `idx_soap_records_visit_date` on `visit_date DESC`
- `idx_soap_records_created_at` on `created_at DESC`

**RLS Policies:**
- Users can view/insert/update/delete their own records
- Service role can bypass RLS

**Note:** `patient_name` and `diagnosis` are maintained for backward compatibility. Future migration will remove these fields once all records use `patient_id`.

---

#### 1.1.4 `plans` Table (訪問看護計画書)
Nursing care plans.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Plan ID |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner user ID |
| `patient_id` | UUID | NOT NULL, REFERENCES patients(id) ON DELETE CASCADE | Patient ID |
| `title` | TEXT | NOT NULL, DEFAULT '精神科訪問看護計画書' | Plan title |
| `start_date` | DATE | NOT NULL | Plan start date |
| `end_date` | DATE | NOT NULL | Plan end date |
| `long_term_goal` | TEXT | NULLABLE | Long-term goal (看護の目標) |
| `short_term_goal` | TEXT | NULLABLE | Short-term goal (短期目標) |
| `nursing_policy` | TEXT | NULLABLE | Nursing policy (看護援助の方針) |
| `patient_family_wish` | TEXT | NULLABLE | Patient/family wishes (患者様とご家族の希望) |
| `has_procedure` | BOOLEAN | NOT NULL, DEFAULT FALSE | Has procedure flag (衛生材料等を要する処置の有無) |
| `procedure_content` | TEXT | NULLABLE | Procedure content (処置内容) |
| `material_details` | TEXT | NULLABLE | Material details (衛生材料（種類・サイズ）等) |
| `material_amount` | TEXT | NULLABLE | Material amount (必要量) |
| `procedure_note` | TEXT | NULLABLE | Procedure notes (備考) |
| `status` | TEXT | NOT NULL, DEFAULT 'ACTIVE', CHECK ('ACTIVE', 'ENDED_BY_HOSPITALIZATION', 'CLOSED') | Plan status |
| `closed_at` | TIMESTAMPTZ | NULLABLE | Closed timestamp |
| `closed_reason` | TEXT | NULLABLE | Close reason |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Constraints:**
- `CHECK (end_date >= start_date)` - End date must be >= start date

**Indexes:**
- `idx_plans_user_id` on `user_id`
- `idx_plans_patient_id` on `patient_id`
- `idx_plans_patient_status` on `(patient_id, status)`
- `idx_plans_status` on `status`
- `idx_plans_start_date` on `start_date DESC`
- `idx_plans_created_at` on `created_at DESC`

**RLS Policies:**
- Users can view/insert/update/delete their own plans
- Service role can bypass RLS

---

#### 1.1.5 `plan_items` Table
Structured items within care plans.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Item ID |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner user ID |
| `plan_id` | UUID | NOT NULL, REFERENCES plans(id) ON DELETE CASCADE | Plan ID |
| `item_key` | TEXT | NOT NULL | Item key (e.g., 'LONG_TERM', 'SHORT_TERM', 'POLICY') |
| `label` | TEXT | NOT NULL | Display label |
| `observation_text` | TEXT | NULLABLE | Observation items (必要な観察項目) |
| `assistance_text` | TEXT | NULLABLE | Assistance content (援助内容) |
| `sort_order` | INTEGER | NOT NULL, DEFAULT 0 | Sort order |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_plan_items_user_id` on `user_id`
- `idx_plan_items_plan_id` on `plan_id`
- `idx_plan_items_plan_sort` on `(plan_id, sort_order)`

**RLS Policies:**
- Users can view/insert/update/delete their own plan items
- Service role can bypass RLS

---

#### 1.1.6 `plan_evaluations` Table
3-month evaluations for care plans.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Evaluation ID |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner user ID |
| `plan_id` | UUID | NOT NULL, REFERENCES plans(id) ON DELETE CASCADE | Plan ID |
| `evaluation_slot` | INTEGER | NOT NULL | Evaluation slot number (1, 2, ...) |
| `evaluation_date` | DATE | NOT NULL | Evaluation date |
| `result` | TEXT | NOT NULL, DEFAULT 'NONE', CHECK ('CIRCLE', 'CHECK', 'NONE') | Evaluation result |
| `note` | TEXT | NULLABLE | Evaluation note |
| `decided_by` | TEXT | NULLABLE | Decision method ('AUTO' or 'MANUAL') |
| `source_soap_record_id` | UUID | NULLABLE | Source SOAP record ID (future link) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Constraints:**
- `UNIQUE (plan_id, evaluation_slot)` - One evaluation per slot per plan

**Indexes:**
- `idx_plan_evaluations_user_id` on `user_id`
- `idx_plan_evaluations_plan_id` on `plan_id`
- `idx_plan_evaluations_plan_slot` on `(plan_id, evaluation_slot)`

**RLS Policies:**
- Users can view/insert/update/delete their own evaluations
- Service role can bypass RLS

---

#### 1.1.7 `plan_hospitalizations` Table
Hospitalization records for care plans.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Hospitalization ID |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner user ID |
| `plan_id` | UUID | NOT NULL, REFERENCES plans(id) ON DELETE CASCADE | Plan ID |
| `hospitalized_at` | DATE | NOT NULL | Hospitalization date |
| `note` | TEXT | NULLABLE | Hospitalization note |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_plan_hospitalizations_user_id` on `user_id`
- `idx_plan_hospitalizations_plan_id` on `plan_id`

**RLS Policies:**
- Users can view/insert/update/delete their own hospitalizations
- Service role can bypass RLS

---

#### 1.1.8 `reports` Table (精神科訪問看護報告書)
Monthly reports.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Report ID |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner user ID |
| `patient_id` | UUID | NOT NULL, REFERENCES patients(id) ON DELETE CASCADE | Patient ID |
| `year_month` | TEXT | NOT NULL | Period in 'YYYY-MM' format |
| `period_start` | DATE | NOT NULL | Period start date |
| `period_end` | DATE | NOT NULL | Period end date |
| `disease_progress_text` | TEXT | NULLABLE | Disease progress (病状の経過) |
| `nursing_rehab_text` | TEXT | NULLABLE | Nursing/rehab content (看護・リハビリテーションの内容) |
| `family_situation_text` | TEXT | NULLABLE | Family situation (家庭状況) |
| `procedure_text` | TEXT | NULLABLE | Procedure/material info (処置 / 衛生材料（頻度・種類・サイズ）等及び必要量) |
| `monitoring_text` | TEXT | NULLABLE | Monitoring notes (特記すべき事項及びモニタリング) |
| `gaf_score` | INTEGER | NULLABLE | GAF score |
| `gaf_date` | DATE | NULLABLE | GAF date |
| `profession_text` | TEXT | DEFAULT '訪問した職種：看護師' | Profession text |
| `report_date` | DATE | DEFAULT CURRENT_DATE | Report date |
| `status` | TEXT | NOT NULL, DEFAULT 'DRAFT', CHECK ('DRAFT', 'FINAL') | Report status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Constraints:**
- `CHECK (period_end >= period_start)` - End date must be >= start date
- `UNIQUE (user_id, patient_id, year_month)` - One report per patient per month

**Indexes:**
- `idx_reports_user_id` on `user_id`
- `idx_reports_patient_id` on `patient_id`
- `idx_reports_patient_year_month` on `(patient_id, year_month)`
- `idx_reports_year_month` on `year_month`
- `idx_reports_status` on `status`

**RLS Policies:**
- Users can view/insert/update/delete their own reports
- Service role can bypass RLS

---

#### 1.1.9 `report_visit_marks` Table
Calendar visit marks for monthly reports.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Mark ID |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner user ID |
| `report_id` | UUID | NOT NULL, REFERENCES reports(id) ON DELETE CASCADE | Report ID |
| `visit_date` | DATE | NOT NULL | Visit date |
| `mark` | TEXT | NOT NULL, CHECK ('CIRCLE', 'TRIANGLE', 'DOUBLE_CIRCLE', 'SQUARE', 'CHECK') | Mark type |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Constraints:**
- `UNIQUE (report_id, visit_date, mark)` - Unique mark per date per report

**Indexes:**
- `idx_report_visit_marks_user_id` on `user_id`
- `idx_report_visit_marks_report_id` on `report_id`
- `idx_report_visit_marks_visit_date` on `visit_date`
- `idx_report_visit_marks_report_visit` on `(report_id, visit_date)`

**RLS Policies:**
- Users can view/insert/update/delete their own visit marks
- Service role can bypass RLS

---

#### 1.1.10 `org_settings` Table
Organization settings for PDF footer.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Setting ID |
| `user_id` | UUID | NOT NULL, UNIQUE, REFERENCES auth.users(id) ON DELETE CASCADE | Owner user ID (one per user) |
| `station_name` | TEXT | NULLABLE | Station name |
| `station_address` | TEXT | NULLABLE | Station address |
| `planner_name` | TEXT | NULLABLE | Planner name (for plans) |
| `admin_name` | TEXT | NULLABLE | Admin name (for reports) |
| `profession_text` | TEXT | DEFAULT varies | Profession text |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_org_settings_user_id` on `user_id`

**RLS Policies:**
- Users can view/insert/update/delete their own settings
- Service role can bypass RLS

---

### 1.2 Database Relationships

```
auth.users (1) ──< (1) profiles
auth.users (1) ──< (many) patients
auth.users (1) ──< (many) soap_records
auth.users (1) ──< (many) plans
auth.users (1) ──< (many) reports
auth.users (1) ──< (1) org_settings

patients (1) ──< (many) soap_records
patients (1) ──< (many) plans
patients (1) ──< (many) reports

plans (1) ──< (many) plan_items
plans (1) ──< (many) plan_evaluations
plans (1) ──< (many) plan_hospitalizations

reports (1) ──< (many) report_visit_marks
```

---

### 1.3 Helper Functions

**Location:** `supabase/migrations/20231225000003_create_helper_functions.sql`

- `is_admin(uid UUID)` - Returns true if user is approved admin
- `is_approved(uid UUID)` - Returns true if user is approved
- `get_user_role(uid UUID)` - Returns user's role
- `get_user_status(uid UUID)` - Returns user's status

---

### 1.4 Triggers

- **Profile Creation Trigger:** Automatically creates profile when user signs up
- **Updated At Triggers:** Automatically update `updated_at` timestamp on all tables

---

## 2. Screen List / Screen Transition Documents

### 2.1 Authentication Screens

#### 2.1.1 Landing Page
- **Route:** `/`
- **File:** `src/app/page.jsx`
- **Component:** `src/views/Landing.jsx`
- **Description:** Public landing page with application introduction
- **Access:** Public (no authentication required)

#### 2.1.2 Login Page
- **Route:** `/login`
- **File:** `src/app/(auth)/login/page.jsx`
- **Component:** `src/views/pages/Login.jsx`
- **Description:** User login with email/password, Google OAuth, and Microsoft OAuth
- **Access:** Public (unauthenticated users)
- **Transitions:**
  - On successful login → Redirects based on profile status:
    - `status='pending'` → `/pending-approval`
    - `status='approved'` + `role='admin'` → `/admin/approvals`
    - `status='approved'` + `role='nurse'` → `/dashboard/default`

#### 2.1.3 Register Page
- **Route:** `/register`
- **File:** `src/app/(auth)/register/page.jsx`
- **Description:** User registration form
- **Access:** Public (unauthenticated users)
- **Transitions:**
  - On successful registration → `/pending-approval`

#### 2.1.4 Pending Approval Page
- **Route:** `/pending-approval`
- **File:** `src/app/(auth)/pending-approval/page.jsx`
- **Description:** Waiting page for users with `status='pending'`
- **Access:** Authenticated users with `status='pending'`
- **Features:**
  - Displays user email and status
  - Shows waiting message in Japanese
  - Logout button

#### 2.1.5 OAuth Callback Page
- **Route:** `/auth/callback`
- **File:** `src/app/(auth)/auth/callback/page.jsx`
- **Description:** Handles OAuth redirects from Google/Microsoft
- **Access:** Public (OAuth callback)
- **Transitions:**
  - On successful OAuth → Checks profile status and redirects accordingly

---

### 2.2 Dashboard Screens

All dashboard screens are protected by `AuthGuard` (requires authentication + approved status).

#### 2.2.1 Dashboard Home
- **Route:** `/dashboard/default`
- **File:** `src/app/(dashboard)/dashboard/default/page.jsx`
- **Menu:** ダッシュボード
- **Icon:** `ph ph-house-line`
- **Description:** Main dashboard overview
- **Access:** All approved users

#### 2.2.2 Patients List
- **Route:** `/patients`
- **File:** `src/app/(dashboard)/patients/page.jsx`
- **Menu:** 利用者基本情報
- **Icon:** `ph ph-user`
- **Description:** List and manage patients (利用者)
- **Access:** All approved users
- **Transitions:**
  - Click patient → `/patients/[patientId]/visit-records` or `/patients/[patientId]/plans`

#### 2.2.3 Patient Detail - Visit Records
- **Route:** `/patients/[patientId]/visit-records`
- **File:** `src/app/(dashboard)/patients/[patient_id]/visit-records/page.jsx`
- **Description:** View visit records for a specific patient
- **Access:** All approved users

#### 2.2.4 Patient Detail - Plans
- **Route:** `/patients/[patientId]/plans`
- **File:** `src/app/(dashboard)/patients/[patient_id]/plans/page.jsx`
- **Description:** View care plans for a specific patient
- **Access:** All approved users

#### 2.2.5 Visit Records (AI)
- **Route:** `/ai?tab=soap`
- **File:** `src/app/(dashboard)/ai/page.jsx`
- **Component:** `src/views/ai/AIPageClient.jsx`
- **Menu:** 訪問記録
- **Icon:** `ph ph-notebook`
- **Description:** AI-powered SOAP note generation and visit records management
- **Access:** All approved users
- **Features:**
  - Tab navigation: SOAP, Plan, Records
  - Generate SOAP notes using AI
  - View and manage visit records
- **Transitions:**
  - Click record → `/ai/records/[id]` (record detail)

#### 2.2.6 Visit Record Detail
- **Route:** `/ai/records/[id]`
- **File:** `src/app/(dashboard)/ai/records/[id]/page.jsx`
- **Description:** View detailed visit record with SOAP output
- **Access:** All approved users
- **Features:**
  - View full SOAP note
  - Generate PDF report
  - Edit record

#### 2.2.7 Plans List
- **Route:** `/plans`
- **File:** `src/app/(dashboard)/plans/page.jsx`
- **Menu:** 計画書
- **Icon:** `ph ph-file-text`
- **Description:** List and manage care plans (訪問看護計画書)
- **Access:** All approved users
- **Transitions:**
  - Create new → `/plans/new`
  - Edit plan → `/plans/[planId]/edit`

#### 2.2.8 Create Plan
- **Route:** `/plans/new`
- **File:** `src/app/(dashboard)/plans/new/page.jsx`
- **Description:** Create new care plan
- **Access:** All approved users

#### 2.2.9 Edit Plan
- **Route:** `/plans/[planId]/edit`
- **File:** `src/app/(dashboard)/plans/[planId]/edit/page.jsx`
- **Description:** Edit existing care plan
- **Access:** All approved users

#### 2.2.10 Reports List
- **Route:** `/reports`
- **File:** `src/app/(dashboard)/reports/page.jsx`
- **Menu:** 報告書
- **Icon:** `ph ph-user-circle-plus`
- **Description:** List and manage monthly reports (精神科訪問看護報告書)
- **Access:** All approved users
- **Transitions:**
  - Edit report → `/reports/[reportId]/edit`

#### 2.2.11 Edit Report
- **Route:** `/reports/[reportId]/edit`
- **File:** `src/app/(dashboard)/reports/[reportId]/edit/page.jsx`
- **Description:** Edit monthly report
- **Access:** All approved users

#### 2.2.12 Calendar
- **Route:** `/calendar`
- **File:** `src/app/(dashboard)/calendar/page.jsx`
- **Menu:** カレンダー
- **Icon:** `ph ph-calendar`
- **Description:** Calendar view of visits and appointments
- **Access:** All approved users

#### 2.2.13 Profile
- **Route:** `/profile`
- **File:** `src/app/(dashboard)/profile/page.jsx`
- **Menu:** プロフィール
- **Icon:** `ph ph-user`
- **Description:** User profile management
- **Access:** All approved users

---

### 2.3 Admin Screens

All admin screens are protected by `AdminGuard` (requires admin role + approved status).

#### 2.3.1 Admin Approvals
- **Route:** `/admin/approvals`
- **File:** `src/app/(dashboard)/admin/approvals/page.jsx`
- **Menu:** 承認待ちユーザー (Admin only)
- **Icon:** `ti ti-user-check`
- **Description:** Approve or reject pending users
- **Access:** Admin users only
- **Features:**
  - List pending users
  - Approve/Reject buttons
  - Calls Edge Function `admin-approve-user`

#### 2.3.2 Admin Users
- **Route:** `/admin/users`
- **File:** `src/app/(dashboard)/admin/users/page.jsx`
- **Menu:** ユーザー管理 (Admin only)
- **Icon:** `ti ti-users`
- **Description:** Manage all users
- **Access:** Admin users only
- **Features:**
  - List all users
  - Search by name/email
  - Filter by status and role
  - Change status (approve/reject/re-approve)
  - Change role (admin/nurse)

---

### 2.4 Screen Transition Flow

```
┌─────────────────┐
│  Landing Page   │
│       (/)        │
└────────┬────────┘
         │
         ├──→ Login (/login)
         │         │
         │         ├──→ Pending Approval (/pending-approval) [status='pending']
         │         │
         │         ├──→ Admin Approvals (/admin/approvals) [admin + approved]
         │         │
         │         └──→ Dashboard (/dashboard/default) [nurse + approved]
         │
         └──→ Register (/register)
                   │
                   └──→ Pending Approval (/pending-approval)

Dashboard Flow:
┌──────────────────┐
│  Dashboard Home  │
└────────┬─────────┘
         │
         ├──→ Patients (/patients)
         │         │
         │         ├──→ Patient Visit Records (/patients/[id]/visit-records)
         │         │
         │         └──→ Patient Plans (/patients/[id]/plans)
         │
         ├──→ Visit Records (/ai?tab=soap)
         │         │
         │         └──→ Record Detail (/ai/records/[id])
         │
         ├──→ Plans (/plans)
         │         │
         │         ├──→ Create Plan (/plans/new)
         │         │
         │         └──→ Edit Plan (/plans/[id]/edit)
         │
         ├──→ Reports (/reports)
         │         │
         │         └──→ Edit Report (/reports/[id]/edit)
         │
         ├──→ Calendar (/calendar)
         │
         └──→ Profile (/profile)

Admin Flow:
┌──────────────────┐
│ Admin Approvals  │
└────────┬─────────┘
         │
         └──→ Admin Users (/admin/users)
```

---

## 3. Implemented Format-Related Data

### 3.1 PDF Templates

#### 3.1.1 Visit Report Template
- **File:** `src/backend/templates/visit_report.html`
- **CSS:** `src/backend/templates/pdf_report.css`
- **Format:** 精神科訪問看護記録書Ⅱ
- **Size:** A4
- **Fonts:** IPAexGothic, Hiragino Kaku Gothic ProN, Meiryo
- **Margins:** 15mm
- **Sections:**
  - Patient information (利用者名, 主疾患)
  - Visit information (訪問日, 訪問時間)
  - Nurse information (看護師名)
  - Chief complaint (主訴)
  - Daily living (食生活・清潔・排泄・睡眠・生活リズム・整頓)
  - Mental state (精神状態)
  - Medication status (服薬等の状況)
  - Work/interpersonal (作業・対人関係)
  - Nursing content (実施した看護内容)
  - Notes (備考)
  - GAF score (optional)
  - Next visit date (次回訪問予定日)

#### 3.1.2 Monthly Report Template
- **File:** `src/backend/templates/monthly_report.html`
- **CSS:** `src/backend/templates/pdf_report.css`
- **Format:** 精神科訪問看護報告書
- **Size:** A4
- **Fonts:** IPAexGothic, Hiragino Kaku Gothic ProN, Meiryo
- **Margins:** 15mm
- **Sections:**
  - Patient information
  - Report period (year/month)
  - Disease progress (病状の経過)
  - Nursing/rehab content (看護・リハビリテーションの内容)
  - Family situation (家庭状況)
  - Procedure/material info (処置 / 衛生材料)
  - Monitoring notes (特記すべき事項及びモニタリング)
  - GAF score and date
  - Visit calendar with marks
  - Footer (organization info)

#### 3.1.3 Care Plan Template
- **File:** `src/backend/templates/plan.html`
- **CSS:** `src/backend/templates/plan.css`
- **Format:** 訪問看護計画書
- **Size:** A4
- **Sections:**
  - Patient information
  - Plan period (start/end dates)
  - Long-term goal (看護の目標)
  - Short-term goal (短期目標)
  - Nursing policy (看護援助の方針)
  - Patient/family wishes (患者様とご家族の希望)
  - Structured items (観察項目・援助内容)
  - Procedure information (if applicable)
  - 3-month evaluations
  - Footer (organization info)

#### 3.1.4 Report Template (Alternative)
- **File:** `src/backend/templates/report.html`
- **CSS:** `src/backend/templates/report.css`
- **Description:** Alternative report template format

#### 3.1.5 Visit Record Template
- **File:** `src/backend/templates/visit_record.html`
- **Description:** Visit record display template

---

### 3.2 Data Format Structures

#### 3.2.1 SOAP Output Format (JSONB)
Stored in `soap_records.soap_output`:

```json
{
  "S": {
    "text": "主観的情報",
    "subsections": []
  },
  "O": {
    "text": "客観的情報",
    "subsections": []
  },
  "A": {
    "text": "評価",
    "subsections": [
      {
        "title": "症状推移",
        "content": "..."
      },
      {
        "title": "背景要因",
        "content": "..."
      },
      {
        "title": "リスク要約",
        "content": "..."
      },
      {
        "title": "服薬アドヒアランス・怠薬リスク",
        "content": "..."
      }
    ]
  },
  "P": {
    "text": "計画",
    "subsections": [
      {
        "title": "本日実施した援助",
        "content": "..."
      },
      {
        "title": "次回以降の方針",
        "content": "..."
      }
    ]
  }
}
```

#### 3.2.2 Plan Output Format (JSONB)
Stored in `soap_records.plan_output`:

```json
{
  "long_term_goal": "長期目標",
  "short_term_goals": [
    {
      "goal": "短期目標1",
      "observation": "観察項目",
      "assistance": "援助内容"
    }
  ],
  "nursing_policy": "看護援助の方針",
  "patient_family_wish": "患者様とご家族の希望"
}
```

#### 3.2.3 Visit Mark Types
Used in `report_visit_marks.mark`:
- `CIRCLE` (○)
- `TRIANGLE` (△)
- `DOUBLE_CIRCLE` (◎)
- `SQUARE` (□)
- `CHECK` (✔︎)

#### 3.2.4 Evaluation Result Types
Used in `plan_evaluations.result`:
- `CIRCLE` (◯)
- `CHECK` (☑️)
- `NONE`

#### 3.2.5 Date Formats
- **Database:** ISO 8601 (YYYY-MM-DD)
- **Display:** Japanese format (YYYY年MM月DD日)
- **Time:** HH:MM format
- **Year-Month:** YYYY-MM format (e.g., '2026-01')

---

### 3.3 PDF Generation Service

**Location:** `src/backend/services/pdf_service.py`

**Features:**
- Maps SOAP data to official Japanese medical form format
- Generates PDFs using Jinja2 templates and WeasyPrint
- Intelligent data mapping (not raw SOAP dumps)
- Uploads to AWS S3
- Generates presigned URLs for secure downloads

**API Endpoints:**
- `POST /pdf/visit-report/{visit_id}` - Generate visit report PDF
- `POST /pdf/monthly-report/{patient_id}?year=YYYY&month=M` - Generate monthly report PDF

---

## 4. Configuration Information

### 4.1 Frontend Configuration

#### 4.1.1 Environment Variables (.env.local)

```env
# Supabase Configuration (Public - Safe for frontend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

**Location:** Project root (`.env.local`)

**Security Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never include secrets here.

---

#### 4.1.2 Next.js Configuration

**File:** `next.config.mjs`

```javascript
const nextConfig = {
  /* config options here */
};

export default nextConfig;
```

**Current Configuration:** Minimal configuration (default Next.js settings)

---

#### 4.1.3 Package Dependencies

**File:** `package.json`

**Key Dependencies:**
- `next`: ^15.5.9 - Next.js framework
- `react`: 19.1.0 - React library
- `react-dom`: 19.1.0 - React DOM
- `@supabase/supabase-js`: ^2.89.0 - Supabase client
- `swr`: 2.3.4 - Data fetching
- `typescript`: ^5.9.3 - TypeScript support
- `apexcharts`: 5.3.1 - Charts library
- `tailwindcss`: 4.1.11 - CSS framework

**Dev Dependencies:**
- `eslint`: ^9.39.2 - Linting
- `prettier`: 3.6.2 - Code formatting
- `sass`: 1.71.1 - Sass support

---

#### 4.1.4 TypeScript Configuration

**File:** `tsconfig.json`

TypeScript configuration for type checking and compilation.

---

### 4.2 Backend Configuration

#### 4.2.1 Environment Variables (.env)

**File:** `src/backend/.env`

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-xxxx
OPENAI_MODEL=gpt-4.1-mini

# Supabase Configuration
SUPABASE_PROJECT_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-dashboard
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# CORS Configuration (optional)
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://*.ngrok-free.app

# Server Configuration (optional)
HOST=0.0.0.0
PORT=8000
RELOAD=false

# AWS S3 Configuration (for PDF storage)
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=ap-northeast-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_PRESIGNED_URL_EXPIRATION=3600
```

**Security Note:** Never commit `.env` files. The `SUPABASE_SERVICE_ROLE_KEY` has admin privileges.

---

#### 4.2.2 Backend Settings Class

**File:** `src/backend/config.py`

**Configuration Class:** `Settings`

**Properties:**
- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_MODEL` - OpenAI model (default: "gpt-4.1-mini")
- `SUPABASE_PROJECT_URL` - Supabase project URL
- `SUPABASE_JWT_SECRET` - Supabase JWT secret
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `allowed_origins` - CORS allowed origins (property)
- `API_TITLE` - API title
- `API_DESCRIPTION` - API description
- `API_VERSION` - API version
- `HOST` - Server host (default: "0.0.0.0")
- `PORT` - Server port (default: 8000)
- `RELOAD` - Auto-reload flag (default: false)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (default: "ap-northeast-1")
- `AWS_S3_BUCKET_NAME` - S3 bucket name
- `AWS_S3_PRESIGNED_URL_EXPIRATION` - Presigned URL expiration in seconds (default: 3600)

**Validation:** `validate()` method checks required settings.

---

#### 4.2.3 Backend Dependencies

**File:** `src/backend/requirements.txt`

Key dependencies include:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `openai` - OpenAI API client
- `supabase` - Supabase client
- `python-dotenv` - Environment variable loading
- `jinja2` - Template engine
- `weasyprint` - PDF generation
- `boto3` - AWS SDK

---

### 4.3 Supabase Configuration

#### 4.3.1 Edge Functions Secrets

**Set via Supabase CLI:**

```bash
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

**Location:** Supabase project secrets (not in code)

**Security Note:** These secrets are only accessible to Edge Functions, not the frontend.

---

#### 4.3.2 Edge Functions

**Location:** `supabase/functions/`

**Available Functions:**
- `admin-approve-user` - Approve/reject users
- `admin-list-users` - List all users with filters
- `admin-list-pending` - List pending approval users
- `apply-nurse` - Apply for nurse role (if exists)

**Shared Utilities:**
- `_shared/cors.ts` - CORS headers
- `_shared/supabase.ts` - Supabase client creation
- `_shared/auth.ts` - Auth validation helpers

---

### 4.4 Database Configuration

#### 4.4.1 Migration Files

**Location:** `supabase/migrations/`

**Migration Order:**
1. `20231225000001_create_profiles_table.sql` - Create profiles table
2. `20231225000002_create_profile_trigger.sql` - Profile creation trigger
3. `20231225000003_create_helper_functions.sql` - Helper functions
4. `20231225000004_create_profiles_rls_policies.sql` - RLS policies
5. `20231225000005_update_soap_records_rls.sql` - SOAP records RLS
6. `20231225000006_backfill_existing_users.sql` - Backfill existing users
7. `20231225000007_hotfix_profile_insert_policy.sql` - Hotfix
8. `20240104000001_add_status_to_soap_records.sql` - Add status to SOAP records
9. `20240105000001_create_patients_table.sql` - Create patients table
10. `20240105000003_update_soap_records_add_patient_id.sql` - Add patient_id to SOAP records
11. `20240106000001_patient_entity_implementation.sql` - Patient entity documentation
12. `20240107000001_create_plans_tables.sql` - Create plans tables
13. `20240108000001_update_soap_records_patient_id_cascade.sql` - Update cascade
14. `20240109000001_create_reports_tables.sql` - Create reports tables

**Deployment:**
```bash
supabase db push
```

---

### 4.5 API Configuration

#### 4.5.1 API Endpoints

**Base URL:** Configured via `NEXT_PUBLIC_BACKEND_URL` (frontend) or `HOST:PORT` (backend)

**Authentication:** All protected endpoints require Supabase JWT token in `Authorization` header:
```
Authorization: Bearer <supabase-access-token>
```

**Available Routers:**
- Health check routes (`/health`)
- SOAP generation routes (`/generate`)
- SOAP records routes (`/records`, `/records/{id}`)
- PDF generation routes (`/pdf/visit-report/{id}`, `/pdf/monthly-report/{id}`)
- Patient CRUD routes (`/patients`)
- Care plan routes (`/care-plans`)
- Plans routes (`/plans`)
- Reports routes (`/reports`)

---

### 4.6 Security Configuration

#### 4.6.1 Row Level Security (RLS)

All tables have RLS enabled with policies:
- Users can only access their own records
- Service role can bypass RLS (for backend operations)
- Admin users have broader access (via helper functions)

#### 4.6.2 CORS Configuration

**Backend:** Configured via `ALLOWED_ORIGINS` environment variable
- Default (development): `["*"]` (allows all origins)
- Production: Comma-separated list of allowed origins

#### 4.6.3 Authentication Flow

1. User authenticates via Supabase Auth (email/password or OAuth)
2. Frontend receives JWT token
3. Token included in API requests via `Authorization` header
4. Backend validates token using `SUPABASE_JWT_SECRET`
5. User ID extracted from token for RLS enforcement

---

### 4.7 Deployment Configuration

#### 4.7.1 Frontend Deployment

**Platform:** Vercel (recommended) or similar Next.js hosting

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BACKEND_URL`

#### 4.7.2 Backend Deployment

**Platform:** Any Python hosting (AWS, GCP, Azure, Railway, etc.)

**Environment Variables:**
- All variables from `src/backend/.env`
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set securely

#### 4.7.3 Supabase Deployment

**Database Migrations:**
```bash
supabase db push
```

**Edge Functions:**
```bash
supabase functions deploy admin-approve-user
supabase functions deploy admin-list-users
supabase functions deploy admin-list-pending
```

**Secrets:**
```bash
supabase secrets set KEY=value
```

---

## 5. Additional Notes

### 5.1 Language

- **Primary Language:** Japanese (日本語)
- All UI text is in Japanese
- Database comments include Japanese descriptions
- PDF templates use Japanese medical terminology

### 5.2 Data Flow

1. **User Registration:** Creates auth.users → Trigger creates profiles with `status='pending'`
2. **Admin Approval:** Admin updates profile `status='approved'`
3. **SOAP Generation:** User inputs S/O → AI generates SOAP → Saved to `soap_records`
4. **Patient Management:** Users create/manage patients → Linked to visit records
5. **Plan Creation:** Users create care plans → Linked to patients
6. **Report Generation:** Users create monthly reports → Linked to patients and visits

### 5.3 Future Considerations

- Migration to remove `patient_name` and `diagnosis` from `soap_records` (use `patient_id` only)
- Enhanced AI features for report summarization
- PDF caching to avoid regeneration
- Batch PDF generation
- Custom template support

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-XX  
**Maintained By:** Development Team
