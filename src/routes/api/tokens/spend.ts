import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_SERVICES = new Set([
  "nida",
  "driving_license",
  "nhif",
  "nrc_zambia",
  "general",
  "export",
  "card_export",
  "template",
]);

export const Route = createFileRoute("/api/tokens/spend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
        if (!accessToken) {
          return Response.json({ error: "Authentication required." }, { status: 401 });
        }

        try {
          const body = await request.json();
          const serviceId = String(body?.serviceId || "");
          const serviceName = String(body?.serviceName || "BIGsta service").slice(0, 200);
          const operationId = String(body?.operationId || "");
          const mode = body?.mode === "export" ? "export" : "generation";

          if (!ALLOWED_SERVICES.has(serviceId) || !/^[A-Za-z0-9:_-]{1,100}$/.test(operationId)) {
            return Response.json({ error: "Invalid token transaction." }, { status: 400 });
          }

          const { readAccountRole } = await import("@/lib/account-role.server");
          const account = await readAccountRole(accessToken);
          if (!account) {
            return Response.json({ error: "Invalid account session." }, { status: 401 });
          }

          if (account.isAdmin) {
            return Response.json({ balance: 99999, skipped: true });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          let tokenCost = 1;
          try {
            const { data: service } = await (supabaseAdmin
              .from("services") as any)
              .select("token_cost, is_active")
              .eq("id", serviceId)
              .maybeSingle();
            if (service && Number(service.token_cost) > 0) {
              tokenCost = Math.max(1, Math.min(Number(service.token_cost), 1000));
            }
          } catch {
            tokenCost = 1;
          }

          let rpc: string;
          let args: Record<string, unknown>;
          if (mode === "export") {
            rpc = "bigsta_apply_wallet_delta";
            args = {
              p_target_profile_id: account.user.id,
              p_delta: -tokenCost,
              p_reason: `${serviceName} export`,
              p_operation_id: `export:${operationId}`,
              p_mode: "spend",
              p_actor_id: account.user.id,
            };
          } else {
            rpc = "bigsta_user_spend_tokens";
            args = {
              p_user_id: account.user.id,
              p_service_id: serviceId,
              p_service_name: serviceName,
              p_operation_id: operationId,
            };
          }

          const { data, error } = await (supabaseAdmin as any).rpc(rpc, args);
          if (error) {
            console.error("[Tokens] Wallet RPC failed:", error);
            const isInsufficient =
              error.message?.includes("insufficient_tokens") ||
              (error.code === "22023" && error.message?.includes("insufficient"));
            if (isInsufficient) {
              return Response.json({ error: "Insufficient tokens." }, { status: 402 });
            }
            return Response.json(
              { error: "Token transaction could not be completed securely." },
              { status: 500 }
            );
          }

          return Response.json({
            balance: Number(data?.balance) || 0,
            chargedTokens: tokenCost,
            alreadyApplied: Boolean(data?.alreadyApplied),
          });
        } catch (error) {
          console.error("[Tokens] Spend request failed:", error);
          return Response.json({ error: "Token transaction could not be completed." }, { status: 500 });
        }
      },
    },
  },
});
