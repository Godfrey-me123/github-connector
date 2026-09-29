import { createFileRoute } from "@tanstack/react-router";
import { getWebhookSecret } from "@/lib/sms-webhook.server";
import { checkAdminKey } from "@/lib/admin-key.server";

export const Route = createFileRoute("/api/admin/webhook-secret")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = checkAdminKey(request);
        if (denied) return denied;
        return Response.json({ secret: await getWebhookSecret() });
      },
    },
  },
});
