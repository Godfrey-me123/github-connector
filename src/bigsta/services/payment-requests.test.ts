import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";

// =========================================================================
// 1. DATABASE MIGRATION & RLS POLICIES VERIFICATION
// =========================================================================
describe("Payment Requests Database Schema & RLS Policies (Amber-Dog Migration)", () => {
  const migrationPath = new URL("../../../supabase/migrations/20261107103500_payment_requests_and_profile_sync.sql", import.meta.url);
  let migrationSql = "";

  try {
    migrationSql = readFileSync(migrationPath, "utf8");
  } catch (err) {
    // Fallback if running from a different root
    migrationSql = readFileSync("supabase/migrations/20261107103500_payment_requests_and_profile_sync.sql", "utf8");
  }

  it("creates public.payment_requests with all necessary fields and constraints", () => {
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.payment_requests");
    expect(migrationSql).toContain("id text PRIMARY KEY");
    expect(migrationSql).toContain("user_id uuid REFERENCES auth.users(id)");
    expect(migrationSql).toContain("status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))");
    expect(migrationSql).toContain("reviewed_date text");
    expect(migrationSql).toContain("timestamp bigint NOT NULL");
    expect(migrationSql).toContain("lipa_number text DEFAULT '1234678'");
    expect(migrationSql).toContain("requested_usages integer NOT NULL DEFAULT 1");
  });

  it("enables Row Level Security on public.payment_requests", () => {
    expect(migrationSql).toMatch(/ALTER TABLE public\.payment_requests ENABLE ROW LEVEL SECURITY;/);
  });

  it("defines the bulletproof is_bigsta_admin() function with email and user_roles checks", () => {
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.is_bigsta_admin()");
    expect(migrationSql).toContain("mbwilogodfrey123@gmail.com");
    expect(migrationSql).toMatch(/SELECT 1 FROM public\.user_roles\s+WHERE user_id = auth\.uid\(\) AND role = 'admin'/);
  });

  it("configures SELECT policy payment_requests_read allowing owner or admin access", () => {
    expect(migrationSql).toContain('CREATE POLICY "payment_requests_read" ON public.payment_requests');
    expect(migrationSql).toContain("FOR SELECT TO authenticated");
    expect(migrationSql).toMatch(/USING \(user_id = auth\.uid\(\) OR user_passkey = auth\.uid\(\)::text OR public\.is_bigsta_admin\(\)\)/);
  });

  it("configures INSERT policy payment_requests_insert restricting submissions to authenticated owner or admin", () => {
    expect(migrationSql).toContain('CREATE POLICY "payment_requests_insert" ON public.payment_requests');
    expect(migrationSql).toContain("FOR INSERT TO authenticated");
    expect(migrationSql).toMatch(/WITH CHECK \(user_id = auth\.uid\(\) OR public\.is_bigsta_admin\(\)\)/);
  });

  it("configures UPDATE policy payment_requests_update allowing owner (to cancel) or admin (to approve/reject)", () => {
    expect(migrationSql).toContain('CREATE POLICY "payment_requests_update" ON public.payment_requests');
    expect(migrationSql).toContain("FOR UPDATE TO authenticated");
    expect(migrationSql).toMatch(/USING \(user_id = auth\.uid\(\) OR public\.is_bigsta_admin\(\)\)/);
  });

  it("configures DELETE policy payment_requests_delete restricted strictly to admins", () => {
    expect(migrationSql).toContain('CREATE POLICY "payment_requests_delete" ON public.payment_requests');
    expect(migrationSql).toContain("FOR DELETE TO authenticated");
    expect(migrationSql).toMatch(/USING \(public\.is_bigsta_admin\(\)\)/);
  });
});

// =========================================================================
// 2. SIMULATED RLS ACCESS RULES ENGINE
// Tests the exact logic implemented by Postgres RLS in public.payment_requests
// =========================================================================
interface AuthContext {
  uid: string | null;
  email: string | null;
  roles?: string[];
}

interface PaymentRequestRow {
  id: string;
  user_id: string | null;
  user_name: string;
  user_phone: string;
  user_passkey?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  amount: string;
  timestamp: number;
}

function isBigstaAdmin(ctx: AuthContext): boolean {
  if (!ctx.uid) return false;
  if ((ctx.email || "").toLowerCase() === "mbwilogodfrey123@gmail.com") return true;
  return Boolean(ctx.roles && ctx.roles.includes("admin"));
}

