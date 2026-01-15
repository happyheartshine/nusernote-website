from pydantic import BaseModel, Field


class PatientCreateRequest(BaseModel):
    """Request body for creating a patient."""

    name: str = Field(..., description="利用者名")
    age: int | None = Field(None, description="年齢")
    gender: str | None = Field(None, description="性別")
    primary_diagnosis: str | None = Field(None, description="主疾患")
    individual_notes: str | None = Field(None, description="個別メモ")
    status: str = Field(default="active", description="ステータス (active/inactive/archived)")
    
    # Additional patient information
    birth_date: str | None = Field(None, description="生年月日 (YYYY-MM-DD)")
    birth_date_year: int | None = Field(None, description="生年月日(年)")
    birth_date_month: int | None = Field(None, description="生年月日(月)")
    birth_date_day: int | None = Field(None, description="生年月日(日)")
    address: str | None = Field(None, description="住所")
    contact: str | None = Field(None, description="連絡先")
    
    # Key Person Information
    key_person_name: str | None = Field(None, description="キーパーソン氏名")
    key_person_relationship: str | None = Field(None, description="キーパーソン続柄")
    key_person_address: str | None = Field(None, description="キーパーソン住所")
    key_person_contact1: str | None = Field(None, description="キーパーソン連絡先1")
    key_person_contact2: str | None = Field(None, description="キーパーソン連絡先2")
    
    # Medical Information
    medical_history: str | None = Field(None, description="既往歴")
    current_illness_history: str | None = Field(None, description="現病歴")
    family_structure: str | None = Field(None, description="家族構成")
    
    # Primary Doctor Information
    doctor_name: str | None = Field(None, description="主治医氏名")
    hospital_name: str | None = Field(None, description="医療機関名")
    hospital_address: str | None = Field(None, description="医療機関所在地")
    hospital_phone: str | None = Field(None, description="医療機関電話番号")
    
    # Initial Visit Date
    initial_visit_date: str | None = Field(None, description="初回訪問年月日 (YYYY-MM-DD)")
    initial_visit_year: int | None = Field(None, description="初回訪問年")
    initial_visit_month: int | None = Field(None, description="初回訪問月")
    initial_visit_day: int | None = Field(None, description="初回訪問日")
    initial_visit_day_of_week: str | None = Field(None, description="初回訪問曜日")
    initial_visit_start_hour: int | None = Field(None, description="初回訪問開始時")
    initial_visit_start_minute: int | None = Field(None, description="初回訪問開始分")
    initial_visit_end_hour: int | None = Field(None, description="初回訪問終了時")
    initial_visit_end_minute: int | None = Field(None, description="初回訪問終了分")


class PatientUpdateRequest(BaseModel):
    """Request body for updating a patient."""

    name: str | None = Field(None, description="利用者名")
    age: int | None = Field(None, description="年齢")
    gender: str | None = Field(None, description="性別")
    primary_diagnosis: str | None = Field(None, description="主疾患")
    individual_notes: str | None = Field(None, description="個別メモ")
    status: str | None = Field(None, description="ステータス (active/inactive/archived)")
    
    # Additional patient information
    birth_date: str | None = Field(None, description="生年月日 (YYYY-MM-DD)")
    birth_date_year: int | None = Field(None, description="生年月日(年)")
    birth_date_month: int | None = Field(None, description="生年月日(月)")
    birth_date_day: int | None = Field(None, description="生年月日(日)")
    address: str | None = Field(None, description="住所")
    contact: str | None = Field(None, description="連絡先")
    
    # Key Person Information
    key_person_name: str | None = Field(None, description="キーパーソン氏名")
    key_person_relationship: str | None = Field(None, description="キーパーソン続柄")
    key_person_address: str | None = Field(None, description="キーパーソン住所")
    key_person_contact1: str | None = Field(None, description="キーパーソン連絡先1")
    key_person_contact2: str | None = Field(None, description="キーパーソン連絡先2")
    
    # Medical Information
    medical_history: str | None = Field(None, description="既往歴")
    current_illness_history: str | None = Field(None, description="現病歴")
    family_structure: str | None = Field(None, description="家族構成")
    
    # Primary Doctor Information
    doctor_name: str | None = Field(None, description="主治医氏名")
    hospital_name: str | None = Field(None, description="医療機関名")
    hospital_address: str | None = Field(None, description="医療機関所在地")
    hospital_phone: str | None = Field(None, description="医療機関電話番号")
    
    # Initial Visit Date
    initial_visit_date: str | None = Field(None, description="初回訪問年月日 (YYYY-MM-DD)")
    initial_visit_year: int | None = Field(None, description="初回訪問年")
    initial_visit_month: int | None = Field(None, description="初回訪問月")
    initial_visit_day: int | None = Field(None, description="初回訪問日")
    initial_visit_day_of_week: str | None = Field(None, description="初回訪問曜日")
    initial_visit_start_hour: int | None = Field(None, description="初回訪問開始時")
    initial_visit_start_minute: int | None = Field(None, description="初回訪問開始分")
    initial_visit_end_hour: int | None = Field(None, description="初回訪問終了時")
    initial_visit_end_minute: int | None = Field(None, description="初回訪問終了分")


