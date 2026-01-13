from pydantic import BaseModel, Field


class PatientCreateRequest(BaseModel):
    """Request body for creating a patient."""

    name: str = Field(..., description="利用者名")
    age: int | None = Field(None, description="年齢")
    gender: str | None = Field(None, description="性別")
    primary_diagnosis: str | None = Field(None, description="主疾患")
    individual_notes: str | None = Field(None, description="個別メモ")
    status: str = Field(default="active", description="ステータス (active/inactive/archived)")


class PatientUpdateRequest(BaseModel):
    """Request body for updating a patient."""

    name: str | None = Field(None, description="利用者名")
    age: int | None = Field(None, description="年齢")
    gender: str | None = Field(None, description="性別")
    primary_diagnosis: str | None = Field(None, description="主疾患")
    individual_notes: str | None = Field(None, description="個別メモ")
    status: str | None = Field(None, description="ステータス (active/inactive/archived)")


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


class VisitRecordCreateRequest(BaseModel):
    """Request body for creating a visit record."""

    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="患者名")
    gender: str | None = Field(None, description="性別 (male/female)")
    birth_date: str | None = Field(None, description="生年月日 (YYYY-MM-DD)")
    birth_date_year: int | None = Field(None, description="生年月日(年)")
    birth_date_month: int | None = Field(None, description="生年月日(月)")
    birth_date_day: int | None = Field(None, description="生年月日(日)")
    age: int | None = Field(None, description="年齢")
    patient_address: str | None = Field(None, description="住所")
    patient_contact: str | None = Field(None, description="連絡先")
    
    # Key Person
    key_person_name: str | None = Field(None, description="キーパーソン氏名")
    key_person_relationship: str | None = Field(None, description="キーパーソン続柄")
    key_person_address: str | None = Field(None, description="キーパーソン住所")
    key_person_contact1: str | None = Field(None, description="キーパーソン連絡先1")
    key_person_contact2: str | None = Field(None, description="キーパーソン連絡先2")
    
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
    
    # Medical Information
    main_disease: str | None = Field(None, description="主たる傷病名")
    medical_history: str | None = Field(None, description="既往歴")
    current_illness_history: str | None = Field(None, description="現病歴")
    family_structure: str | None = Field(None, description="家族構成")
    
    # Daily Life Status
    daily_life_meal_nutrition: str | None = Field(None, description="食事・栄養")
    daily_life_hygiene: str | None = Field(None, description="清潔・整容")
    daily_life_medication: str | None = Field(None, description="服薬")
    daily_life_sleep: str | None = Field(None, description="睡眠")
    daily_life_living_environment: str | None = Field(None, description="生活環境")
    daily_life_family_environment: str | None = Field(None, description="家族環境")
    
    # Primary Doctor
    doctor_name: str | None = Field(None, description="主治医氏名")
    hospital_name: str | None = Field(None, description="医療機関名")
    hospital_address: str | None = Field(None, description="医療機関所在地")
    hospital_phone: str | None = Field(None, description="医療機関電話番号")
    
    # Additional
    notes: str | None = Field(None, description="備考")
    recorder_name: str | None = Field(None, description="記載者")
    status: str = Field(default="active", description="ステータス (active/inactive/archived)")


