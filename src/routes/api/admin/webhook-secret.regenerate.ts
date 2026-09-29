import { createFileRoute } from "@tanstack/react-router";
import { regenerateWebhookSecret } from "@/lib/sms-webhook.server";
import { checkAdminKey } from "@/lib/admin-key.server";

export const Route = createFileRoute("/api/admin/webhook-secret/regenerate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = checkAdminKey(request);
        if (denied) return denied;
        return Response.json({ success: true, secret: await regenerateWebhookSecret() });
      },
    },
  },
});
