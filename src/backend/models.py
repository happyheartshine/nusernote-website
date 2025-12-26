from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    """Request body for /generate."""

    userName: str = Field(
        default="",
        description="利用者名",
    )
    diagnosis: str = Field(
        default="",
        description="主疾患",
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
    patient_name: str = Field(..., description="利用者名")
    visit_date: str = Field(..., description="訪問日 (YYYY-MM-DD)")
    chief_complaint: str | None = Field(None, description="主訴")
    created_at: str = Field(..., description="作成日時")
    diagnosis: str | None = Field(None, description="主疾患")
    start_time: str | None = Field(None, description="訪問開始時間")
    end_time: str | None = Field(None, description="訪問終了時間")


class RecordsListResponse(BaseModel):
    """Response model for list of SOAP records."""

    records: list[SOAPRecordResponse] = Field(..., description="List of SOAP records")


class FullSOAPRecordResponse(BaseModel):
    """Response model for a single SOAP record with full SOAP and Plan data."""

    id: str = Field(..., description="Record ID")
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


class PDFGenerationResponse(BaseModel):
    """Response model for PDF generation endpoints."""

    pdf_url: str = Field(..., description="Presigned URL to download the generated PDF")
    s3_key: str = Field(..., description="S3 key where the PDF was uploaded")