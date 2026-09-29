import { computeSmsHash, extractPaymentFields, isParsedPayment } from "@/bigsta/utils/smsFields";

const SECRET_KEY = "webhook_secret";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getWebhookSecret(): Promise<string> {
  const db = await admin();
  const { data } = await db.from("system_settings").select("config_value").eq("id", SECRET_KEY).maybeSingle();
  const stored = (data?.config_value as { secret?: string } | null)?.secret;
  if (stored) return stored;
  if (process.env["WEBHOOK_SECRET_KEY"]) return process.env["WEBHOOK_SECRET_KEY"]!;
  return regenerateWebhookSecret();
}

export async function regenerateWebhookSecret(): Promise<string> {
  const db = await admin();
  const secret = "BIGsta_SEC_" + crypto.randomUUID().replace(/-/g, "");
  const { error } = await db
    .from("system_settings")
    .upsert({ id: SECRET_KEY, config_key: SECRET_KEY, config_value: { secret }, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return secret;
}

export async function saveWebhookSettings(value: Record<string, unknown>) {
  const db = await admin();
  const { error } = await db
    .from("system_settings")
    .upsert({ id: "webhook_settings", config_key: "webhook_settings", config_value: value as never, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

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
  if (!payload.secret || payload.secret !== secret) {
    const error = !payload.secret ? "Missing Secret" : "Invalid Secret";
    return json({ success: false, received: true, status: "FAILED", error }, 401);
  }
  if (!rawSms.trim()) return json({ success: false, received: true, status: "FAILED", error: "Empty SMS body" }, 400);

  const db = await admin();
  const fields = extractPaymentFields(sender, rawSms);
  const parsed = isParsedPayment(fields);
  const smsHash = await computeSmsHash(sender, rawSms, receivedAt);

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
    })
    .select("id")
    .maybeSingle();

  if (insErr?.code === "23505") return json({ success: true, received: true, status: "DUPLICATE" });
  if (insErr || !row) {
    console.error("[SMS] insert failed", insErr);
    return json({ success: false, received: true, status: "FAILED", error: insErr?.message || "Not stored" }, 502);
  }
  if (!parsed) {
    return json({ success: false, received: true, stored: true, status: "PARSE_FAILED", error: "Unsupported SMS format: stored for manual review" }, 422);
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
  const { data: existing } = await db.from("user_payments").select("id").eq("reference", fields.reference!).limit(1);
  const { error } = existing && existing.length
    ? await db.from("user_payments").update(paymentRow).eq("id", existing[0].id)
    : await db.from("user_payments").insert({ id: crypto.randomUUID(), status: "PENDING", tokens_granted: 0, ...paymentRow });
  if (error) return json({ success: false, received: true, stored: true, status: "FAILED", error: error.message }, 502);

  return json({ success: true, received: true, status: "COMPLETED", trace_id: row.id });
}

export async function smsStats() {
  const db = await admin();
  const { data, error } = await db
    .from("sms_logs")
    .select("id, received_at, sender, raw_sms, device_id, processing_state, status, amount, reference")
    .eq("source", "webhook")
    .order("received_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}
