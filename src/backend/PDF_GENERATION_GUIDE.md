# PDF Generation System Guide

## Overview

This document describes the medical-grade PDF generation system for NurseNote AI, which generates two types of PDFs:

1. **精神科訪問看護記録書Ⅱ** (Visit Report PDF) - Visit-based reports
2. **月次レポート** (Monthly Report PDF) - Monthly aggregated reports

## Architecture

### Components

1. **PDF Service** (`services/pdf_service.py`)
   - Maps SOAP data to official Japanese medical form format
   - Generates PDFs using Jinja2 templates and WeasyPrint
   - Handles intelligent data mapping (not raw SOAP dumps)

2. **S3 Service** (`services/s3_service.py`)
   - Uploads PDFs to AWS S3
   - Generates presigned URLs for secure downloads

3. **Templates** (`templates/`)
   - `visit_report.html` - Visit report template
   - `monthly_report.html` - Monthly report template

4. **API Endpoints** (`api/routes.py`)
   - `POST /pdf/visit-report/{visit_id}` - Generate visit report
   - `POST /pdf/monthly-report/{patient_id}?year=YYYY&month=M` - Generate monthly report

## API Endpoints

### POST `/pdf/visit-report/{visit_id}`

Generates a visit report PDF for a specific visit.

**Authentication**: Required (Supabase JWT token)

**Response**:
```json
{
  "pdf_url": "https://s3.amazonaws.com/...",
  "s3_key": "pdf/visit/{visit_id}.pdf"
}
```

**Error Responses**:
- `404`: Visit record not found
- `500`: PDF generation or upload error

### POST `/pdf/monthly-report/{patient_id}?year=YYYY&month=M`

Generates a monthly report PDF for a specific patient.

**Authentication**: Required (Supabase JWT token)

**Query Parameters**:
- `year` (required): Year in YYYY format (2000-2100)
- `month` (required): Month (1-12)

**Response**:
```json
{
  "pdf_url": "https://s3.amazonaws.com/...",
  "s3_key": "pdf/monthly/{patient_id}_{YYYYMM}.pdf"
}
```

**Error Responses**:
- `400`: Invalid year/month parameters
- `404`: No visits found for the specified month
- `500`: PDF generation or upload error

## Data Mapping Logic

### Visit Report Mapping

The system intelligently maps SOAP components to official form sections:

- **食生活・清潔・排泄・睡眠・生活リズム・整頓**: Derived from O (objective) + S when relevant
- **精神状態**: A（症状推移 + 背景要因 + リスク要約）
- **服薬等の状況**: A（服薬アドヒアランス・怠薬リスク）
- **作業・対人関係**: Extracted from O if available
- **実施した看護内容**: P【本日実施した援助】
- **備考**: Optional / blank allowed
- **GAF**: Optional
- **次回訪問予定日**: Optional

**Important**: The system does NOT dump raw SOAP. It maps SOAP intelligently into the official form sections suitable for medical submission and audits.

### Monthly Report Mapping

The monthly report aggregates data from all visits in the specified month:

- **症状推移**: Aggregated from A（症状推移）
- **睡眠・生活リズムの変化**: Aggregated from visit data
- **不安・陽性症状・陰性症状のトレンド**: Aggregated from visit data
- **服薬の安定性**: Aggregated from A（リスク評価）
- **家族・環境変化**: Aggregated from visit data
- **総合評価**: AI-generated clinical summary (from latest visit)
- **次月の方針**: From P（次回以降の方針）of latest visit

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=ap-northeast-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_PRESIGNED_URL_EXPIRATION=3600  # URL expiration in seconds (default: 1 hour)
```

### Dependencies

The following packages are required (already in `requirements.txt`):

- `jinja2>=3.1.0` - HTML template rendering
- `weasyprint>=60.0` - HTML to PDF conversion
- `boto3>=1.34.0` - AWS S3 integration

## S3 Storage Structure

PDFs are stored in S3 with the following structure:

```
pdf/
  visit/
    {visit_id}.pdf
  monthly/
    {patient_id}_{YYYYMM}.pdf
```

## Template Design

### Visit Report Template

- A4 size
- Japanese fonts (IPAexGothic, Hiragino Kaku Gothic ProN, Meiryo)
- Proper margins (15mm)
- Clear section borders
- Print-safe design (no fancy CSS)

### Monthly Report Template

- A4 size
- Japanese fonts
- Proper margins (15mm)
- Summary grid layout
- Print-safe design

## Error Handling

All endpoints include comprehensive error handling:

- Database errors → 500 with appropriate message
- PDF generation errors → 500 with appropriate message
- S3 upload errors → 500 with appropriate message
- Missing records → 404 with appropriate message
- Invalid parameters → 400 with appropriate message

## Security

- All endpoints require authentication (Supabase JWT token)
- Users can only access their own records (enforced by database queries)
- Presigned URLs are time-limited (configurable expiration)
- PDFs are stored securely in S3

## Future Enhancements

1. **AI-Powered Summaries**: Use AI to generate more sophisticated summaries for monthly reports
2. **Enhanced Data Extraction**: Use AI to extract specific information from SOAP notes (e.g., medication status, daily living details)
3. **Custom Templates**: Allow users to customize PDF templates
4. **Batch Generation**: Generate multiple PDFs at once
5. **PDF Caching**: Cache generated PDFs to avoid regeneration

## Notes

- The system uses `patient_name` instead of `patient_id` in the current database schema
- Monthly reports use `patient_name` as the identifier
- Visit reports use `visit_id` (UUID) as the identifier
- All dates are formatted in Japanese format (YYYY年MM月DD日)
- Times are formatted as HH:MM



