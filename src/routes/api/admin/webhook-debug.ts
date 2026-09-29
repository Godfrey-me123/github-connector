import { createFileRoute } from "@tanstack/react-router";
import { smsStats } from "@/lib/sms-webhook.server";

export const Route = createFileRoute("/api/admin/webhook-debug")({
  server: {
    handlers: {
      GET: async () => {
        const rows = await smsStats();
        const ok = rows.filter((r) => r.processing_state === "PARSED");
        const last = rows[0] ?? null;
        return Response.json({
          count: rows.length,
          successful: ok.length,
          failed: rows.length - ok.length,
          hasEverConnected: rows.length > 0,
          lastSuccessTimestamp: ok[0]?.received_at ?? null,
          lastSuccessfulPayload: ok[0] ? { sender: ok[0].sender, raw_sms: ok[0].raw_sms } : null,
          lastTestTimestamp: null,
          lastTestStatus: null,
          lastRequestTime: last?.received_at ?? null,
          lastPayload: last,
          requests: rows.map((r) => ({
            id: r.id,
            timestamp: r.received_at,
            ip: "",
            status: r.processing_state === "PARSED" ? "success" : "failed",
            body: { sender: r.sender, raw_sms: r.raw_sms, device_name: r.device_id },
          })),
        });
      },
    },
  },
});