class PatientResponse(BaseModel):
    """Response model for a patient."""

    id: str = Field(..., description="Patient ID")
    name: str = Field(..., description="利用者名")
    age: int | None = Field(None, description="年齢")
    gender: str | None = Field(None, description="性別")
    primary_diagnosis: str | None = Field(None, description="主疾患")
    individual_notes: str | None = Field(None, description="個別メモ")
    status: str = Field(..., description="ステータス")
    created_at: str = Field(..., description="作成日時")
    updated_at: str = Field(..., description="更新日時")
    
    # Additional patient information
    birth_date: str | None = Field(None, description="生年月日")
    birth_date_year: int | None = Field(None, description="生年月日(年)")
    birth_date_month: int | None = Field(None, description="生年月日(月)")
    birth_date_day: int | None = Field(None, description="生年月日(日)")
    address: str | None = Field(None, description="住所")
    contact: str | None = Field(None, description="連絡先")
    
    # Key Person Information
    key_person_name: str | None = Field(None, description="キーパーソン氏名")
    key_person_relationship: str | None = Field(None, description="キーパーソン続柄")
    key_person_address: str | None = Field(None, description="キーパーソン住所")
    key_person_contact1: str | None = Field(None, description="キーパーソン連絡先1")
    key_person_contact2: str | None = Field(None, description="キーパーソン連絡先2")
    
    # Medical Information
    medical_history: str | None = Field(None, description="既往歴")
    current_illness_history: str | None = Field(None, description="現病歴")
    family_structure: str | None = Field(None, description="家族構成")
    
    # Primary Doctor Information
    doctor_name: str | None = Field(None, description="主治医氏名")
    hospital_name: str | None = Field(None, description="医療機関名")
    hospital_address: str | None = Field(None, description="医療機関所在地")
    hospital_phone: str | None = Field(None, description="医療機関電話番号")
    
    # Initial Visit Date
    initial_visit_date: str | None = Field(None, description="初回訪問年月日")
    initial_visit_year: int | None = Field(None, description="初回訪問年")
    initial_visit_month: int | None = Field(None, description="初回訪問月")
    initial_visit_day: int | None = Field(None, description="初回訪問日")
    initial_visit_day_of_week: str | None = Field(None, description="初回訪問曜日")
    initial_visit_start_hour: int | None = Field(None, description="初回訪問開始時")
    initial_visit_start_minute: int | None = Field(None, description="初回訪問開始分")
    initial_visit_end_hour: int | None = Field(None, description="初回訪問終了時")
    initial_visit_end_minute: int | None = Field(None, description="初回訪問終了分")


class PatientsListResponse(BaseModel):
    """Response model for list of patients."""

    patients: list[PatientResponse] = Field(..., description="List of patients")


