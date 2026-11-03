import { createFileRoute } from "@tanstack/react-router";
import { smsStats } from "@/lib/sms-webhook.server";
import { checkAdminSession } from "@/lib/admin-key.server";

export const Route = createFileRoute("/api/admin/sms-monitor")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await checkAdminSession(request);
        if (denied) return denied;
        const rows = await smsStats();
        const logs = rows.map((r: any) => ({
          id: r.id,
          received_at: r.received_at,
          sender: r.sender,
          raw_sms: r.raw_sms,
          device_name: r.device_id,
          source_ip: "",
          status: r.processing_state === "PARSED" ? "COMPLETED" : "FAILED",
          trace: [],
        }));
        const completed = logs.filter((l: any) => l.status === "COMPLETED").length;
        return Response.json({
          stats: {
            total: logs.length,
            completed,
            failed: logs.length - completed,
            duplicates: 0,
            pending: 0,
          },
          logs,
        });
      },
    },
  },
});