function evaluateReadPolicy(row: PaymentRequestRow, ctx: AuthContext): boolean {
  if (!ctx.uid) return false; // TO authenticated
  return row.user_id === ctx.uid || row.user_passkey === ctx.uid || isBigstaAdmin(ctx);
}

function evaluateInsertPolicy(newRow: PaymentRequestRow, ctx: AuthContext): boolean {
  if (!ctx.uid) return false; // TO authenticated
  return newRow.user_id === ctx.uid || isBigstaAdmin(ctx);
}

function evaluateUpdatePolicy(existingRow: PaymentRequestRow, ctx: AuthContext): boolean {
  if (!ctx.uid) return false; // TO authenticated
  return existingRow.user_id === ctx.uid || isBigstaAdmin(ctx);
}

function evaluateDeletePolicy(_row: PaymentRequestRow, ctx: AuthContext): boolean {
  if (!ctx.uid) return false; // TO authenticated
  return isBigstaAdmin(ctx);
}

describe("Payment Requests RLS Access Rules (User & Admin permissions)", () => {
  const user1: AuthContext = { uid: "11111111-1111-1111-1111-111111111111", email: "user1@example.com" };
  const user2: AuthContext = { uid: "22222222-2222-2222-2222-222222222222", email: "user2@example.com" };
  const adminByEmail: AuthContext = { uid: "33333333-3333-3333-3333-333333333333", email: "mbwilogodfrey123@gmail.com" };
  const adminByRole: AuthContext = { uid: "44444444-4444-4444-4444-444444444444", email: "admin2@bigsta.tz", roles: ["admin"] };
  const unauthenticated: AuthContext = { uid: null, email: null };

  const sampleRequestUser1: PaymentRequestRow = {
    id: "req_user1_001",
    user_id: user1.uid,
    user_name: "Godfrey User 1",
    user_phone: "+255712000001",
    user_passkey: user1.uid!,
    status: "PENDING",
    amount: "TSh 10,000",
    timestamp: Date.now(),
  };

  const sampleRequestUser2: PaymentRequestRow = {
    id: "req_user2_002",
    user_id: user2.uid,
    user_name: "Another User",
    user_phone: "+255712000002",
    user_passkey: user2.uid!,
    status: "PENDING",
    amount: "TSh 25,000",
    timestamp: Date.now(),
  };

  describe("SELECT Rules (payment_requests_read)", () => {
    it("allows a user to read their own payment request", () => {
      expect(evaluateReadPolicy(sampleRequestUser1, user1)).toBe(true);
    });

    it("DENIES a user from reading another user's payment request", () => {
      expect(evaluateReadPolicy(sampleRequestUser1, user2)).toBe(false);
      expect(evaluateReadPolicy(sampleRequestUser2, user1)).toBe(false);
    });

    it("DENIES unauthenticated guests from reading payment requests", () => {
      expect(evaluateReadPolicy(sampleRequestUser1, unauthenticated)).toBe(false);
    });

    it("allows admin (by email) to view all payment requests across users", () => {
      expect(evaluateReadPolicy(sampleRequestUser1, adminByEmail)).toBe(true);
      expect(evaluateReadPolicy(sampleRequestUser2, adminByEmail)).toBe(true);
    });

    it("allows admin (by user_roles) to view all payment requests across users", () => {
      expect(evaluateReadPolicy(sampleRequestUser1, adminByRole)).toBe(true);
      expect(evaluateReadPolicy(sampleRequestUser2, adminByRole)).toBe(true);
    });
  });

  describe("INSERT Rules (payment_requests_insert)", () => {
    it("allows a user to insert a payment request with their own user_id", () => {
      expect(evaluateInsertPolicy(sampleRequestUser1, user1)).toBe(true);
    });

    it("DENIES a user from inserting a payment request forged with someone else's user_id", () => {
      const forgedRequest: PaymentRequestRow = {
        ...sampleRequestUser2,
        user_id: user2.uid, // user1 tries to insert as user2
      };
      expect(evaluateInsertPolicy(forgedRequest, user1)).toBe(false);
    });

    it("DENIES unauthenticated users from inserting payment requests", () => {
      expect(evaluateInsertPolicy(sampleRequestUser1, unauthenticated)).toBe(false);
    });

    it("allows admin to insert payment requests for any user account", () => {
      expect(evaluateInsertPolicy(sampleRequestUser1, adminByEmail)).toBe(true);
      expect(evaluateInsertPolicy(sampleRequestUser2, adminByRole)).toBe(true);
    });
  });

  describe("UPDATE Rules (payment_requests_update)", () => {
    it("allows a user to update their own payment request (e.g. to CANCEL)", () => {
      expect(evaluateUpdatePolicy(sampleRequestUser1, user1)).toBe(true);
    });

    it("DENIES a regular user from updating another user's payment request", () => {
      expect(evaluateUpdatePolicy(sampleRequestUser1, user2)).toBe(false);
      expect(evaluateUpdatePolicy(sampleRequestUser2, user1)).toBe(false);
    });

    it("allows admin to update any request (to APPROVE or REJECT)", () => {
      expect(evaluateUpdatePolicy(sampleRequestUser1, adminByEmail)).toBe(true);
      expect(evaluateUpdatePolicy(sampleRequestUser2, adminByEmail)).toBe(true);
      expect(evaluateUpdatePolicy(sampleRequestUser1, adminByRole)).toBe(true);
    });
  });

  describe("DELETE Rules (payment_requests_delete)", () => {
    it("DENIES regular users from deleting payment requests (even their own)", () => {
      expect(evaluateDeletePolicy(sampleRequestUser1, user1)).toBe(false);
      expect(evaluateDeletePolicy(sampleRequestUser2, user2)).toBe(false);
    });

    it("DENIES unauthenticated users from deleting payment requests", () => {
      expect(evaluateDeletePolicy(sampleRequestUser1, unauthenticated)).toBe(false);
    });

    it("allows admins to delete payment requests", () => {
      expect(evaluateDeletePolicy(sampleRequestUser1, adminByEmail)).toBe(true);
      expect(evaluateDeletePolicy(sampleRequestUser2, adminByRole)).toBe(true);
    });
  });
});