class CarePlanCreateRequest(BaseModel):
    """Request body for creating a care plan."""

    patient_id: str = Field(..., description="Patient ID")
    plan_output: dict = Field(..., description="看護計画出力データ (JSON)")
    start_date: str | None = Field(None, description="開始日 (YYYY-MM-DD)")
    end_date: str | None = Field(None, description="終了日 (YYYY-MM-DD)")
    status: str = Field(default="active", description="ステータス (active/inactive/completed)")
    notes: str | None = Field(None, description="メモ")


class CarePlanResponse(BaseModel):
    """Response model for a care plan."""

    id: str = Field(..., description="Care Plan ID")
    patient_id: str = Field(..., description="Patient ID")
    plan_output: dict = Field(..., description="看護計画出力データ (JSON)")
    start_date: str | None = Field(None, description="開始日")
    end_date: str | None = Field(None, description="終了日")
    status: str = Field(..., description="ステータス")
    notes: str | None = Field(None, description="メモ")
    created_at: str = Field(..., description="作成日時")
    updated_at: str = Field(..., description="更新日時")


class CarePlansListResponse(BaseModel):
    """Response model for list of care plans."""

    care_plans: list[CarePlanResponse] = Field(..., description="List of care plans")


class GenerateRequest(BaseModel):
    """Request body for /generate."""

    patient_id: str | None = Field(
        None,
        description="Patient ID (優先。指定時はuserName/diagnosisは無視)",
    )
    userName: str = Field(
        default="",
        description="利用者名 (patient_id未指定時のみ使用)",
    )
    diagnosis: str = Field(
        default="",
        description="主疾患 (patient_id未指定時のみ使用)",
    )
    nurses: list[str] = Field(
        default_factory=list,
        description="看護師名（複数選択可）",
    )
    visitDate: str = Field(
        default="",
        description="訪問日（YYYY-MM-DD形式）",
    )
    startTime: str = Field(
        default="",
        description="訪問開始時間（HH:MM形式）",
    )
    endTime: str = Field(
        default="",
        description="訪問終了時間（HH:MM形式）",
    )
    chiefComplaint: str = Field(
        default="",
        description="主訴（任意入力）",
    )
    sText: str = Field(
        default="",
        description="S（主観）",
    )
    oText: str = Field(
        default="",
        description="O（客観）",
    )


class GenerateResponse(BaseModel):
    """Successful response body."""

    output: str = Field(..., description="AI生成テキスト（SOAP＋看護計画）")


class ErrorResponse(BaseModel):
    """Error response payload."""

    error: str = Field(..., description="エラーメッセージ")


class SOAPRecordResponse(BaseModel):
    """Response model for a single SOAP record."""

    id: str = Field(..., description="Record ID")
    patient_id: str | None = Field(None, description="Patient ID")
    patient_name: str = Field(..., description="利用者名")
    visit_date: str = Field(..., description="訪問日 (YYYY-MM-DD)")
    chief_complaint: str | None = Field(None, description="主訴")
    created_at: str = Field(..., description="作成日時")
    diagnosis: str | None = Field(None, description="主疾患")
    start_time: str | None = Field(None, description="訪問開始時間")
    end_time: str | None = Field(None, description="訪問終了時間")
    plan_output: dict | None = Field(None, description="看護計画出力データ (JSON)")
    status: str = Field(default="draft", description="記録ステータス (draft/confirmed)")


class RecordsListResponse(BaseModel):
    """Response model for list of SOAP records."""

    records: list[SOAPRecordResponse] = Field(..., description="List of SOAP records")
    total: int = Field(..., description="Total number of records")
    page: int = Field(..., description="Current page number (1-based)")
    page_size: int = Field(..., description="Number of records per page")
    total_pages: int = Field(..., description="Total number of pages")


