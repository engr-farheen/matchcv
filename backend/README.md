# MatchCV backend

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in the values
3. `npm run dev`

## Endpoints
- `POST /api/auth/register` { name, email, password (8-72 chars) }
- `POST /api/auth/login` { email, password }
- `POST /api/resume/upload` multipart field `resume` (PDF, DOC, DOCX, JPG, max 5 MB). Needs `Authorization: Bearer <token>`
- `GET  /api/resume/me` returns the saved review for the signed-in user
- `GET  /api/jobs/match?country=Pakistan&city=Lahore` jobs from the last 7 days, ranked by fit
- `GET  /api/health`

## Privacy by design
- The uploaded CV file is deleted as soon as its text has been read.
- Only skills, job titles, years of experience and the review are stored.
- Text from the CV is sent to Google Gemini to produce the review.

## Production checklist
- Set `NODE_ENV=production` (hides technical error details from the browser)
- Set `CORS_ORIGIN` to your real site address
- Use a long random `JWT_SECRET`
