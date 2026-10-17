import { computeSmsHash, extractPaymentFields, isParsedPayment } from "@/bigsta/utils/smsFields";

const SECRET_KEY = "webhook_secret";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getWebhookSecret(): Promise<string> {
  if (process.env["WEBHOOK_SECRET_KEY"]) return process.env["WEBHOOK_SECRET_KEY"]!;
  try {
    const db = await admin();
    const { data, error } = await db
      .from("system_settings")
      .select("config_value")
      .eq("id", SECRET_KEY)
      .maybeSingle();
    if (!error && data?.config_value) {
      const stored = (data.config_value as { secret?: string } | null)?.secret;
      if (stored) return stored;
    }
    return await regenerateWebhookSecret();
  } catch (e) {
    console.warn("[Webhook Secret] Could not load from system_settings, using fallback secret:", e);
    return "BIGsta_SEC_DEFAULT_WEBHOOK_SECRET";
  }
}

export async function regenerateWebhookSecret(): Promise<string> {
  const secret = "BIGsta_SEC_" + crypto.randomUUID().replace(/-/g, "");
  try {
    const db = await admin();
    const { error } = await db.from("system_settings").upsert({
      id: SECRET_KEY,
      config_key: SECRET_KEY,
      config_value: { secret },
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn("[Webhook Secret] Could not persist secret:", error.message);
  } catch (e) {
    console.warn("[Webhook Secret] Could not reach database to persist secret:", e);
  }
  return secret;
}

export async function saveWebhookSettings(value: Record<string, unknown>) {
  try {
    const db = await admin();
    const { error } = await db.from("system_settings").upsert({
      id: "webhook_settings",
      config_key: "webhook_settings",
      config_value: value as never,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn("[Webhook Settings] Could not persist settings:", error.message);
  } catch (e) {
    console.warn("[Webhook Settings] Could not reach database to save settings:", e);
  }
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

async function logWebhookFailure(error: string, sender: string, request: Request) {
  try {
    const db = await admin();
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";
    await db.from("audit_logs").insert({
      id: crypto.randomUUID(),
      action: "sms_webhook_rejected",
      details: `${error} · sender=${sender} · ip=${ip}`.slice(0, 1000),
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[SMS] failed to log rejection", e);
  }
}

export async function gatewayStatus(origin: string) {
  const db = await admin();
  const checks: { name: string; ok: boolean; detail: string }[] = [];

  // 1. Webhook reachable (GET the public endpoint over the network)
  try {
    const r = await fetch(`${origin}/api/public/payment-sms`, { method: "GET" });
    checks.push({
      name: "Webhook reachable",
      ok: r.ok,
      detail: r.ok ? `HTTP ${r.status}` : `HTTP ${r.status}`,
    });
  } catch (e: any) {
    checks.push({ name: "Webhook reachable", ok: false, detail: e?.message || "Network error" });
  }

  // 2. Secret configured
  let secretOk = false;
  try {
    const s = await getWebhookSecret();
    secretOk = Boolean(s && s.length >= 16);
    checks.push({
      name: "Secret valid",
      ok: secretOk,
      detail: secretOk ? "Secret configured" : "Secret too short",
    });
  } catch (e: any) {
    checks.push({ name: "Secret valid", ok: false, detail: e?.message || "Could not read secret" });
  }

  // 3. Database writable (insert + delete a probe row)
  try {
    const probe = `probe_${crypto.randomUUID()}`;
    const { error: e1 } = await db.from("system_settings").upsert({
      id: "gateway_probe",
      config_key: "gateway_probe",
      config_value: { probe, at: new Date().toISOString() } as never,
      updated_at: new Date().toISOString(),
    });
    if (e1) throw new Error(e1.message);
    checks.push({ name: "Database writable", ok: true, detail: "Write succeeded" });
  } catch (e: any) {
    checks.push({ name: "Database writable", ok: false, detail: e?.message || "Write failed" });
  }

  // 4. Logs readable
  let lastReceived: string | null = null;
  let lastSaved: string | null = null;
  try {
    const { data, error } = await db
      .from("sms_logs")
      .select("received_at, created_at")
      .order("received_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    lastReceived = data?.[0]?.received_at ?? null;
    lastSaved = data?.[0]?.created_at ?? null;
    checks.push({
      name: "Logs readable",
      ok: true,
      detail: data?.length ? "Latest row found" : "No SMS yet",
    });
  } catch (e: any) {
    checks.push({ name: "Logs readable", ok: false, detail: e?.message || "Read failed" });
  }

  const { data: fail } = await db
    .from("audit_logs")
    .select("created_at, details")
    .eq("action", "sms_webhook_rejected")
    .order("created_at", { ascending: false })
    .limit(1);
  const { count: failedCount } = await db
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("action", "sms_webhook_rejected");

  return {
    ok: checks.every((c) => c.ok),
    checks,
    lastReceived,
    lastSaved,
    lastError: fail?.[0] ? { at: fail[0].created_at, detail: fail[0].details } : null,
    failedAttempts: failedCount ?? 0,
  };
}

export async function handleIncomingSms(request: Request): Promise<Response> {
  let payload: any = {};
  try {
    const ct = request.headers.get("content-type") || "";
    payload = ct.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
  } catch {
    return json({ success: false, received: true, status: "FAILED", error: "Invalid body" }, 400);
  }

  const sender = String(payload.sender || payload.from || "UNKNOWN").slice(0, 200);
  const rawSms = String(payload.raw_sms || payload.message || payload.text || "").slice(0, 5000);
  const device = String(payload.device_name || payload.device || "UNKNOWN").slice(0, 200);
  const receivedAt = new Date().toISOString();

  const secret = await getWebhookSecret();
  const provided =
    request.headers.get("x-bigsta-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    payload.secret ||
    new URL(request.url).searchParams.get("secret");
  if (!provided || provided !== secret) {
    const error = !provided ? "Missing Secret" : "Invalid Secret";
    await logWebhookFailure(error, sender, request);
    return json({ success: false, received: true, status: "FAILED", error }, 401);
  }
  if (!rawSms.trim())
    return json({ success: false, received: true, status: "FAILED", error: "Empty SMS body" }, 400);

  const db = await admin();
  const fields = extractPaymentFields(sender, rawSms);
  const parsed = isParsedPayment(fields);
  const smsHash = await computeSmsHash(sender, rawSms, receivedAt);
  const lower = rawSms.toLowerCase();
  const paymentType = /received|umepokea|imepokelewa|deposit/.test(lower)
    ? "RECEIVED"
    : /sent|umetuma|paid|umelipa/.test(lower)
      ? "SENT"
      : null;

  const { data: row, error: insErr } = await db
    .from("sms_logs")
    .insert({
      sms_hash: smsHash,
      sender,
      raw_sms: rawSms,
      received_at: receivedAt,
      device_id: device,
      network: fields.network,
      amount: fields.amount,
      reference: fields.reference,
      receiver: fields.receiver,
      balance: fields.balance,
      transaction_id: fields.transactionId,
      payer_name: fields.payerName,
      payer_phone: fields.payerPhone,
      status: "UNREVIEWED",
      processing_state: parsed ? "PARSED" : "PARSE_FAILED",
      source: "webhook",
      secret_verified: true,
      payment_type: paymentType,
    })
    .select("id")
    .maybeSingle();

  if (insErr?.code === "23505") return json({ success: true, received: true, status: "DUPLICATE" });
  if (insErr || !row) {
    console.error("[SMS] insert failed", insErr);
    return json(
      { success: false, received: true, status: "FAILED", error: insErr?.message || "Not stored" },
      502,
    );
  }
  if (!parsed) {
    return json(
      {
        success: false,
        received: true,
        stored: true,
        status: "PARSE_FAILED",
        error: "Unsupported SMS format: stored for manual review",
      },
      422,
    );
  }

  const name = fields.payerName || "Mobile Money User";
  const paymentRow = {
    user_name: name,
    user_phone: sender,
    amount: fields.amount as number,
    sender: name,
    receiver: device || "BIGsta Gateway",
    reference: fields.reference,
    payment_date: receivedAt,
  };
  const { data: existing } = await db
    .from("user_payments")
    .select("id")
    .eq("reference", fields.reference!)
    .limit(1);
  const { error } =
    existing && existing.length
      ? await db.from("user_payments").update(paymentRow).eq("id", existing[0]!.id)
      : await db
          .from("user_payments")
          .insert({ id: crypto.randomUUID(), status: "PENDING", tokens_granted: 0, ...paymentRow });
  if (error)
    return json(
      { success: false, received: true, stored: true, status: "FAILED", error: error.message },
      502,
    );

  return json({ success: true, received: true, status: "COMPLETED", trace_id: row.id });
}

export async function smsStats() {
  const db = await admin();
  const { data, error } = await db
    .from("sms_logs")
    .select(
      "id, received_at, sender, raw_sms, device_id, processing_state, status, amount, reference",
    )
    .eq("source", "webhook")
    .order("received_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}