class FullSOAPRecordResponse(BaseModel):
    """Response model for a single SOAP record with full SOAP and Plan data."""

    id: str = Field(..., description="Record ID")
    patient_id: str | None = Field(None, description="Patient ID")
    patient_name: str = Field(..., description="利用者名")
    visit_date: str = Field(..., description="訪問日 (YYYY-MM-DD)")
    chief_complaint: str | None = Field(None, description="主訴")
    created_at: str = Field(..., description="作成日時")
    diagnosis: str | None = Field(None, description="主疾患")
    start_time: str | None = Field(None, description="訪問開始時間")
    end_time: str | None = Field(None, description="訪問終了時間")
    nurses: list[str] = Field(default_factory=list, description="看護師名リスト")
    soap_output: dict = Field(..., description="SOAP出力データ (JSON)")
    plan_output: dict | None = Field(None, description="看護計画出力データ (JSON)")
    status: str = Field(default="draft", description="記録ステータス (draft/confirmed)")


class PDFGenerationResponse(BaseModel):
    """Response model for PDF generation endpoints."""

    pdf_url: str = Field(..., description="Presigned URL to download the generated PDF")
    s3_key: str = Field(..., description="S3 key where the PDF was uploaded")


class UpdateRecordRequest(BaseModel):
    """Request body for updating a SOAP record."""

    soap_output: dict | None = Field(None, description="Updated SOAP output data")
    plan_output: dict | None = Field(None, description="Updated plan output data")
    status: str | None = Field(None, description="Record status (draft/confirmed)")


# ============================================================================
# Plan (訪問看護計画書) Models
# ============================================================================

class PlanItemCreate(BaseModel):
    """Request body for creating/updating a plan item."""

    id: str | None = Field(None, description="Plan item ID (for updates)")
    item_key: str = Field(..., description="Item key (e.g. LONG_TERM, SHORT_TERM, POLICY)")
    label: str = Field(..., description="Display label")
    observation_text: str | None = Field(None, description="必要な観察項目")
    assistance_text: str | None = Field(None, description="援助内容")
    sort_order: int = Field(default=0, description="Sort order")


class PlanEvaluationCreate(BaseModel):
    """Request body for creating/updating a plan evaluation."""

    id: str | None = Field(None, description="Evaluation ID (for updates)")
    evaluation_slot: int = Field(..., description="Evaluation slot number (1, 2, ...)")
    evaluation_date: str = Field(..., description="Evaluation date (YYYY-MM-DD)")
    result: str = Field(default="NONE", description="Result: CIRCLE, CHECK, or NONE")
    note: str | None = Field(None, description="Evaluation note")


class PlanCreateRequest(BaseModel):
    """Request body for creating a plan."""

    title: str | None = Field(default="精神科訪問看護計画書", description="Plan title")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD)")
    long_term_goal: str | None = Field(None, description="看護の目標")
    short_term_goal: str | None = Field(None, description="短期目標")
    nursing_policy: str | None = Field(None, description="看護援助の方針")
    patient_family_wish: str | None = Field(None, description="患者様とご家族の希望")
    has_procedure: bool = Field(default=False, description="衛生材料等を要する処置の有無")
    procedure_content: str | None = Field(None, description="処置内容")
    material_details: str | None = Field(None, description="衛生材料（種類・サイズ）等")
    material_amount: str | None = Field(None, description="必要量")
    procedure_note: str | None = Field(None, description="備考")
    items: list[PlanItemCreate] | None = Field(None, description="Plan items")
    evaluations: list[PlanEvaluationCreate] | None = Field(None, description="Plan evaluations")


class PlanUpdateRequest(BaseModel):
    """Request body for updating a plan."""

    title: str | None = Field(None, description="Plan title")
    start_date: str | None = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: str | None = Field(None, description="End date (YYYY-MM-DD)")
    long_term_goal: str | None = Field(None, description="看護の目標")
    short_term_goal: str | None = Field(None, description="短期目標")
    nursing_policy: str | None = Field(None, description="看護援助の方針")
    patient_family_wish: str | None = Field(None, description="患者様とご家族の希望")
    has_procedure: bool | None = Field(None, description="衛生材料等を要する処置の有無")
    procedure_content: str | None = Field(None, description="処置内容")
    material_details: str | None = Field(None, description="衛生材料（種類・サイズ）等")
    material_amount: str | None = Field(None, description="必要量")
    procedure_note: str | None = Field(None, description="備考")
    status: str | None = Field(None, description="Status: ACTIVE, ENDED_BY_HOSPITALIZATION, CLOSED")
    items: list[PlanItemCreate] | None = Field(None, description="Plan items")
    evaluations: list[PlanEvaluationCreate] | None = Field(None, description="Plan evaluations")