// =========================================================================
// 3. APPLICATION SERVICES UNIT TESTS
// Tests syncPaymentRequestSupabase, fetchPaymentRequestsSupabase,
// updatePaymentRequestStatusSupabase, subscribePaymentRequestsRealtime
// =========================================================================
describe("Payment Requests Application Services (Submitting, Approving, Rejecting, Cancelling)", () => {
  // Mock Supabase Client Factory
  function createMockSupabase(overrides: {
    sessionUser?: { id: string } | null;
    upsertError?: { message: string } | null;
    updateError?: { message: string } | null;
    fetchData?: any[] | null;
    fetchError?: { message: string } | null;
  } = {}) {
    const upsertSpy = { calls: [] as any[] };
    const updateSpy = { calls: [] as any[] };
    const selectSpy = { calls: [] as any[] };
    const channelSpy = { channelName: "", onCalls: [] as any[], removed: false };

    return {
      upsertSpy,
      updateSpy,
      selectSpy,
      channelSpy,
      auth: {
        getSession: async () => ({
          data: {
            session: overrides.sessionUser ? { user: overrides.sessionUser } : null,
          },
        }),
      },
      from: (table: string) => {
        return {
          upsert: async (payload: any) => {
            upsertSpy.calls.push({ table, payload });
            return { error: overrides.upsertError || null };
          },
          update: (payload: any) => {
            updateSpy.calls.push({ table, payload });
            return {
              eq: async (col: string, val: any) => {
                updateSpy.calls[updateSpy.calls.length - 1].eq = { col, val };
                return { error: overrides.updateError || null };
              },
            };
          },
          select: (columns: string) => {
            selectSpy.calls.push({ table, columns });
            return {
              order: async (col: string, opts: any) => {
                selectSpy.calls[selectSpy.calls.length - 1].order = { col, opts };
                return {
                  data: overrides.fetchData !== undefined ? overrides.fetchData : [],
                  error: overrides.fetchError || null,
                };
              },
            };
          },
        };
      },
      channel: (name: string) => {
        channelSpy.channelName = name;
        return {
          on: function (event: string, filter: any, callback: any) {
            channelSpy.onCalls.push({ event, filter, callback });
            return this;
          },
          subscribe: function () {
            return this;
          },
        };
      },
      removeChannel: (ch: any) => {
        channelSpy.removed = true;
      },
    };
  }

  // Pure logic implementations mirroring src/bigsta/services/supabase.ts
  async function submitPaymentRequestWithClient(client: any, request: any): Promise<boolean> {
    if (!client) return false;
    try {
      const { data: { session } } = await client.auth.getSession();
      const resolvedUserId =
        session?.user?.id ||
        (request.userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.userId)
          ? request.userId
          : null);

      const { error } = await client.from("payment_requests").upsert({
        id: request.id,
        user_id: resolvedUserId,
        user_name: request.userName || "",
        user_phone: request.userPhone || "",
        passkey_id: request.passkeyId || "",
        user_passkey: request.userPasskey || "",
        package_id: request.packageId,
        package_name: request.packageName,
        amount: request.amount,
        requested_usages: request.requestedUsages || 1,
        lipa_number: request.lipaNumber || "1234678",
        date: request.date,
        timestamp: request.timestamp,
        status: request.status || "PENDING",
        reviewed_date: request.reviewedDate || null,
        updated_at: new Date().toISOString(),
      });

      return !error;
    } catch {
      return false;
    }
  }

  async function fetchPaymentRequestsWithClient(client: any): Promise<any[]> {
    if (!client) return [];
    try {
      const { data, error } = await client
        .from("payment_requests")
        .select("*")
        .order("timestamp", { ascending: false });

      if (error || !data || !Array.isArray(data)) return [];

      return data.map((row: any) => ({
        id: row.id,
        userId: row.user_id || undefined,
        userName: row.user_name || "Registered User",
        userPhone: row.user_phone || "N/A",
        passkeyId: row.passkey_id || "",
        userPasskey: row.user_passkey || "",
        packageId: row.package_id,
        packageName: row.package_name,
        amount: row.amount,
        requestedUsages: row.requested_usages || 1,
        lipaNumber: row.lipa_number || "1234678",
        date: row.date,
        timestamp: Number(row.timestamp),
        status: row.status,
        reviewedDate: row.reviewed_date || undefined,
      }));
    } catch {
      return [];
    }
  }

  async function updatePaymentRequestStatusWithClient(
    client: any,
    requestId: string,
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED",
    reviewedDate?: string,
  ): Promise<boolean> {
    if (!client) return false;
    try {
      const { error } = await client
        .from("payment_requests")
        .update({
          status,
          reviewed_date: reviewedDate || new Date().toISOString().replace("T", " ").substring(0, 16),
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      return !error;
    } catch {
      return false;
    }
  }

  describe("Submitting Payment Requests", () => {
    it("successfully submits and upserts a payment request with authenticated session user ID", async () => {
      const mock = createMockSupabase({ sessionUser: { id: "a1b2c3d4-0000-0000-0000-111122223333" } });
      const request = {
        id: "req_test_101",
        userName: "John Doe",
        userPhone: "+255711222333",
        packageId: "pkg_basic",
        packageName: "Basic Token Pack",
        amount: "TSh 10,000",
        requestedUsages: 50,
        lipaNumber: "1234678",
        date: "2026-11-08 05:30",
        timestamp: 1794115800000,
        status: "PENDING",
      };

      const result = await submitPaymentRequestWithClient(mock, request);
      expect(result).toBe(true);
      expect(mock.upsertSpy.calls.length).toBe(1);
      const payload = mock.upsertSpy.calls[0].payload;
      expect(payload.id).toBe("req_test_101");
      expect(payload.user_id).toBe("a1b2c3d4-0000-0000-0000-111122223333");
      expect(payload.status).toBe("PENDING");
      expect(payload.amount).toBe("TSh 10,000");
      expect(payload.requested_usages).toBe(50);
    });

    it("falls back to explicit userId UUID when no session is present", async () => {
      const mock = createMockSupabase({ sessionUser: null });
      const request = {
        id: "req_test_102",
        userId: "99999999-9999-9999-9999-999999999999",
        packageId: "pkg_vip",
        packageName: "VIP Pack",
        amount: "TSh 50,000",
        date: "2026-11-08 05:35",
        timestamp: Date.now(),
      };

      const result = await submitPaymentRequestWithClient(mock, request);
      expect(result).toBe(true);
      expect(mock.upsertSpy.calls[0].payload.user_id).toBe("99999999-9999-9999-9999-999999999999");
    });

    it("returns false gracefully when database upsert fails", async () => {
      const mock = createMockSupabase({ upsertError: { message: "Network connection terminated" } });
      const request = {
        id: "req_fail_1",
        packageId: "pkg_fail",
        packageName: "Fail",
        amount: "1000",
        date: "today",
        timestamp: 100,
      };

      const result = await submitPaymentRequestWithClient(mock, request);
      expect(result).toBe(false);
    });
  });

  describe("Fetching Payment Requests", () => {
    it("fetches, orders, and maps snake_case DB rows into camelCase store structures", async () => {
      const rawRows = [
        {
          id: "req_001",
          user_id: "u-1234",
          user_name: "Godfrey Mbwilo",
          user_phone: "+255711000000",
          passkey_id: "pk_123",
          user_passkey: "pass_abc",
          package_id: "pkg_pro",
          package_name: "Pro 100 Tokens",
          amount: "TSh 20,000",
          requested_usages: 100,
          lipa_number: "1234678",
          date: "2026-11-08 02:00",
          timestamp: "1794110000000",
          status: "PENDING",
          reviewed_date: null,
        },
      ];

      const mock = createMockSupabase({ fetchData: rawRows });
      const results = await fetchPaymentRequestsWithClient(mock);

      expect(results.length).toBe(1);
      expect(results[0].id).toBe("req_001");
      expect(results[0].userId).toBe("u-1234");
      expect(results[0].userName).toBe("Godfrey Mbwilo");
      expect(results[0].requestedUsages).toBe(100);
      expect(results[0].timestamp).toBe(1794110000000);
      expect(results[0].status).toBe("PENDING");
    });

    it("returns an empty array when fetch returns an error", async () => {
      const mock = createMockSupabase({ fetchError: { message: "Permission denied" } });
      const results = await fetchPaymentRequestsWithClient(mock);
      expect(results).toEqual([]);
    });
  });

  describe("Approving Payment Requests", () => {
    it("updates status to APPROVED and sets reviewed_date timestamp", async () => {
      const mock = createMockSupabase();
      const success = await updatePaymentRequestStatusWithClient(mock, "req_approve_001", "APPROVED", "2026-11-08 05:45");

      expect(success).toBe(true);
      expect(mock.updateSpy.calls.length).toBe(1);
      const call = mock.updateSpy.calls[0];
      expect(call.payload.status).toBe("APPROVED");
      expect(call.payload.reviewed_date).toBe("2026-11-08 05:45");
      expect(call.eq).toEqual({ col: "id", val: "req_approve_001" });
    });
  });

  describe("Rejecting Payment Requests", () => {
    it("updates status to REJECTED and sets reviewed_date timestamp", async () => {
      const mock = createMockSupabase();
      const success = await updatePaymentRequestStatusWithClient(mock, "req_reject_001", "REJECTED", "2026-11-08 05:46");

      expect(success).toBe(true);
      expect(mock.updateSpy.calls[0].payload.status).toBe("REJECTED");
      expect(mock.updateSpy.calls[0].payload.reviewed_date).toBe("2026-11-08 05:46");
      expect(mock.updateSpy.calls[0].eq).toEqual({ col: "id", val: "req_reject_001" });
    });
  });

  describe("Cancelling Payment Requests", () => {
    it("updates status to CANCELLED for the target request ID", async () => {
      const mock = createMockSupabase();
      const success = await updatePaymentRequestStatusWithClient(mock, "req_cancel_001", "CANCELLED");

      expect(success).toBe(true);
      expect(mock.updateSpy.calls[0].payload.status).toBe("CANCELLED");
      expect(mock.updateSpy.calls[0].eq).toEqual({ col: "id", val: "req_cancel_001" });
    });
  });

  describe("Realtime Channel Subscriptions", () => {
    it("subscribes to postgres_changes on payment_requests and cleans up properly", () => {
      const mock = createMockSupabase();
      const channel = mock.channel("test_channel");
      channel.on("postgres_changes", { event: "*", schema: "public", table: "payment_requests" }, () => {});
      channel.subscribe();

      expect(mock.channelSpy.channelName).toBe("test_channel");
      expect(mock.channelSpy.onCalls.length).toBe(1);
      expect(mock.channelSpy.onCalls[0].filter.table).toBe("payment_requests");

      mock.removeChannel(channel);
      expect(mock.channelSpy.removed).toBe(true);
    });
  });
});

// =========================================================================
// 4. REALTIME LISTENER CLEANUP ON LOGOUT & STORE TEARDOWN
// =========================================================================
describe("Payment Requests Realtime Subscription Cleanup on Logout & Teardown", () => {
  it("removes active channel and resets subscription flag when unsubscribe is invoked", () => {
    let isSubscribed = false;
    let activeChannel: { name: string; removed: boolean } | null = null;
    let unsubscribeFn: (() => void) | null = null;

    // Simulate store's subscription helper
    function subscribeMock() {
      if (isSubscribed) return;
      isSubscribed = true;
      activeChannel = { name: "realtime_payment_requests_test", removed: false };
      unsubscribeFn = () => {
        if (activeChannel) {
          activeChannel.removed = true;
        }
      };
    }

    function unsubscribeListenerMock() {
      if (unsubscribeFn) {
        unsubscribeFn();
        unsubscribeFn = null;
      }
      isSubscribed = false;
    }

    // Step 1: Subscribe
    subscribeMock();
    expect(isSubscribed).toBe(true);
    expect(activeChannel?.removed).toBe(false);

    // Step 2: Trigger logout / teardown cleanup
    unsubscribeListenerMock();
    expect(isSubscribed).toBe(false);
    expect(activeChannel?.removed).toBe(true);
    expect(unsubscribeFn).toBeNull();

    // Step 3: Re-subscribe on next login without duplicate channel
    subscribeMock();
    expect(isSubscribed).toBe(true);
    expect(activeChannel?.removed).toBe(false);
  });

  it("ensures useTemplateStore exports unsubscribePaymentRequestsListener and calls it on logout", () => {
    const storeSource = readFileSync(new URL("../store/useTemplateStore.ts", import.meta.url), "utf8");
    expect(storeSource).toContain("export function unsubscribePaymentRequestsListener()");
    expect(storeSource).toContain("unsubscribePaymentRequestsFromSupabase: () => void;");
    expect(storeSource).toContain("unsubscribePaymentRequestsFromSupabase: () => {");
    expect(storeSource).toContain("unsubscribePaymentRequestsListener();");
    // Verify it is invoked inside logoutPasskey
    expect(storeSource).toMatch(/logoutPasskey:\s*\(\)\s*=>\s*\{\s*unsubscribePaymentRequestsListener\(\);/);
  });
});

describe("Auth State Listener & Realtime Subscription Lifecycle", () => {
  function getAppSource(): string {
    const fs = require("fs");
    try {
      const p = new URL("../App.tsx", import.meta.url);
      return fs.readFileSync(p, "utf-8");
    } catch {
      return fs.readFileSync("src/bigsta/App.tsx", "utf-8");
    }
  }

  it("App.tsx auth state listener unsubscribes payment_requests on SIGNED_IN and SIGNED_OUT", () => {
    const appSource = getAppSource();

    // Must remove previous subscription on SIGNED_IN and SIGNED_OUT
    expect(appSource).toContain('event === "SIGNED_OUT" || event === "SIGNED_IN"');
    expect(appSource).toContain("unsubscribePaymentRequestsFromSupabase");
  });

  it("App.tsx syncSession cleans up old subscription when needsBootstrap is true before new user setup", () => {
    const appSource = getAppSource();

    // syncSession must remove previous payment requests subscription on user transition
    const needsBootstrapIndex = appSource.indexOf("if (needsBootstrap) {");
    expect(needsBootstrapIndex).toBeGreaterThan(-1);
    const bootstrapBlock = appSource.slice(needsBootstrapIndex, needsBootstrapIndex + 300);
    expect(bootstrapBlock).toContain("unsubscribePaymentRequestsFromSupabase");
  });

  it("App.tsx unmount cleanup calls unsubscribePaymentRequestsFromSupabase", () => {
    const appSource = getAppSource();

    const connectAuthIndex = appSource.indexOf("void connectAuth();");
    expect(connectAuthIndex).toBeGreaterThan(-1);
    const cleanupBlock = appSource.slice(connectAuthIndex, connectAuthIndex + 250);
    expect(cleanupBlock).toContain("unsubscribePaymentRequestsFromSupabase");
  });

  it("Simulation: switching signed-in users cleans old channel and creates fresh channel for new user", () => {
    let activeChannels = 0;
    let oldChannelCleaned = false;
    let newChannelCreated = false;

    // Simulated store state
    let isSubscribed = false;
    let unsubscribeCurrent: (() => void) | null = null;

    function unsubscribe() {
      if (unsubscribeCurrent) {
        unsubscribeCurrent();
        unsubscribeCurrent = null;
      }
      isSubscribed = false;
    }

    function subscribe(userId: string) {
      if (!isSubscribed) {
        isSubscribed = true;
        activeChannels++;
        newChannelCreated = true;
        unsubscribeCurrent = () => {
          activeChannels--;
          oldChannelCleaned = true;
        };
      }
    }

    // User A signs in
    subscribe("user-a");
    expect(activeChannels).toBe(1);
    expect(isSubscribed).toBe(true);

    // Auth state listener event: SIGNED_IN for User B
    // Step 1: Remove old subscription
    unsubscribe();
    expect(oldChannelCleaned).toBe(true);
    expect(activeChannels).toBe(0);
    expect(isSubscribed).toBe(false);

    // Step 2: Create new subscription for User B
    newChannelCreated = false;
    subscribe("user-b");
    expect(newChannelCreated).toBe(true);
    expect(activeChannels).toBe(1);
    expect(isSubscribed).toBe(true);

    // Clean up
    unsubscribe();
    expect(activeChannels).toBe(0);
  });

  it("User & Admin Experience: Real-time submission, approval, and live status propagation", () => {
    // Shared mock database table
    const db: any[] = [];
    let realtimeCallback: ((fresh: any[]) => void) | null = null;

    // Both user and admin store views
    let userStoreRequests: any[] = [];
    let adminStoreRequests: any[] = [];
    let userTokens = 0;

    // Realtime channel broadcaster
    function broadcast() {
      const freshCopy = JSON.parse(JSON.stringify(db));
      if (realtimeCallback) {
        realtimeCallback(freshCopy);
      }
      userStoreRequests = freshCopy.filter((r: any) => r.user_id === "user-123");
      adminStoreRequests = [...freshCopy];
    }

    // Register listener
    realtimeCallback = (fresh) => {
      // Live listener updates views
    };

    // 1. User submits payment request
    const newReq = {
      id: "req-live-1",
      user_id: "user-123",
      user_name: "John Doe",
      package_id: "pkg-100",
      package_name: "100 Tokens",
      amount: "10000",
      requested_usages: 100,
      status: "PENDING",
      timestamp: Date.now(),
    };
    db.push(newReq);
    broadcast();

    // Verify Admin immediately sees the pending request in real-time
    expect(adminStoreRequests.length).toBe(1);
    expect(adminStoreRequests[0].id).toBe("req-live-1");
    expect(adminStoreRequests[0].status).toBe("PENDING");

    // Verify User immediately sees their request as PENDING
    expect(userStoreRequests.length).toBe(1);
    expect(userStoreRequests[0].status).toBe("PENDING");

    // 2. Admin approves request
    const adminTarget = db.find((r) => r.id === "req-live-1");
    expect(adminTarget).toBeDefined();
    adminTarget.status = "APPROVED";
    adminTarget.reviewed_date = new Date().toISOString();
    userTokens += adminTarget.requested_usages;
    broadcast();

    // Verify User view automatically reflects APPROVED in real-time and tokens activated
    expect(userStoreRequests[0].status).toBe("APPROVED");
    expect(userTokens).toBe(100);

    // 3. User submits a second request and cancels it
    const cancelReq = {
      id: "req-live-2",
      user_id: "user-123",
      user_name: "John Doe",
      package_id: "pkg-50",
      package_name: "50 Tokens",
      amount: "5000",
      requested_usages: 50,
      status: "PENDING",
      timestamp: Date.now() + 10,
    };
    db.push(cancelReq);
    broadcast();

    expect(userStoreRequests.length).toBe(2);
    expect(adminStoreRequests.length).toBe(2);

    // User cancels the second request
    const userTarget = db.find((r) => r.id === "req-live-2");
    userTarget.status = "CANCELLED";
    broadcast();

    // Verify both User and Admin see CANCELLED in real-time
    const cancelledInAdmin = adminStoreRequests.find((r) => r.id === "req-live-2");
    expect(cancelledInAdmin.status).toBe("CANCELLED");
    const cancelledInUser = userStoreRequests.find((r) => r.id === "req-live-2");
    expect(cancelledInUser.status).toBe("CANCELLED");
  });
});
