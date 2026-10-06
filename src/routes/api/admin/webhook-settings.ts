import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { saveWebhookSettings } from "@/lib/sms-webhook.server";
import { checkAdminKey } from "@/lib/admin-key.server";

const Body = z.object({
  webhookUrl: z.string().max(500).optional(),
  customAppUrl: z.string().max(500).optional(),
});

export const Route = createFileRoute("/api/admin/webhook-settings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkAdminKey(request);
        if (denied) return denied;
        const parsed = Body.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success)
          return Response.json({ success: false, error: "Invalid body" }, { status: 400 });
        await saveWebhookSettings(parsed.data);
        return Response.json({ success: true });
      },
    },
  },
});
