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
    status: str = Field(default="draft", description="記録ステータス (draft/confirmed)")


class RecordsListResponse(BaseModel):
    """Response model for list of SOAP records."""

    records: list[SOAPRecordResponse] = Field(..., description="List of SOAP records")


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