# Bring BIGsta ("New-age" repo) into this project, then audit the database wiring

## What I found

- Repo `Godfrey-me123/New-age` holds BIGsta: an ID-card designer/renderer (~45,000 lines) with NIDA/NHIF/driving-licence forms, templates, canvas editor, token billing, passkeys, payments dashboard and an SMS payment pipeline.
- It was built for a different setup (Vite + Express server + react-router). This project runs on a different framework, so the app has to be moved over, not just copied.
- This project is already connected to the same Supabase database (24 tables).

## Phase 1 - Import the app (keeps it looking and working the same)

1. Copy all screens, components, store, utils and services into this project.
2. Install its libraries (konva, react-konva, zustand, jspdf, bwip-js, qrcode, motion, idb, lucide-react).
3. Mount the existing BIGsta app on the home page (browser-only, since the canvas editor can't render on the server). Replace the single react-router usage with this project's router.
4. Point Supabase code at this project's built-in Supabase client (remove hardcoded keys).
5. Move the Express endpoints to server routes with the same URLs so existing `fetch('/api/...')` calls keep working:
   - `POST/GET /api/payment-sms` (SMS webhook, signature/secret check kept)
   - `/api/admin/sms-monitor`, `/api/admin/webhook-debug`, `/api/admin/webhook-secret(+/regenerate)`, `/api/admin/webhook-settings`
   - `/api/payment/extract-ocr` (Gemini OCR -> switched to the built-in AI service, no Gemini key needed)
   - `/api/export-card`, `/api/download/:fileId`, `/api/health`
   - In-memory logs/secrets in the old server move to Supabase tables (serverless servers don't keep memory).
6. Drop the one-off `fix_*.cjs` / `patch_*.cjs` scripts.

## Phase 2 - Database audit

1. Map each of the 24 tables to the screens that use it; list tables with no screen.
2. Fix broken/mismatched queries, remove mock/sample fallbacks where real data exists, add loading and error states.
3. Check RLS on every table and add missing policies (roles via `user_roles` + `has_role`), via migrations you approve.
4. Add admin views only for tables that are genuinely unused by the app (report first).

## GitHub

Lovable can't push into an existing repo through the API connector. To keep "New-age" in sync, connect this project via Plus menu > GitHub (it creates/syncs a repo automatically). Alternatively I can push changed files to New-age through the connector, but that needs write access (the current connection is read+repo, which does allow it) and would diverge from this project's history - I'll only do it if you ask.

## Technical notes

- Client app rendered via `ClientOnly` + lazy import in `src/routes/index.tsx`.
- Server routes under `src/routes/api/...`; webhook under `api/public/payment-sms` with a rewrite-compatible alias.
- Work is large; Phase 1 first, verified in preview, then Phase 2.