class PlanHospitalizationCreate(BaseModel):
    """Request body for creating a hospitalization record."""

    hospitalized_at: str = Field(..., description="Hospitalization date (YYYY-MM-DD)")
    note: str | None = Field(None, description="Hospitalization note")


class PlanItemResponse(BaseModel):
    """Response model for a plan item."""

    id: str = Field(..., description="Plan item ID")
    plan_id: str = Field(..., description="Plan ID")
    item_key: str = Field(..., description="Item key")
    label: str = Field(..., description="Display label")
    observation_text: str | None = Field(None, description="必要な観察項目")
    assistance_text: str | None = Field(None, description="援助内容")
    sort_order: int = Field(..., description="Sort order")
    created_at: str = Field(..., description="Created at")
    updated_at: str = Field(..., description="Updated at")


class PlanEvaluationResponse(BaseModel):
    """Response model for a plan evaluation."""

    id: str = Field(..., description="Evaluation ID")
    plan_id: str = Field(..., description="Plan ID")
    evaluation_slot: int = Field(..., description="Evaluation slot number")
    evaluation_date: str = Field(..., description="Evaluation date (YYYY-MM-DD)")
    result: str = Field(..., description="Result: CIRCLE, CHECK, or NONE")
    note: str | None = Field(None, description="Evaluation note")
    decided_by: str | None = Field(None, description="How result was decided: AUTO or MANUAL")
    source_soap_record_id: str | None = Field(None, description="Source SOAP record ID")
    created_at: str = Field(..., description="Created at")
    updated_at: str = Field(..., description="Updated at")


class PlanHospitalizationResponse(BaseModel):
    """Response model for a plan hospitalization."""

    id: str = Field(..., description="Hospitalization ID")
    plan_id: str = Field(..., description="Plan ID")
    hospitalized_at: str = Field(..., description="Hospitalization date (YYYY-MM-DD)")
    note: str | None = Field(None, description="Hospitalization note")
    created_at: str = Field(..., description="Created at")


class PlanResponse(BaseModel):
    """Response model for a plan."""

    id: str = Field(..., description="Plan ID")
    patient_id: str = Field(..., description="Patient ID")
    title: str = Field(..., description="Plan title")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD)")
    long_term_goal: str | None = Field(None, description="看護の目標")
    short_term_goal: str | None = Field(None, description="短期目標")
    nursing_policy: str | None = Field(None, description="看護援助の方針")
    patient_family_wish: str | None = Field(None, description="患者様とご家族の希望")
    has_procedure: bool = Field(..., description="衛生材料等を要する処置の有無")
    procedure_content: str | None = Field(None, description="処置内容")
    material_details: str | None = Field(None, description="衛生材料（種類・サイズ）等")
    material_amount: str | None = Field(None, description="必要量")
    procedure_note: str | None = Field(None, description="備考")
    status: str = Field(..., description="Status: ACTIVE, ENDED_BY_HOSPITALIZATION, CLOSED")
    closed_at: str | None = Field(None, description="Closed at")
    closed_reason: str | None = Field(None, description="Closed reason")
    created_at: str = Field(..., description="Created at")
    updated_at: str = Field(..., description="Updated at")
    items: list[PlanItemResponse] = Field(default_factory=list, description="Plan items")
    evaluations: list[PlanEvaluationResponse] = Field(default_factory=list, description="Plan evaluations")
    hospitalizations: list[PlanHospitalizationResponse] = Field(default_factory=list, description="Hospitalizations")


