import { createFileRoute } from "@tanstack/react-router";
import { handleIncomingSms } from "@/lib/sms-webhook.server";

// Also exposed at /api/public/payment-sms for published sites (bypasses site auth).
export const Route = createFileRoute("/api/payment-sms")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({ service: "BIGsta Ingestion Pipeline", status: "ACTIVE", timestamp: new Date().toISOString() }),
      POST: async ({ request }) => handleIncomingSms(request),
    },
  },
});
