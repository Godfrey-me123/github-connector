import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/bootstrap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessToken = request.headers
          .get("authorization")
          ?.match(/^Bearer\s+(.+)$/i)?.[1];

        if (!accessToken) {
          return Response.json({ error: "Authentication required." }, { status: 401 });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const {
            data: { user },
            error: userError,
          } = await supabaseAdmin.auth.getUser(accessToken);

          if (userError || !user) {
            return Response.json({ error: "Invalid account session." }, { status: 401 });
          }

          const configuredAdminEmail = process.env["BIGSTA_ADMIN_EMAIL"]?.trim().toLowerCase();
          const isConfiguredAdmin = Boolean(
            configuredAdminEmail && user.email?.trim().toLowerCase() === configuredAdminEmail,
          );
          let claimsUpdated = user.app_metadata?.['role'] === "admin";

          if (isConfiguredAdmin && user.app_metadata?.['role'] !== "admin") {
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
              app_metadata: { ...user.app_metadata, role: "admin" },
            });

            if (updateError) {
              console.error("[Auth] Could not provision configured admin role:", updateError.message);
              return Response.json({ error: "Account setup could not be completed." }, { status: 500 });
            }

            claimsUpdated = true;
          }

          const isAdmin = isConfiguredAdmin || user.app_metadata?.['role'] === "admin";
          if (isAdmin) {
            const db = supabaseAdmin as any;
            await Promise.all([
              db.from("profiles").update({ role: "admin" }).eq("auth_user_id", user.id),
              db.from("user_profiles").update({ role: "admin" }).eq("auth_user_id", user.id),
              db
                .from("passkeys")
                .update({ role: "admin", total_usages: 99999, remaining_usages: 99999 })
                .eq("key", user.id),
            ]);
          }

          let welcomeTokenGranted = false;
          if (user.email_confirmed_at) {
            try {
              const { data, error } = await (supabaseAdmin as any).rpc(
                "grant_bigsta_welcome_token",
                { p_user_id: user.id },
              );
              if (error) {
                console.error("[Auth] Welcome token grant failed:", error.message);
              } else {
                welcomeTokenGranted = Number(data) > 0;
              }
            } catch (error) {
              console.error("[Auth] Welcome token grant failed:", error);
            }
          }

          return Response.json({
            claimsUpdated,
            isAdmin: isConfiguredAdmin || user.app_metadata?.['role'] === "admin",
            welcomeTokenGranted,
          });
        } catch (error) {
          console.error("[Auth] Session bootstrap failed:", error);
          return Response.json({ error: "Account setup is temporarily unavailable." }, { status: 500 });
        }
      },
    },
  },
});
