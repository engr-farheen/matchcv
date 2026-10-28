# MatchCV code audit (October 2026)

Method: read every backend and frontend file, ran offline logic tests on the backend,
and ran the page in a real headless Chromium with a mocked API (48 checks: flows,
XSS escaping, contrast, keyboard, mobile layout, dark mode).

## Fixed in this version

| # | Area | Problem | Severity | Fix |
|---|------|---------|----------|-----|
| 1 | Privacy | Uploaded CV files were never deleted from `uploads/` | High | File is deleted right after reading (in a `finally`) |
| 2 | Function | `.doc` was accepted but `mammoth` only reads `.docx` | High | Content sniffing + optional `word-extractor` for real `.doc` |
| 3 | Security | No limit on login attempts or AI calls | High | Rate limits: auth 30 / 15 min per IP, uploads 20 / hour, searches 60 / hour |
| 4 | Reliability | Too-big or wrong files returned an HTML error, browser showed "Request failed" | Medium | JSON error handler, clear messages |
| 5 | Security | Email case created duplicate accounts; no password rules | Medium | Lowercased email, valid email check, 8 to 72 character password |
| 6 | Security | Text inside a CV or job post could instruct the AI | Medium | Prompts treat it as untrusted data; score is computed on the server from the 8 ratings |
| 7 | Reliability | One AI call per job: slow, burns free quota | Medium | All jobs scored in one call |
| 8 | Reliability | AI 503 / 429 errors failed the whole request | Medium | Retry with back-off, then fallback model |
| 9 | Function | Review was lost on refresh; user details were not "saved" | Medium | Review saved to the account and restored (`GET /api/resume/me`) |
| 10 | Security | Raw error text sent to browsers | Low | Technical details only when `NODE_ENV` is not `production` |
| 11 | Ops | Missing `.env` values gave confusing crashes | Low | Startup check with a clear message |
| 12 | Frontend | Dark mode: light text on gold buttons (about 2:1 contrast) | Medium | Accent / on-accent colour pair; all text now at least 4.5:1 (tested) |
| 13 | Frontend | Hover lift on cards never worked (entrance animation overrode it) | Low | Animation uses `backwards` fill mode |
| 14 | Frontend | Dark mode flashed white on load | Low | Theme set in `<head>` before paint |
| 15 | Accessibility | Dropzone not keyboard reachable; no labels; tabs without ARIA; no focus ring or reduced-motion support | Medium | All added |
| 16 | Frontend | Page could scroll sideways on phones | Low | Decorative layer kept inside its box |
| 17 | Frontend | Session expiry left the screen in a broken state | Low | 401 signs out with a message |

## Still open (not done yet)

- **Token storage**: the login token lives in `localStorage`. Fine for now since all output is escaped (tested), but an httpOnly cookie is safer for a public launch.
- **No password reset / email verification / account delete**: needed before a public launch.
- **Rate limiter is in memory**: fine for one server, move to Redis for several.
- **No automated tests in the repo**: the offline tests used during this audit are not committed.
- **`@google/generative-ai` is Google's older SDK**: works today; plan a move to `@google/genai`.
- **Free hosting sleeps**: Render's free tier has a cold start of about 30 to 50 seconds.
- **JSearch coverage varies by country**: some places return few listings.

## Added after reading Enhancv's resume checker page

- 15 checks in 3 groups (Basics, Content, Skills & career) instead of 8
- Tailor to a job (from a listing or a pasted description): keywords you have, keywords to add if true, headline, action verbs
- Cover letter first draft built only from facts in the CV, with [placeholders] for unknown details
- "My applications" tracker (saved in the browser only)
- Longer FAQ, a Tools section and a real footer
- Privacy text now says Google may use inputs on the free Gemini tier. Enhancv promises "no AI training"; we cannot promise that on the free tier.
