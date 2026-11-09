import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { checkAdminSession } from "@/lib/admin-key.server";

export const createAccountSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  phone: z
    .string()
    .optional()
    .refine(
      (value) => !value || /^(?:\+?255|0)[67]\d{8}$/.test(value),
      "Phone must use a Tanzanian mobile format such as 07XXXXXXXX or 06XXXXXXXX.",
    ),
  role: z.enum(["user", "admin"]).default("user"),
  initialTokens: z.number().int().min(0).default(5),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export interface CreateAccountDependencies {
  checkAdmin?: (request: Request) => Promise<Response | null>;
  adminClient?: any;
}

export async function executeCreateAccount(
  rawBody: unknown,
  deps?: CreateAccountDependencies,
): Promise<Response> {
  let createdAuthUserId: string | null = null;
  let client = deps?.adminClient;

  try {
    const parsed = createAccountSchema.parse(rawBody);

    if (!client) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      client = supabaseAdmin;
    }

    // 1. Create auth user in Supabase Auth
    const { data: authData, error: authErr } = await client.auth.admin.createUser({
      email: parsed.email.toLowerCase().trim(),
      password: parsed.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.fullName.trim(),
        phone: parsed.phone?.trim() || "",
        role: parsed.role,
      },
    });

    if (authErr || !authData?.user) {
      return Response.json(
        { success: false, message: authErr?.message || "Failed to create user." },
        { status: 400 },
      );
    }

    const userId = authData.user.id;
    createdAuthUserId = userId;
    const tokens = parsed.role === "admin" ? 99999 : parsed.initialTokens;

    // 2. Persist the profile. Include both id and auth_user_id.
    const { error: profileError } = await client.from("profiles").upsert(
      {
        id: userId,
        auth_user_id: userId,
        name: parsed.fullName.trim(),
        email: parsed.email.toLowerCase().trim(),
        phone: parsed.phone?.trim() || "",
        role: parsed.role,
        tokens,
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "auth_user_id" },
    );
    if (profileError) throw profileError;

    // 3. Mirror into user_profiles if table exists
    try {
      await client.from("user_profiles").upsert(
        {
          id: userId,
          auth_user_id: userId,
          name: parsed.fullName.trim(),
          email: parsed.email.toLowerCase().trim(),
          phone: parsed.phone?.trim() || "",
          role: parsed.role,
          tokens,
          status: "ACTIVE",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "auth_user_id" },
      );
    } catch {
      // Ignored if user_profiles is not present or managed via trigger
    }

    // 4. If admin, insert role into user_roles
    if (parsed.role === "admin") {
      const { error: roleError } = await client.from("user_roles").upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role" },
      );
      if (roleError) throw roleError;
    }

    // 5. Record initial token grant transaction
    if (tokens > 0) {
      const { error: transactionError } = await client.from("token_transactions").insert({
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
    if (typeof createdAuthUserId === "string" && client?.auth?.admin?.deleteUser) {
      try {
        await client.auth.admin.deleteUser(createdAuthUserId);
      } catch (rollbackError) {
        console.error("[admin/create-account] Auth rollback failed:", rollbackError);
      }
    }

    const isZod = e instanceof z.ZodError;
    const message = isZod ? e.issues.map((err) => err.message).join(" ") : e?.message || "Internal server error";
    return Response.json({ success: false, message }, { status: isZod ? 400 : 500 });
  }
}

export const Route = createFileRoute("/api/admin/create-account")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await checkAdminSession(request);
        if (denied) return denied;

        try {
          const body = await request.json();
          return await executeCreateAccount(body);
        } catch {
          return Response.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
        }
      },
    },
  },
});
