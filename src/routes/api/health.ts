import { createFileRoute } from "@tanstack/react-router";

// GET /api/health          -> { status: "ok" }  (server is up)
// GET /api/health?deep=1   -> also checks that the database answers, so the
//                             client can tell "online" from "backend down".
const FALLBACK_URL = "https://yjnvjuouxzfrhlqzstlp.supabase.co";
const FALLBACK_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqbnZqdW91eHpmcmhscXpzdGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MDg3MzQsImV4cCI6MjEwNTk4NDczNH0.VcGYMKh8yMSGUNzNnlpNcIhlEoC4A8q3WDEkmjEqU4o";

async function databaseReachable(): Promise<"connected" | "down"> {
  const url = process.env["SUPABASE_URL"] || FALLBACK_URL;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_ANON_KEY"] || FALLBACK_ANON;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(`${url}/rest/v1/system_settings?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: ctrl.signal,
    });
    if (res.ok || res.status === 404 || res.status === 400 || res.status === 401) {
      return "connected";
    }
    const authRes = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      signal: ctrl.signal,
    });
    return authRes.ok ? "connected" : "down";
  } catch {
    return "down";
  } finally {
    clearTimeout(timer);
  }
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const deep = new URL(request.url).searchParams.has("deep");
        const headers = { "Cache-Control": "no-store" };
        if (!deep) return Response.json({ status: "ok" }, { headers });
        const database = await databaseReachable();
        return Response.json(
          { status: database === "down" ? "degraded" : "ok", database },
          { status: database === "down" ? 503 : 200, headers },
        );
      },
    },
  },
});
