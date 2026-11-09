import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkAdminSession } from "@/lib/admin-key.server";

const createAccountSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional().refine((value) => !value || /^(?:\+?255|0)[67]\d{8}$/.test(value), "Phone must use a Tanzanian mobile format such as 07XXXXXXXX or 06XXXXXXXX."),
  role: z.enum(["user", "admin"]).default("user"),
  initialTokens: z.number().int().min(0).default(5),
});

export const Route = createFileRoute("/api/admin/create-account")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await checkAdminSession(request);
        if (denied) return denied;
        let createdAuthUserId: string | null = null;
        try {
          const body = await request.json();
          const parsed = createAccountSchema.parse(body);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // 1. Create auth user in Supabase Auth
          const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
            email: parsed.email.toLowerCase().trim(),
            password: parsed.password,
            email_confirm: true,
            user_metadata: {
              full_name: parsed.fullName.trim(),
              phone: parsed.phone?.trim() || "",
              role: parsed.role,
            },
          });

          if (authErr || !authData.user) {
            return Response.json(
              { success: false, message: authErr?.message || "Failed to create user." },
              { status: 400 },
            );
          }

          const userId = authData.user.id;
          createdAuthUserId = userId;
          const tokens = parsed.role === "admin" ? 99999 : parsed.initialTokens;

          // Persist the profile, role, and opening balance. Roll back the Auth user if any step fails.
          const { error: profileError } = await (supabaseAdmin.from("profiles") as any).upsert({
            auth_user_id: userId,
            name: parsed.fullName.trim(),
            email: parsed.email.toLowerCase().trim(),
            phone: parsed.phone?.trim() || "",
            role: parsed.role,
            tokens,
            updated_at: new Date().toISOString(),
          });
          if (profileError) throw profileError;

          if (parsed.role === "admin") {
            const { error: roleError } = await (supabaseAdmin.from("user_roles") as any).upsert(
              { user_id: userId, role: "admin" },
              { onConflict: "user_id,role" },
            );
            if (roleError) throw roleError;
          }

          if (tokens > 0) {
            const { error: transactionError } = await (supabaseAdmin.from("token_transactions") as any).insert({
              user_id: userId,
              tokens,
              transaction_type: "ADMIN_GRANT",
              description: `Initial account creation allocation (${parsed.role})`,
            });
            if (transactionError) throw transactionError;
          }

          createdAuthUserId = null;
          return Response.json({
            success: true,
            userId,
            email: parsed.email,
            role: parsed.role,
            tokens,
          });
        } catch (e: any) {
          try {
            if (typeof createdAuthUserId === "string") {
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
            }
          } catch (rollbackError) {
            console.error("[admin/create-account] Auth rollback failed:", rollbackError);
          }
          return Response.json(
            { success: false, message: e?.message || "Internal server error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