class VisitRecordUpdateRequest(BaseModel):
    """Request body for updating a visit record."""

    patient_id: str | None = Field(None, description="Patient ID")
    patient_name: str | None = Field(None, description="患者名")
    gender: str | None = Field(None, description="性別 (male/female)")
    birth_date: str | None = Field(None, description="生年月日 (YYYY-MM-DD)")
    birth_date_year: int | None = Field(None, description="生年月日(年)")
    birth_date_month: int | None = Field(None, description="生年月日(月)")
    birth_date_day: int | None = Field(None, description="生年月日(日)")
    age: int | None = Field(None, description="年齢")
    patient_address: str | None = Field(None, description="住所")
    patient_contact: str | None = Field(None, description="連絡先")
    
    # Key Person
    key_person_name: str | None = Field(None, description="キーパーソン氏名")
    key_person_relationship: str | None = Field(None, description="キーパーソン続柄")
    key_person_address: str | None = Field(None, description="キーパーソン住所")
    key_person_contact1: str | None = Field(None, description="キーパーソン連絡先1")
    key_person_contact2: str | None = Field(None, description="キーパーソン連絡先2")
    
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
    
    # Medical Information
    main_disease: str | None = Field(None, description="主たる傷病名")
    medical_history: str | None = Field(None, description="既往歴")
    current_illness_history: str | None = Field(None, description="現病歴")
    family_structure: str | None = Field(None, description="家族構成")
    
    # Daily Life Status
    daily_life_meal_nutrition: str | None = Field(None, description="食事・栄養")
    daily_life_hygiene: str | None = Field(None, description="清潔・整容")
    daily_life_medication: str | None = Field(None, description="服薬")
    daily_life_sleep: str | None = Field(None, description="睡眠")
    daily_life_living_environment: str | None = Field(None, description="生活環境")
    daily_life_family_environment: str | None = Field(None, description="家族環境")
    
    # Primary Doctor
    doctor_name: str | None = Field(None, description="主治医氏名")
    hospital_name: str | None = Field(None, description="医療機関名")
    hospital_address: str | None = Field(None, description="医療機関所在地")
    hospital_phone: str | None = Field(None, description="医療機関電話番号")
    
    # Additional
    notes: str | None = Field(None, description="備考")
    recorder_name: str | None = Field(None, description="記載者")
    status: str | None = Field(None, description="ステータス (active/inactive/archived)")


class VisitRecordResponse(BaseModel):
    """Response model for a visit record."""

    id: str = Field(..., description="Visit Record ID")
    user_id: str = Field(..., description="User ID")
    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="患者名")
    gender: str | None = Field(None, description="性別")
    birth_date: str | None = Field(None, description="生年月日")
    birth_date_year: int | None = Field(None, description="生年月日(年)")
    birth_date_month: int | None = Field(None, description="生年月日(月)")
    birth_date_day: int | None = Field(None, description="生年月日(日)")
    age: int | None = Field(None, description="年齢")
    patient_address: str | None = Field(None, description="住所")
    patient_contact: str | None = Field(None, description="連絡先")
    
    # Key Person
    key_person_name: str | None = Field(None, description="キーパーソン氏名")
    key_person_relationship: str | None = Field(None, description="キーパーソン続柄")
    key_person_address: str | None = Field(None, description="キーパーソン住所")
    key_person_contact1: str | None = Field(None, description="キーパーソン連絡先1")
    key_person_contact2: str | None = Field(None, description="キーパーソン連絡先2")
    
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
    
    # Medical Information
    main_disease: str | None = Field(None, description="主たる傷病名")
    medical_history: str | None = Field(None, description="既往歴")
    current_illness_history: str | None = Field(None, description="現病歴")
    family_structure: str | None = Field(None, description="家族構成")
    
    # Daily Life Status
    daily_life_meal_nutrition: str | None = Field(None, description="食事・栄養")
    daily_life_hygiene: str | None = Field(None, description="清潔・整容")
    daily_life_medication: str | None = Field(None, description="服薬")
    daily_life_sleep: str | None = Field(None, description="睡眠")
    daily_life_living_environment: str | None = Field(None, description="生活環境")
    daily_life_family_environment: str | None = Field(None, description="家族環境")
    
    # Primary Doctor
    doctor_name: str | None = Field(None, description="主治医氏名")
    hospital_name: str | None = Field(None, description="医療機関名")
    hospital_address: str | None = Field(None, description="医療機関所在地")
    hospital_phone: str | None = Field(None, description="医療機関電話番号")
    
    # Additional
    notes: str | None = Field(None, description="備考")
    recorder_name: str | None = Field(None, description="記載者")
    status: str = Field(..., description="ステータス")
    created_at: str = Field(..., description="作成日時")
    updated_at: str = Field(..., description="更新日時")


class VisitRecordsListResponse(BaseModel):
    """Response model for list of visit records."""

    visit_records: list[VisitRecordResponse] = Field(..., description="List of visit records")