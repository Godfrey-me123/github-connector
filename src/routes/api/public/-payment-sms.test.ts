import { describe, expect, it, beforeEach } from "vitest";
import { handleIncomingSms } from "@/lib/sms-webhook.server";

const TEST_SECRET = "BIGsta_SEC_test_secret_for_automated_testing_12345";

function createMockSmsDb() {
  const state = {
    smsLogs: [] as any[],
    userPayments: [] as any[],
    auditLogs: [] as any[],
  };

  const db = {
    from: (table: string) => ({
      insert: (row: any) => {
        if (table === "sms_logs") {
          const id = "sms_log_" + Math.random().toString(36).slice(2, 9);
          const fullRow = { ...row, id };
          state.smsLogs.push(fullRow);
          return {
            select: () => ({
              maybeSingle: async () => ({ data: fullRow, error: null }),
            }),
          };
        }
        if (table === "audit_logs") {
          state.auditLogs.push(row);
          return Promise.resolve({ data: row, error: null });
        }
        if (table === "user_payments") {
          state.userPayments.push(row);
          return Promise.resolve({ error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      select: () => ({
        eq: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  };

  return { db, state };
}

describe("Canonical SMS Webhook Pipeline (/api/public/payment-sms)", () => {
  beforeEach(() => {
    process.env["WEBHOOK_SECRET_KEY"] = TEST_SECRET;
  });

  it("rejects unauthorized requests with 401 when X-BIGSTA-SECRET is missing", async () => {
    const { db } = createMockSmsDb();
    const req = new Request("https://bigsta.test/api/public/payment-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: "MPESA",
        message: "0123456789 Imepokelewa Tsh 5,000 kutoka kwa JUMA HAMISI tarehe 09/11/2026",
        device_name: "Admin-Phone",
      }),
    });

    const res = await handleIncomingSms(req, db);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Missing Secret");
  });

  it("rejects requests with 401 when an invalid secret is provided", async () => {
    const { db } = createMockSmsDb();
    const req = new Request("https://bigsta.test/api/public/payment-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BIGSTA-SECRET": "wrong_secret_key",
      },
      body: JSON.stringify({
        sender: "MPESA",
        message: "0123456789 Imepokelewa Tsh 5,000 kutoka kwa JUMA HAMISI tarehe 09/11/2026",
      }),
    });

    const res = await handleIncomingSms(req, db);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid Secret");
  });

  it("rejects empty SMS content with 400 Bad Request", async () => {
    const { db } = createMockSmsDb();
    const req = new Request("https://bigsta.test/api/public/payment-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BIGSTA-SECRET": TEST_SECRET,
      },
      body: JSON.stringify({
        sender: "MPESA",
        message: "   ",
      }),
    });

    const res = await handleIncomingSms(req, db);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Empty SMS body");
  });

  it("successfully ingests M-Pesa payment SMS with X-BIGSTA-SECRET header", async () => {
    const { db, state } = createMockSmsDb();
    const mpesaSms = "9K87654321 Imepokelewa Tsh 5,000 kutoka kwa JUMA HAMISI tarehe 09/11/2026. Salio lako jipya ni Tsh 25,000.";

    const req = new Request("https://bigsta.test/api/public/payment-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BIGSTA-SECRET": TEST_SECRET,
      },
      body: JSON.stringify({
        sender: "MPESA",
        message: mpesaSms,
        device_name: "Infinix-Admin",
      }),
    });

    const res = await handleIncomingSms(req, db);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe("COMPLETED");

    expect(state.smsLogs).toHaveLength(1);
    const log = state.smsLogs[0];
    expect(log.sender).toBe("MPESA");
    expect(log.amount).toBe(5000);
    expect(log.reference).toBe("9K87654321");
    expect(log.secret_verified).toBe(true);
    expect(log.device_id).toBe("Infinix-Admin");

    expect(state.userPayments).toHaveLength(1);
    expect(state.userPayments[0].amount).toBe(5000);
  });

  it("successfully ingests Tigo Pesa payment SMS using Bearer authorization fallback", async () => {
    const { db, state } = createMockSmsDb();
    const tigoSms = "Kumbukumbu No: 8765432109. Umepokea TSh 10,000 kutoka kwa ASHA BAKARI tarehe 09/11/2026. Salio lako ni TSh 15,000.";

    const req = new Request("https://bigsta.test/api/public/payment-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TEST_SECRET}`,
      },
      body: JSON.stringify({
        sender: "TigoPesa",
        message: tigoSms,
        device_name: "Galaxy-Admin",
      }),
    });

    const res = await handleIncomingSms(req, db);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    expect(state.smsLogs).toHaveLength(1);
    const log = state.smsLogs[0];
    expect(log.amount).toBe(10000);
    expect(log.reference).toBe("8765432109");
  });

  it("successfully ingests Airtel Money payment SMS", async () => {
    const { db, state } = createMockSmsDb();
    const airtelSms = "TxnID: AT9988776655. Umepokea Tsh 2,000 kutoka kwa DAUDI MWAMBA tarehe 09/11/2026.";

    const req = new Request("https://bigsta.test/api/public/payment-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bigsta-secret": TEST_SECRET,
      },
      body: JSON.stringify({
        sender: "AirtelMoney",
        message: airtelSms,
      }),
    });

    const res = await handleIncomingSms(req, db);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    expect(state.smsLogs).toHaveLength(1);
    const log = state.smsLogs[0];
    expect(log.amount).toBe(2000);
    expect(log.reference).toBe("AT9988776655");
  });
});