class PlansListResponse(BaseModel):
    """Response model for list of plans."""

    plans: list[PlanResponse] = Field(..., description="List of plans")


# ============================================================================
# Report (精神科訪問看護報告書) Models
# ============================================================================

class ReportVisitMarkCreate(BaseModel):
    """Request body for creating/updating a visit mark."""

    visit_date: str = Field(..., description="Visit date (YYYY-MM-DD)")
    mark: str = Field(..., description="Mark type: CIRCLE, TRIANGLE, DOUBLE_CIRCLE, SQUARE, CHECK")


class ReportCreateRequest(BaseModel):
    """Request body for creating a report."""

    year_month: str | None = Field(None, description="Year-month in YYYY-MM format (alternative to period_start/period_end)")
    period_start: str | None = Field(None, description="Period start date (YYYY-MM-DD)")
    period_end: str | None = Field(None, description="Period end date (YYYY-MM-DD)")


class ReportUpdateRequest(BaseModel):
    """Request body for updating a report."""

    disease_progress_text: str | None = Field(None, description="病状の経過")
    nursing_rehab_text: str | None = Field(None, description="看護・リハビリテーションの内容")
    family_situation_text: str | None = Field(None, description="家庭状況")
    procedure_text: str | None = Field(None, description="処置 / 衛生材料（頻度・種類・サイズ）等及び必要量")
    monitoring_text: str | None = Field(None, description="特記すべき事項及びモニタリング")
    gaf_score: int | None = Field(None, description="GAF score")
    gaf_date: str | None = Field(None, description="GAF date (YYYY-MM-DD)")
    profession_text: str | None = Field(None, description="訪問した職種")
    report_date: str | None = Field(None, description="Report date (YYYY-MM-DD)")
    status: str | None = Field(None, description="Status: DRAFT or FINAL")
    visit_marks: list[ReportVisitMarkCreate] | None = Field(None, description="Visit marks to upsert")


class ReportRegenerateRequest(BaseModel):
    """Request body for regenerating report marks."""

    force: bool = Field(default=False, description="Force regenerate even if fields are already edited")


class ReportVisitMarkResponse(BaseModel):
    """Response model for a visit mark."""

    id: str = Field(..., description="Visit mark ID")
    report_id: str = Field(..., description="Report ID")
    visit_date: str = Field(..., description="Visit date (YYYY-MM-DD)")
    mark: str = Field(..., description="Mark type")
    created_at: str = Field(..., description="Created at")
    updated_at: str = Field(..., description="Updated at")


class ReportResponse(BaseModel):
    """Response model for a report."""

    id: str = Field(..., description="Report ID")
    patient_id: str = Field(..., description="Patient ID")
    year_month: str = Field(..., description="Year-month (YYYY-MM)")
    period_start: str = Field(..., description="Period start date")
    period_end: str = Field(..., description="Period end date")
    disease_progress_text: str | None = Field(None, description="病状の経過")
    nursing_rehab_text: str | None = Field(None, description="看護・リハビリテーションの内容")
    family_situation_text: str | None = Field(None, description="家庭状況")
    procedure_text: str | None = Field(None, description="処置 / 衛生材料（頻度・種類・サイズ）等及び必要量")
    monitoring_text: str | None = Field(None, description="特記すべき事項及びモニタリング")
    gaf_score: int | None = Field(None, description="GAF score")
    gaf_date: str | None = Field(None, description="GAF date")
    profession_text: str = Field(..., description="訪問した職種")
    report_date: str = Field(..., description="Report date")
    status: str = Field(..., description="Status: DRAFT or FINAL")
    created_at: str = Field(..., description="Created at")
    updated_at: str = Field(..., description="Updated at")
    visit_marks: list[ReportVisitMarkResponse] = Field(default_factory=list, description="Visit marks")


class ReportsListResponse(BaseModel):
    """Response model for list of reports."""

    reports: list[ReportResponse] = Field(..., description="List of reports")

