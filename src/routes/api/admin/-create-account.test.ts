import { describe, expect, it } from "vitest";
import { executeCreateAccount } from "./create-account";

function createMockAdminClient(overrides: {
  authError?: { message: string } | null;
  profileError?: { message: string } | null;
  roleError?: { message: string } | null;
  transactionError?: { message: string } | null;
} = {}) {
  const state = {
    deletedUserId: null as string | null,
    profiles: [] as any[],
    userRoles: [] as any[],
    transactions: [] as any[],
  };

  const client = {
    auth: {
      admin: {
        createUser: async (params: any) => {
          if (overrides.authError) return { data: null, error: overrides.authError };
          const id = "mock-user-" + Math.random().toString(36).slice(2, 9);
          return {
            data: {
              user: {
                id,
                email: params.email,
                user_metadata: params.user_metadata,
              },
            },
            error: null,
          };
        },
        deleteUser: async (id: string) => {
          state.deletedUserId = id;
          return { data: {}, error: null };
        },
      },
    },
    from: (table: string) => ({
      upsert: async (row: any) => {
        if (table === "profiles") {
          if (overrides.profileError) return { error: overrides.profileError };
          state.profiles.push(row);
        }
        if (table === "user_roles") {
          if (overrides.roleError) return { error: overrides.roleError };
          state.userRoles.push(row);
        }
        return { error: null };
      },
      insert: async (row: any) => {
        if (table === "token_transactions") {
          if (overrides.transactionError) return { error: overrides.transactionError };
          state.transactions.push(row);
        }
        return { error: null };
      },
    }),
  };

  return { client, state };
}

describe("Admin Create Account API (/api/admin/create-account)", () => {
  it("rejects invalid input payloads (missing full name, invalid email, short password)", async () => {
    const { client } = createMockAdminClient();

    const badEmail = await executeCreateAccount(
      { fullName: "John Doe", email: "not-an-email", password: "password123" },
      { adminClient: client },
    );
    expect(badEmail.status).toBe(400);
    const badEmailBody = await badEmail.json();
    expect(badEmailBody.success).toBe(false);

    const shortPassword = await executeCreateAccount(
      { fullName: "John Doe", email: "john@example.com", password: "123" },
      { adminClient: client },
    );
    expect(shortPassword.status).toBe(400);

    const shortName = await executeCreateAccount(
      { fullName: "J", email: "john@example.com", password: "password123" },
      { adminClient: client },
    );
    expect(shortName.status).toBe(400);
  });

  it("validates Tanzanian phone number formats", async () => {
    const { client } = createMockAdminClient();

    const badPhone = await executeCreateAccount(
      { fullName: "John Doe", email: "john@example.com", password: "password123", phone: "123456" },
      { adminClient: client },
    );
    expect(badPhone.status).toBe(400);

    const validPhone = await executeCreateAccount(
      { fullName: "John Doe", email: "john@example.com", password: "password123", phone: "0712345678" },
      { adminClient: client },
    );
    expect(validPhone.status).toBe(200);
  });

  it("successfully creates a normal user account with default 5 tokens", async () => {
    const { client, state } = createMockAdminClient();

    const res = await executeCreateAccount(
      {
        fullName: "Amani Mwangi",
        email: "amani@example.com",
        password: "securepassword123",
        phone: "0754123456",
        role: "user",
      },
      { adminClient: client },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.role).toBe("user");
    expect(body.tokens).toBe(5);

    expect(state.profiles).toHaveLength(1);
    expect(state.profiles[0].auth_user_id).toBe(body.userId);
    expect(state.profiles[0].tokens).toBe(5);
    expect(state.profiles[0].role).toBe("user");

    // Regular users should not have a user_roles admin entry
    expect(state.userRoles).toHaveLength(0);

    // Initial tokens should be logged as ADMIN_GRANT
    expect(state.transactions).toHaveLength(1);
    expect(state.transactions[0].tokens).toBe(5);
    expect(state.transactions[0].transaction_type).toBe("ADMIN_GRANT");
  });

  it("successfully creates an administrator account with 99999 tokens and user_roles admin mapping", async () => {
    const { client, state } = createMockAdminClient();

    const res = await executeCreateAccount(
      {
        fullName: "System Superadmin",
        email: "superadmin@example.com",
        password: "adminpassword123",
        role: "admin",
      },
      { adminClient: client },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.role).toBe("admin");
    expect(body.tokens).toBe(99999);

    expect(state.profiles[0].role).toBe("admin");
    expect(state.profiles[0].tokens).toBe(99999);

    expect(state.userRoles).toHaveLength(1);
    expect(state.userRoles[0].role).toBe("admin");
    expect(state.userRoles[0].user_id).toBe(body.userId);
  });

  it("rolls back Auth user creation if downstream database write fails", async () => {
    const { client, state } = createMockAdminClient({
      profileError: { message: "Database connection lost" },
    });

    const res = await executeCreateAccount(
      {
        fullName: "Failed User",
        email: "failed@example.com",
        password: "password123",
      },
      { adminClient: client },
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(state.deletedUserId).not.toBeNull();
  });
});
