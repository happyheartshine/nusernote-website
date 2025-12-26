# NurseNote AI Backend (Milestone 1)

FastAPI backend that accepts psychiatric home-visit nursing inputs (chief complaint, S, O) and returns an AI-generated SOAP summary plus a nursing care plan.

## Requirements

- Python 3.10+
- OpenAI API key (model: `gpt-4.1-mini` or compatible)
- Recommended: virtualenv/uvenv/pyenv for isolated installs

## Setup

1. **Install dependencies**

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment**

   Create `backend/.env`:

   ```
   OPENAI_API_KEY=sk-xxxx
   # Supabase authentication (required for protected endpoints)
   SUPABASE_PROJECT_URL=https://your-project.supabase.co
   SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-dashboard
   # optional: override defaults
   # OPENAI_MODEL=gpt-4.1-mini
   # ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://*.ngrok-free.app
   ```

   `python-dotenv` loads this automatically when the app boots.

3. **Run the server**

   ```bash
   uvicorn main:app --reload --port 8000
   ```

   Production example:

   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

## API

### POST `/generate`

**Authentication Required**: This endpoint requires a valid Supabase JWT token in the `Authorization` header:
```
Authorization: Bearer <supabase-access-token>
```

Request body:

```json
{
  "chief_complaint": "服薬がうまくいかないとの訴え",
  "s": "眠れない日が続き不安だと繰り返し話される。",
  "o": "夜間覚醒が多く、服薬残薬が30錠見られた。"
}
```

- All fields accept empty strings.
- At least one of `s` or `o` must contain non-whitespace text; otherwise the API returns `400 { "error": "SまたはOのいずれか一方は必須です。" }`.

Successful response:

```json
{
  "output": "S（主観）:\n...\n\n【看護計画書】\n長期目標:\n...\n"
}
```

Possible error payloads (always JSON):

| Status | Body example |
| --- | --- |
| 401 | `{ "detail": "Token has expired." }` or `{ "detail": "Invalid token: ..." }` |
| 400 | `{ "error": "SまたはOのいずれか一方は必須です。" }` |
| 502 | `{ "error": "AI生成中にエラーが発生しました。" }` |
| 500 | `{ "error": "AI生成中にエラーが発生しました。" }` |

### GET `/health`

Basic readiness probe returning `{"status":"ok"}`.

## Architecture

```
backend/
├── main.py                # FastAPI app, routing, CORS, error handling
├── models.py              # Pydantic request/response schemas
├── services/
│   └── ai_service.py      # OpenAI Responses API wrapper
├── utils/
│   └── prompt_template.py # Prompt construction logic
├── requirements.txt
└── README.md
```

## Notes

- The prompt enforces the SOAP + care-plan structure and uses psychiatric home-visit vocabulary.
- CORS defaults to `*` for development. Set `ALLOWED_ORIGINS` for production domains (e.g., Vercel, ngrok).
- `OPENAI_MODEL` env var allows swapping to future compatible models without code changes.
