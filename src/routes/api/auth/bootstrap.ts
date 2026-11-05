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
          const { readAccountRole } = await import("@/lib/account-role.server");
          const account = await readAccountRole(accessToken);
          if (!account) {
            return Response.json({ error: "Invalid account session." }, { status: 401 });
          }

          const { user, isAdmin } = account;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const expectedRole = isAdmin ? "admin" : "user";
          let claimsUpdated = false;
          if (user.app_metadata?.['role'] !== expectedRole) {
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
              app_metadata: { ...user.app_metadata, role: expectedRole },
            });

            if (updateError) {
              console.error("[Auth] Could not provision configured admin role:", updateError.message);
              return Response.json({ error: "Account setup could not be completed." }, { status: 500 });
            }

            claimsUpdated = true;
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
            isAdmin,
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
