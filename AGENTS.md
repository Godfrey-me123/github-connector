<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- BIGsta app lives in `src/bigsta/` and is mounted client-only on `/` — it is a canvas-heavy SPA ported from the "New-age" Vite/Express repo.
- Old Express endpoints live as server routes under `src/routes/api/` with the same URLs; SMS webhook also at `/api/public/payment-sms` — so existing client fetches keep working.
- Webhook secret/settings persist in `system_settings` (ids `webhook_secret`, `webhook_settings`) — serverless workers keep no memory.
- Legacy files in `src/bigsta` carry `// @ts-nocheck` until typed during the audit — project tsconfig is stricter than the original.
