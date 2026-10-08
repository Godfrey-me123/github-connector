import { createFileRoute } from "@tanstack/react-router";
import { gatewayStatus, getWebhookSecret } from "@/lib/sms-webhook.server";
import { checkAdminKey } from "@/lib/admin-key.server";

async function handle(request: Request) {
  const denied = checkAdminKey(request);
  if (denied) return denied;
  try {
    const origin = new URL(request.url).origin;
    const status = await gatewayStatus(origin);
    const secret = await getWebhookSecret();
    return Response.json({
      ...status,
      config: {
        webhookUrl: `${origin}/api/public/payment-sms`,
        secret,
        headers: { "Content-Type": "application/json", "X-BIGSTA-SECRET": secret },
        bodyTemplate: { sender: "%from%", message: "%text%", device_name: "%device%" },
      },
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Status check failed" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/admin/sms-gateway")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
