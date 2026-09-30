import { createFileRoute } from "@tanstack/react-router";
import { handleIncomingSms } from "@/lib/sms-webhook.server";

export const Route = createFileRoute("/api/public/payment-sms")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({ service: "BIGsta Ingestion Pipeline", status: "ACTIVE", timestamp: new Date().toISOString() }),
      POST: async ({ request }) => handleIncomingSms(request),
    },
  },
});
