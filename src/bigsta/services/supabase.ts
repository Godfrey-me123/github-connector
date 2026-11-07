// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
import { supabase as connectedSupabase } from "@/integrations/supabase/client";

const DEFAULT_TIMEOUT = 12000; // 12 seconds

/** Canonical category contract shared by database rows and Storage paths. */
export const TEMPLATE_CATEGORY_CONFIG: Record<string, { serviceType: string; folder: string }> = {
  nida: { serviceType: "nida", folder: "nida" },
  driving_license: { serviceType: "driving_license", folder: "driving_license" },
  passport: { serviceType: "passport", folder: "passport" },
  birth_certificate: { serviceType: "birth_certificate", folder: "birth_certificate" },
  nhif: { serviceType: "nhif", folder: "nhif" },
  nrc_zambia: { serviceType: "nrc_zambia", folder: "nrc_zambia" },
  tin: { serviceType: "tin", folder: "tin" },
  business_license: { serviceType: "business_license", folder: "business_license" },
  heslb: { serviceType: "heslb", folder: "heslb" },
  ajira: { serviceType: "ajira", folder: "ajira" },
};

export function normalizeTemplateCategory(value?: string | null): string {
  const normalized = String(value || "custom")
    .trim()
    .toLowerCase()
    .replace(/[\\s-]+/g, "_");
  if (normalized === "driving_licence") return "driving_license";
  if (normalized === "nrc") return "nrc_zambia";
  return normalized || "custom";
}

export function getTemplateCategoryConfig(value?: string | null) {
  const serviceType = normalizeTemplateCategory(value);
  return TEMPLATE_CATEGORY_CONFIG[serviceType] || { serviceType, folder: serviceType };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT,
  errorMsg: string = "Connection timed out. Please check your internet connection or try again.",
): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export const isSupabaseConfigured = Boolean(
  (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL) &&
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);

// Share the configured client: never select a second database or embedded key.
export const supabase = connectedSupabase;




// Race a promise against a timeout so a stalled network call can never hang a save.
function withTimeoutOrNull<T>(p: Promise<T>, ms: number, label: string): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((res) =>
      setTimeout(() => {
        console.warn(`[Supabase] ${label} timed out after ${ms}ms`);
        res(null);
      }, ms),
    ),
  ]);
}

// Helper: Upload Background to Supabase Storage
export async function uploadBackgroundToSupabase(
  file: File | Blob,
  filename: string,
  serviceType?: string,
): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { folder } = getTemplateCategoryConfig(serviceType);
    const cleanFilename = `${folder}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const result = await withTimeoutOrNull(
      supabase.storage.from("backgrounds").upload(cleanFilename, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      }),
      30000,
      "Background upload",
    );
    if (!result) return null;
    const { error } = result;
    if (error) {
      console.warn("Supabase storage upload warning:", error.message);
      return null;
    }
    const { data: publicUrlData } = supabase.storage
      .from("backgrounds")
      .getPublicUrl(cleanFilename);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Upload background failed:", err);
    return null;
  }
}

export async function registerBackgroundAssetSupabase(asset: {
  id: string;
  name: string;
  url: string;
  serviceType?: string;
}): Promise<boolean> {
  if (!supabase) return false;
  const { serviceType } = getTemplateCategoryConfig(asset.serviceType);
  const { error } = await supabase.from("background_assets").upsert({
    id: asset.id,
    name: asset.name,
    url: asset.url,
    service_type: serviceType,
  });
  return !error;
}

export async function fetchBackgroundAssetsSupabase(serviceType?: string): Promise<any[] | null> {
  if (!supabase) return null;
  const category = getTemplateCategoryConfig(serviceType).serviceType;
  const { data, error } = await supabase
    .from("background_assets")
    .select("id, name, url, service_type, created_at")
    .eq("service_type", category)
    .order("created_at", { ascending: false });
  if (error || !data) return null;
  return data;
}

// Helper: Sync/Upsert Manual Request on Supabase
export async function syncManualRequestSupabase(req: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("manual_requests").upsert({
      id: req.id,
      full_name: req.fullName,
      whatsapp_number: req.whatsappNumber,
      normal_call_number: req.normalCallNumber || req.normalNumber || "",
      service_name: req.serviceName,
      service_id: req.serviceId || null,
      user_passkey: req.userPasskey || req.accountKey || null,
      submitted_at: new Date(req.submittedAt || req.timestamp || Date.now()).toISOString(),
      status: req.status,
      ...(req.adminNotes !== undefined ? { admin_notes: req.adminNotes } : {}),
    });

    if (error) {
      console.warn("Supabase manual_requests sync error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to sync manual request to Supabase:", e);
    return false;
  }
}

// Helper: Fetch All Manual Requests from Supabase
export async function fetchManualRequestsSupabase(): Promise<any[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("manual_requests")
      .select("*")
      .order("submitted_at", { ascending: false, nullsFirst: false });
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      timestamp: d.submitted_at ? new Date(d.submitted_at).getTime() : Date.now(),
      submittedAt: d.submitted_at ? new Date(d.submitted_at).getTime() : Date.now(),
      date: d.submitted_at
        ? new Date(d.submitted_at).toISOString().replace("T", " ").substring(0, 16)
        : "",
      serviceId: d.service_id || d.service_name?.toLowerCase().replace(" ", "_") || "unknown",
      serviceName: d.service_name,
      fullName: d.full_name,
      whatsappNumber: d.whatsapp_number,
      normalNumber: d.normal_call_number,
      normalCallNumber: d.normal_call_number,
      accountKey: d.user_passkey || "Guest",
      accountUser: d.full_name,
      userPasskey: d.user_passkey || "Guest",
      status: d.status || "PENDING",
      adminNotes: d.admin_notes || "",
    }));
  } catch (e) {
    console.error("Failed to fetch manual requests from Supabase:", e);
    return [];
  }
}

// Helper: Sanitize & Upload Template Background to Supabase Storage before persisting
export async function sanitizeAndUploadTemplateBackground(template: any): Promise<any> {
  if (!template || !template.background) return template;
  try {
    if (template.background.type === "image" && template.background.src) {
      const src = template.background.src;
      // Only upload data URLs or blob URLs to Supabase Storage
      if (src.startsWith("data:") || src.startsWith("blob:")) {
        let blob: Blob | null = null;
        try {
          const res = await fetch(src);
          blob = await res.blob();
        } catch (fetchErr) {
          console.warn("Could not extract blob from background source:", fetchErr);
        }

        if (blob) {
          const safeId = (template.id || "tpl").replace(/[^a-zA-Z0-9_-]/g, "_");
          const filename = `${safeId}_bg_latest.png`; // Fixed filename
          const publicUrl = await uploadBackgroundToSupabase(blob, filename, template.serviceId);
          if (publicUrl) {
            return {
              ...template,
              background: {
                ...template.background,
                src: `${publicUrl}?t=${Date.now()}`,
              },
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn("Background photo sanitization and storage upload skipped:", err);
  }
  return template;
}

// Helper: Save/Update Universal Template on Supabase
export async function saveUniversalTemplateSupabase(
  arg1: any,
  arg2?: any,
  arg3?: boolean,
  arg4?: boolean,
): Promise<boolean> {
  if (!supabase) return false;
  try {
    let serviceType: string;
    let template: any;
    let isUniversalFront: boolean | undefined;
    let isUniversalBack: boolean | undefined;

    if (typeof arg1 === "string" && arg2) {
      serviceType = arg1;
      template = arg2;
      isUniversalFront = arg3;
      isUniversalBack = arg4;
    } else {
      template = arg1;
      serviceType = template.service_type || template.serviceId || template.cardType || "custom";
      isUniversalFront = arg3 ?? (template.template_json?.side === "Front Side" || template.side === "Front Side");
      isUniversalBack = arg4 ?? (template.template_json?.side === "Back Side" || template.side === "Back Side");
    }

    const category = normalizeTemplateCategory(serviceType);
    // Sanitize background and upload to the category-owned Storage folder.
    const cleanTemplate = await sanitizeAndUploadTemplateBackground({ ...template, serviceId: category });

    // Determine target side accurately
    const isBack = isUniversalBack !== undefined ? isUniversalBack : (cleanTemplate.side === "Back Side" || cleanTemplate.template_json?.side === "Back Side");
    const sideValue: "Front Side" | "Back Side" = isBack ? "Back Side" : "Front Side";
    cleanTemplate.side = sideValue;
    cleanTemplate.isUniversal = true;

    // 1. Identify all existing rows in templates matching service_type == category, is_universal == true, is_active == true, and template_json->>side == current side
    const { data: activeRows } = await supabase
      .from("templates")
      .select("id, template_json")
      .eq("service_type", category)
      .eq("is_universal", true)
      .eq("is_active", true);

    const sameSideIds = (activeRows || [])
      .filter((r: any) => {
        if (r.id === cleanTemplate.id) return false;
        let rowParsed = r.template_json;
        if (typeof rowParsed === "string") {
          try { rowParsed = JSON.parse(rowParsed); } catch {}
        }
        const rowSide = rowParsed?.side || (rowParsed?.isBackSide ? "Back Side" : "Front Side");
        return String(rowSide || "").toLowerCase().trim() === sideValue.toLowerCase().trim();
      })
      .map((r: any) => r.id);

    // Update matching rows to is_active = false (Crucial: never touch opposite side!)
    if (sameSideIds.length > 0) {
      await supabase.from("templates").update({ is_active: false }).in("id", sameSideIds);
    }

    // 2. Upsert new template row with is_universal = true, is_active = true, version = Date.now(), updated_at = NOW()
    const { error } = await supabase.from("templates").upsert({
      id: cleanTemplate.id,
      service_type: category,
      template_name:
        cleanTemplate.templateName ||
        `${category} ${sideValue.split(" ")[0].toUpperCase()} Universal`,
      template_json: cleanTemplate,
      background_url: cleanTemplate.background?.src || null,
      is_universal: true,
      is_active: true,
      version: Date.now(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Supabase universal template save error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to save universal template to Supabase:", e);
    return false;
  }
}

// Helper: Save/Update General Template on Supabase
export async function saveTemplateSupabase(template: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    // Sanitize background and upload to Supabase Storage if needed
    const cleanTemplate = await sanitizeAndUploadTemplateBackground(template);

    const { error } = await supabase.from("templates").upsert({
      id: cleanTemplate.id,
      service_type: getTemplateCategoryConfig(cleanTemplate.serviceId || cleanTemplate.cardType).serviceType,
      template_name: cleanTemplate.templateName || "Untitled Template",
      template_json: cleanTemplate,
      background_url: cleanTemplate.background?.src || null,
      is_universal: cleanTemplate.isUniversal || false,
      is_active: true,
      version: cleanTemplate.version || 1,
      created_by: cleanTemplate.publishedBy || "User",
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Supabase template save error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to save template to Supabase:", e);
    return false;
  }
}

// Helper: Delete Template on Supabase
export async function deleteTemplateSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("templates").delete().eq("id", id);
    if (error) {
      console.error("Supabase template delete error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to delete template from Supabase:", e);
    return false;
  }
}

// Helper: Fetch Latest Active Universal Template from Supabase
export async function fetchActiveUniversalTemplateSupabase(
  serviceType: string,
  isBack: boolean,
): Promise<any | null> {
  if (!supabase) return null;
  try {
    const category = getTemplateCategoryConfig(serviceType).serviceType;
    const sideValue = isBack ? "Back Side" : "Front Side";
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("service_type", category)
      .eq("is_universal", true)
      .eq("is_active", true)
      .eq("template_json->>side", sideValue)
      .order("version", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return data[0].template_json;
  } catch (e) {
    console.error("Error fetching universal template from Supabase:", e);
    return null;
  }
}

// Helper: Fetch All Templates from Supabase (Universal + Custom Admin Templates)
// Returns null on failure so the loader only prunes local copies when the cloud answered.
export async function fetchAllActiveTemplatesSupabase(): Promise<any[] | null> {
  if (!supabase) return null;
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .order("updated_at", { ascending: false })
      .abortSignal(controller.signal);
    window.clearTimeout(timeout);

    if (error) {
      console.warn("Template sync unavailable; using cached templates:", error.message);
      return null;
    }
    if (!data || !Array.isArray(data)) return null;

    return data.map((d: any) => {
      let parsed = d.template_json;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch (e) {}
      }
      if (!parsed || typeof parsed !== "object") {
        parsed = {};
      }
      return {
        ...parsed,
        id: d.id || parsed.id,
        serviceId: parsed.serviceId || d.service_type || "custom",
        templateName: d.template_name || parsed.templateName || "Untitled Template",
        isUniversal: d.is_universal !== undefined ? d.is_universal : parsed.isUniversal || false,
        isActive:
          d.is_active !== undefined
            ? d.is_active
            : parsed.isActive !== undefined
              ? parsed.isActive
              : true,
        updatedAt: d.updated_at || parsed.updatedAt || new Date().toISOString(),
      };
    });
  } catch (e) {
    console.warn("Template sync timed out or failed; using cached templates:", e);
    return null;
  }
}

// Helper: Fetch Payment Methods from Supabase
export async function fetchPaymentMethodsSupabase(): Promise<any[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("config_value")
      .eq("config_key", "payment_methods")
      .maybeSingle();
    if (error || !data) return null;
    return data.config_value as any[];
  } catch (e) {
    console.error("Failed to fetch payment methods from Supabase:", e);
    return null;
  }
}

// Helper: Save/Publish Payment Methods to Supabase
export async function savePaymentMethodsSupabase(methods: any[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("system_settings").upsert({
      id: "payment_methods",
      config_key: "payment_methods",
      config_value: methods,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error("Failed to save payment methods to Supabase:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to save payment methods to Supabase:", e);
    return false;
  }
}

// Helper: Fetch Admin Settings from Supabase
export async function fetchAdminSettingsSupabase(): Promise<any | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("config_value")
      .eq("config_key", "admin_settings")
      .maybeSingle();
    if (error || !data) return null;
    return data.config_value;
  } catch (e) {
    console.error("Failed to fetch admin settings from Supabase:", e);
    return null;
  }
}

// Helper: Save/Publish Admin Settings to Supabase
export async function saveAdminSettingsSupabase(settings: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("system_settings").upsert({
      id: "admin_settings",
      config_key: "admin_settings",
      config_value: settings,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error("Failed to save admin settings to Supabase:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to save admin settings to Supabase:", e);
    return false;
  }
}

// Helper: Fetch All Profiles (Registered Users) from Supabase
export async function fetchAllProfilesSupabase(): Promise<any[]> {
  if (!supabase) return [];
  try {
    const combined: any[] = [];
    const seen = new Set<string>();

    // 1. Try public.profiles
    try {
      const { data: pData, error: pError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!pError && pData && Array.isArray(pData)) {
        pData.forEach((p) => {
          const key = p.id || p.phone || p.passkey;
          if (key && !seen.has(key)) {
            seen.add(key);
            combined.push(p);
          }
        });
      }
    } catch (e) {}

    // 2. Try public.user_profiles
    try {
      const { data: uData, error: uError } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!uError && uData && Array.isArray(uData)) {
        uData.forEach((u) => {
          const key = u.id || u.phone || u.passkey;
          if (key && !seen.has(key)) {
            seen.add(key);
            combined.push({
              id: u.id || u.user_id,
              auth_user_id: u.auth_user_id,
              name: u.name || u.full_name,
              phone: u.phone || u.phone_number,
              email: u.email,
              passkey: u.passkey,
              role: u.role || "user",
              tokens: u.tokens || u.token_balance || 0,
              created_at: u.created_at,
              status: u.status || "ACTIVE",
            });
          }
        });
      }
    } catch (e) {}

    return combined;
  } catch (e) {
    console.error("Failed to fetch profiles from Supabase:", e);
    return [];
  }
}

// Helper: Deterministic UUID Generator to prevent PostgreSQL casting syntax errors
export function getUUID(id: string): string {
  if (!id) return "00000000-0000-0000-0000-000000000000";
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;

  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h = h & h;
  }
  const hex = Math.abs(h).toString(16).padStart(8, "0");
  const part2 = Math.abs(h * 31)
    .toString(16)
    .padStart(4, "0")
    .slice(0, 4);
  const part3 = Math.abs(h * 17)
    .toString(16)
    .padStart(4, "0")
    .slice(0, 4);
  const part4 = Math.abs(h * 7)
    .toString(16)
    .padStart(4, "0")
    .slice(0, 4);
  const part5 = Math.abs(h * 13)
    .toString(16)
    .padStart(12, "0")
    .slice(0, 12);
  return `${hex}-${part2}-${part3}-${part4}-${part5}`;
}

// Helper: Sync Payment Record to Supabase user_payments table
export async function syncPaymentRecordSupabase(payment: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("user_payments").upsert({
      id: payment.id,
      user_id: payment.passkeyId ? getUUID(payment.passkeyId) : null,
      user_name: payment.senderName || null,
      user_phone: payment.senderPhone || payment.sender || null,
      amount: payment.amount || 0,
      sender: payment.senderName || payment.sender || null,
      receiver: payment.deviceName || "BIGsta Gateway",
      reference: payment.transactionReference || null,
      status: payment.status?.toUpperCase() || "PENDING",
      payment_date: payment.transactionTime || payment.receivedAt || new Date().toISOString(),
      tokens_granted: payment.tokensGranted || 0,
    });
    if (error) {
      console.warn("Sync payment record to Supabase warning:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to sync payment record to Supabase:", e);
    return false;
  }
}

// Helper: Fetch All Payment Records from Supabase user_payments table
export async function fetchAllPaymentsSupabase(): Promise<any[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("user_payments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      rawSms: d.reference
        ? `${d.reference} Imethibitishwa. Tsh ${d.amount} imetumwa kwa ${d.receiver}.`
        : "",
      sender: d.user_phone || d.sender || "",
      receivedAt: d.payment_date || d.created_at,
      deviceName: d.receiver || "",
      status:
        d.status?.toLowerCase() === "verified" ? "verified" : d.status?.toLowerCase() || "pending",
      used: d.status?.toLowerCase() === "verified" || d.status?.toLowerCase() === "used",
      transactionReference: d.reference,
      senderName: d.user_name || d.sender,
      senderPhone: d.user_phone,
      amount: Number(d.amount),
      tokensGranted: d.tokens_granted || 0,
      passkeyId: d.user_id,
    }));
  } catch (e) {
    console.error("Failed to fetch payments from Supabase:", e);
    return [];
  }
}

// Helper: Fetch Profile
export async function fetchProfileSupabase(userId: string): Promise<any | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", getUUID(userId))
      .maybeSingle();
    if (data) return data;
    // Fallback: profile saved at registration under another id — find it by passkey
    const { data: byKey } = await supabase
      .from("profiles")
      .select("*")
      .ilike("passkey", userId)
      .order("updated_at", { ascending: false })
      .limit(1);
    return byKey?.[0] || null;
  } catch (e) {
    return null;
  }
}

// Helper: Sync/Upsert Passkey on Supabase
export async function syncPasskeySupabase(passkey: {
  id: string;
  key: string;
  role: string;
  active: boolean;
  createdDate?: string;
  createdAtTimestamp?: number;
  createdBy?: string;
  description?: string;
  lastUsed?: string;
  totalUsages?: number;
  usedUsages?: number;
  remainingUsages?: number;
  paymentStatus?: string;
  packageName?: string;
  packagePrice?: string;
}): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("passkeys").upsert({
      id: passkey.id,
      key: passkey.key,
      role: passkey.role,
      active: passkey.active,
      created_date: passkey.createdDate,
      created_at_timestamp: passkey.createdAtTimestamp,
      created_by: passkey.createdBy,
      description: passkey.description,
      last_used: passkey.lastUsed,
      total_usages: passkey.totalUsages ?? 1,
      used_usages: passkey.usedUsages ?? 0,
      remaining_usages: passkey.remainingUsages ?? 1,
      payment_status: passkey.paymentStatus ?? "ACTIVE",
      package_name: passkey.packageName,
      package_price: passkey.packagePrice,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.warn("Sync passkey warning:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed passkey sync to Supabase:", e);
    return false;
  }
}

// Helper: Fetch All Passkeys from Supabase
export async function fetchPasskeysSupabase(): Promise<any[]> {
  if (!supabase) return [];
  try {
    const list: any[] = [];
    const seenKeys = new Set<string>();

    // 1. Fetch from passkeys table
    try {
      const { data: passkeyData } = await supabase.from("passkeys").select("*");
      if (passkeyData && Array.isArray(passkeyData)) {
        passkeyData.forEach((p) => {
          if (p.key) {
            seenKeys.add(p.key.toLowerCase());
            list.push({
              id: p.id,
              key: p.key,
              role: p.role || "user",
              active: p.active !== false && p.payment_status !== "DISABLED",
              createdDate:
                p.created_date ||
                (isNaN(new Date(p.created_at || Date.now()).getTime())
                  ? new Date().toISOString().replace("T", " ").substring(0, 16)
                  : new Date(p.created_at || Date.now())
                      .toISOString()
                      .replace("T", " ")
                      .substring(0, 16)),
              createdAtTimestamp:
                p.created_at_timestamp ||
                (isNaN(new Date(p.created_at || Date.now()).getTime())
                  ? Date.now()
                  : new Date(p.created_at || Date.now()).getTime()),
              createdBy: p.created_by || "Supabase",
              description: p.description || "Supabase Passkey",
              lastUsed: p.last_used,
              totalUsages: p.total_usages ?? (p.role === "admin" ? 99999 : 1),
              usedUsages: p.used_usages ?? 0,
              remainingUsages: p.remaining_usages ?? (p.role === "admin" ? 99999 : 1),
              paymentStatus: p.payment_status || "ACTIVE",
              packageName:
                p.package_name || (p.role === "admin" ? "Unlimited Admin" : "1 Usage Package"),
              packagePrice: p.package_price || "Free",
              usageHistory: [],
            });
          }
        });
      }
    } catch (e) {}

    // 2. Fetch from profiles table for registered user passkeys
    try {
      const { data: profileData } = await supabase.from("profiles").select("*");
      if (profileData && Array.isArray(profileData)) {
        profileData.forEach((p) => {
          if (p.passkey && !seenKeys.has(p.passkey.toLowerCase())) {
            seenKeys.add(p.passkey.toLowerCase());
            list.push({
              id: p.id || "pk_" + (p.auth_user_id || p.passkey),
              key: p.auth_user_id || p.passkey,
              role: p.role || "user",
              active: p.status !== "DISABLED",
              createdDate:
                p.created_at && !isNaN(new Date(p.created_at).getTime())
                  ? new Date(p.created_at).toISOString().replace("T", " ").substring(0, 16)
                  : new Date().toISOString().replace("T", " ").substring(0, 16),
              createdAtTimestamp:
                p.created_at && !isNaN(new Date(p.created_at).getTime())
                  ? new Date(p.created_at).getTime()
                  : Date.now(),
              createdBy: "User Self-Registration",
              description: `${p.name || "Registered User"} (${p.phone || "No Phone"})`,
              totalUsages: typeof p.tokens === "number" ? p.tokens : 1,
              usedUsages: 0,
              remainingUsages: typeof p.tokens === "number" ? p.tokens : 1,
              paymentStatus: "ACTIVE",
              packageName: "Registered User",
              packagePrice: "Free",
              usageHistory: [],
            });
          }
        });
      }
    } catch (e) {}

    return list;
  } catch (e) {
    console.error("Failed to fetch passkeys from Supabase:", e);
    return [];
  }
}

// Helper: Query Passkey directly by Key from Supabase (Canonical Source: passkeys, profiles & user_profiles)
export async function fetchPasskeyByKeySupabase(inputKey: string): Promise<any | null> {
  if (!supabase || !inputKey) return null;
  const trimmed = inputKey.trim();
  try {
    // 1. Check passkeys table
    const { data: passkeys, error } = await supabase
      .from("passkeys")
      .select("*")
      .ilike("key", trimmed)
      .limit(1);

    if (!error && passkeys && passkeys.length > 0) {
      const p = passkeys[0];
      if (p.active === false || p.payment_status === "DISABLED") {
        return null;
      }
      return {
        id: p.id,
        key: p.key,
        role: p.role || "user",
        active: p.active !== false,
        createdDate:
          p.created_date ||
          (isNaN(new Date(p.created_at || Date.now()).getTime())
            ? new Date().toISOString().replace("T", " ").substring(0, 16)
            : new Date(p.created_at || Date.now())
                .toISOString()
                .replace("T", " ")
                .substring(0, 16)),
        createdAtTimestamp:
          p.created_at_timestamp ||
          (isNaN(new Date(p.created_at || Date.now()).getTime())
            ? Date.now()
            : new Date(p.created_at || Date.now()).getTime()),
        createdBy: p.created_by || "Supabase",
        description: p.description || "Supabase Passkey",
        lastUsed: p.last_used,
        totalUsages:
          typeof p.total_usages === "number" ? p.total_usages : p.role === "admin" ? 99999 : 1,
        usedUsages: typeof p.used_usages === "number" ? p.used_usages : 0,
        remainingUsages:
          typeof p.remaining_usages === "number"
            ? p.remaining_usages
            : p.role === "admin"
              ? 99999
              : 1,
        paymentStatus: p.payment_status || "ACTIVE",
        packageName: p.package_name || (p.role === "admin" ? "Unlimited Admin" : "1 Usage Package"),
        packagePrice: p.package_price || "Free",
        usageHistory: [],
      };
    }

    // 2. Fallback check profiles table
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("*")
      .ilike("passkey", trimmed)
      .limit(1);

    if (!profErr && profiles && profiles.length > 0) {
      const prof = profiles[0];
      if (prof.status === "DISABLED") return null;
      const tokensCount = typeof prof.tokens === "number" ? prof.tokens : 1;
      return {
        id: `pk_prof_${prof.id}`,
        key: prof.passkey,
        role: prof.role || "user",
        active: true,
        createdDate: isNaN(new Date(prof.created_at || Date.now()).getTime())
          ? new Date().toISOString().replace("T", " ").substring(0, 16)
          : new Date(prof.created_at || Date.now())
              .toISOString()
              .replace("T", " ")
              .substring(0, 16),
        createdAtTimestamp: isNaN(new Date(prof.created_at || Date.now()).getTime())
          ? Date.now()
          : new Date(prof.created_at || Date.now()).getTime(),
        createdBy: prof.name || "User",
        description: `Profile Passkey: ${prof.name} (${prof.phone})`,
        totalUsages: tokensCount,
        usedUsages: 0,
        remainingUsages: tokensCount,
        paymentStatus: "ACTIVE",
        packageName: "Standard User Package",
        packagePrice: "Free",
        usageHistory: [],
      };
    }

    // 3. Fallback check user_profiles table
    const { data: uProfiles, error: uProfErr } = await supabase
      .from("user_profiles")
      .select("*")
      .ilike("passkey", trimmed)
      .limit(1);

    if (!uProfErr && uProfiles && uProfiles.length > 0) {
      const uProf = uProfiles[0];
      if (uProf.status === "DISABLED") return null;
      const tokensCount = typeof uProf.tokens === "number" ? uProf.tokens : 1;
      return {
        id: `pk_uprof_${uProf.id}`,
        key: uProf.passkey,
        role: uProf.role || "user",
        active: true,
        createdDate: isNaN(new Date(uProf.created_at || Date.now()).getTime())
          ? new Date().toISOString().replace("T", " ").substring(0, 16)
          : new Date(uProf.created_at || Date.now())
              .toISOString()
              .replace("T", " ")
              .substring(0, 16),
        createdAtTimestamp: isNaN(new Date(uProf.created_at || Date.now()).getTime())
          ? Date.now()
          : new Date(uProf.created_at || Date.now()).getTime(),
        createdBy: uProf.name || uProf.full_name || "User",
        description: `Profile Passkey: ${uProf.name || uProf.full_name} (${uProf.phone})`,
        totalUsages: tokensCount,
        usedUsages: 0,
        remainingUsages: tokensCount,
        paymentStatus: "ACTIVE",
        packageName: "Standard User Package",
        packagePrice: "Free",
        usageHistory: [],
      };
    }

    return null;
  } catch (e) {
    console.error("Error querying passkey from Supabase:", e);
    return null;
  }
}

// Helper: Delete Passkey on Supabase
export async function deletePasskeySupabase(id?: string, key?: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    if (id) {
      await supabase.from("passkeys").delete().eq("id", id);
    }
    if (key) {
      await supabase.from("passkeys").delete().eq("key", key);
    }
    return true;
  } catch (e) {
    console.error("Failed to delete passkey from Supabase:", e);
    return false;
  }
}

// Rewrites stored image links that point at a different Supabase host to the currently connected one.
export function rewriteLegacyStorageUrl(url: string): string {
  const current = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url || !current) return url;
  return url.replace(/^https:\/\/[a-z0-9]{20}\.supabase\.co(?=\/storage\/)/, current.replace(/\/$/, ""));
}

// Helper: Fetch all token packages from Supabase
// Returns null on failure so callers can tell "cloud unreachable" apart from "admin removed every package".
export async function fetchTokenPackagesSupabase(): Promise<any[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("token_packages")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("usages", { ascending: true });

    if (error) {
      if (error.code === "PGRST100" || error.message.includes("find the table")) {
        return [];
      }
      console.error("Supabase fetch token packages error:", error.message);
      return null;
    }
    return data || [];
  } catch (e) {
    console.error("Failed to fetch token packages from Supabase:", e);
    return null;
  }
}

// Helper: Save/Update token package on Supabase
export async function saveTokenPackageSupabase(pkg: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("token_packages").upsert({
      id: pkg.id,
      name: pkg.name,
      usages: pkg.usages,
      price: pkg.price,
      description: pkg.description || null,
      visibility: pkg.visibility || "public",
      is_active: pkg.active !== false,
      sort_order: pkg.sortOrder ?? pkg.sort_order ?? 0,
      bonus: pkg.bonus ?? 0,
      promotion: pkg.promotion || null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Supabase token package save error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to save token package to Supabase:", e);
    return false;
  }
}

// Helper: Subscribe to token_packages table realtime updates
export function subscribeTokenPackagesRealtime(callback: (pkgs: any[]) => void): () => void {
  if (!supabase) return () => {};

  try {
    const channel = supabase
      .channel(`realtime_token_packages_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "token_packages" },
        async () => {
          const fresh = await fetchTokenPackagesSupabase();
          if (fresh) callback(fresh);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.error("Realtime subscription error:", e);
    return () => {};
  }
}

// Helper: Delete token package on Supabase
export async function deleteTokenPackageSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("token_packages").delete().eq("id", id);
    if (error) {
      console.error("Supabase token package delete error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to delete token package from Supabase:", e);
    return false;
  }
}

// Helper: Fetch all weekly offers from Supabase
export async function fetchAllWeeklyOffersSupabase(retries = 3): Promise<any[]> {
  if (!supabase) return [];
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase
        .from("weekly_offers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "PGRST100" || error.message.includes("find the table")) {
          return [];
        }
        console.error(`Supabase fetch weekly offers error (attempt ${i + 1}):`, error.message);
        if (i === retries - 1) return [];
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // exponential backoff
        continue;
      }
      return data || [];
    } catch (e) {
      console.error(`Failed to fetch weekly offers from Supabase (attempt ${i + 1}):`, e);
      if (i === retries - 1) return [];
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // exponential backoff
    }
  }
  return [];
}

// Helper: Fetch active weekly offers from Supabase
export async function fetchWeeklyOffersSupabase(): Promise<any[]> {
  return fetchAllWeeklyOffersSupabase();
}

// Helper: Subscribe to weekly_offers table realtime updates
export function subscribeWeeklyOffersRealtime(callback: (offers: any[]) => void): () => void {
  if (!supabase) return () => {};

  try {
    const channel = supabase
      .channel(`realtime_weekly_offers_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "weekly_offers" },
        async () => {
          const fresh = await fetchAllWeeklyOffersSupabase();
          callback(fresh);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.error("Weekly offers realtime subscription error:", e);
    return () => {};
  }
}

// Helper: Save/Update weekly offer on Supabase
export async function saveWeeklyOfferSupabase(offer: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("weekly_offers").upsert({
      id: offer.id,
      title: offer.title,
      description: offer.description || null,
      tokens: offer.tokens,
      price: offer.price,
      services: offer.services || [],
      start_date: offer.startDate,
      end_date: offer.endDate,
      is_active: offer.active !== false,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Supabase weekly offer save error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to save weekly offer to Supabase:", e);
    return false;
  }
}

// Helper: Delete weekly offer on Supabase
export async function deleteWeeklyOfferSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("weekly_offers").delete().eq("id", id);
    if (error) {
      console.error("Supabase weekly offer delete error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to delete weekly offer from Supabase:", e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Token history (persisted in public.token_transactions)
// user_id holds a deterministic UUID of the passkey id; user_email holds the raw
// passkey id so history can be filtered per owner without a schema change.
// ---------------------------------------------------------------------------
export interface TokenHistoryRecord {
  id: string;
  ownerId: string;
  amount: number;
  reason: string;
  timestamp: string;
}

export async function insertTokenHistorySupabase(record: TokenHistoryRecord): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await withTimeoutOrNull(
      supabase.from("token_transactions").upsert(
        {
          id: record.id,
          user_id: getUUID(record.ownerId),
          user_email: record.ownerId,
          amount: Math.trunc(record.amount),
          reason: record.reason.slice(0, 500),
          created_at: record.timestamp,
        },
        { onConflict: "id", ignoreDuplicates: true },
      ) as unknown as Promise<{ error: any }>,
      10000,
      "Token history insert",
    );
    if (error) {
      console.warn("Token history insert failed:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("Token history insert error:", e);
    return false;
  }
}

export async function fetchTokenHistorySupabase(
  ownerIds?: string[],
  limit = 200,
): Promise<TokenHistoryRecord[] | null> {
  if (!supabase) return null;
  try {
    let query = supabase
      .from("token_transactions")
      .select("id, user_email, amount, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (ownerIds && ownerIds.length > 0) {
      query = query.in("user_email", ownerIds);
    }
    const { data, error } = await withTimeoutOrNull(
      query as unknown as Promise<{ data: any[] | null; error: any }>,
      10000,
      "Token history fetch",
    );
    if (error || !data) {
      if (error) console.warn("Token history fetch failed:", error.message);
      return null;
    }
    return data.map((row) => ({
      id: row.id,
      ownerId: row.user_email || "",
      amount: row.amount,
      reason: row.reason,
      timestamp: row.created_at,
    }));
  } catch (e) {
    console.warn("Token history fetch error:", e);
    return null;
  }
}

// Update only editable profile fields on the profile rows attached to the active Auth user.
export async function saveOwnProfileSupabase(
  key: string,
  profile: { name?: string; phone?: string; email?: string; region?: string },
): Promise<boolean> {
  if (!supabase || !key) return false;

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user || user.id !== key) return false;

    const updatedAt = new Date().toISOString();
    const profileChanges = {
      ...(profile.name !== undefined ? { name: profile.name } : {}),
      ...(profile.phone !== undefined ? { phone: profile.phone } : {}),
      ...(profile.region !== undefined ? { region: profile.region } : {}),
      updated_at: updatedAt,
    };
    const mirrorChanges = {
      ...(profile.name !== undefined ? { name: profile.name } : {}),
      ...(profile.phone !== undefined ? { phone: profile.phone } : {}),
      updated_at: updatedAt,
    };

    const [{ error: profileError }, { error: mirrorError }] = await Promise.all([
      supabase.from("profiles").update(profileChanges).eq("auth_user_id", user.id),
      supabase.from("user_profiles").update(mirrorChanges).eq("auth_user_id", user.id),
    ]);

    if (profileError || mirrorError) {
      console.error("Profile save failed:", profileError?.message || mirrorError?.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Profile save failed:", error);
    return false;
  }
}

/** Persist a generated service card under the authenticated owner's account. */
export async function saveGeneratedCardSupabase(card: {
  id: string;
  serviceType: string;
  cardData: Record<string, any>;
}): Promise<boolean> {
  if (!supabase || !card.id.trim() || !card.serviceType.trim()) return false;

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return false;

    const removeMedia = (value: any): any => {
      if (Array.isArray(value)) return value.map(removeMedia);
      if (!value || typeof value !== "object") {
        return typeof value === "string" && /^(data:|blob:)/i.test(value) ? undefined : value;
      }

      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !/(photo|signature|image|base64)/i.test(key))
          .map(([key, nested]) => [key, removeMedia(nested)])
          .filter(([, nested]) => nested !== undefined),
      );
    };

    const { error } = await withTimeoutOrNull(
      supabase.from("user_generated_cards").upsert({
        id: card.id.trim().slice(0, 128),
        user_id: user.id,
        service_type: normalizeTemplateCategory(card.serviceType).slice(0, 80),
        card_data: removeMedia(card.cardData),
      }),
      10000,
      "saveGeneratedCard"
    );
    if (error) {
      console.error("[Supabase] saveGeneratedCard failed:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Supabase] saveGeneratedCard error:", error);
    return false;
  }
}

/**
 * Fetch active templates for a specific service category, scoped to front/back sides.
 */
export async function fetchActiveTemplatesForService(
  serviceType: string,
): Promise<{ front: any | null; back: any | null }> {
  if (!supabase) return { front: null, back: null };
  const normalized = normalizeTemplateCategory(serviceType);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("service_type", normalized)
      .eq("is_active", true)
      .eq("is_universal", true)
      .order("version", { ascending: false })
      .abortSignal(controller.signal);

    clearTimeout(timeout);

    if (error || !data || !Array.isArray(data)) {
      if (error) console.warn(`[Supabase] Service template fetch error for ${normalized}:`, error.message);
      return { front: null, back: null };
    }

    const parseRow = (d: any) => {
      let parsed = d.template_json;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {}
      }
      if (!parsed || typeof parsed !== "object") {
        parsed = {};
      }
      return {
        ...parsed,
        id: d.id || parsed.id,
        serviceId: parsed.serviceId || d.service_type || normalized,
        templateName: d.template_name || parsed.templateName || "Universal Template",
        isUniversal: d.is_universal !== undefined ? d.is_universal : true,
        isActive: d.is_active !== undefined ? d.is_active : true,
        background:
          parsed.background ||
          (d.background_url ? { type: "image", src: rewriteLegacyStorageUrl(d.background_url) } : undefined),
      };
    };

    let front: any | null = null;
    let back: any | null = null;

    for (const row of data) {
      const parsed = parseRow(row);
      const isBack =
        parsed.side === "Back Side" ||
        row.template_json?.side === "Back Side" ||
        String(parsed.id || "").toLowerCase().includes("back");

      if (isBack && !back) {
        back = parsed;
      } else if (!isBack && !front) {
        front = parsed;
      }

      if (front && back) break;
    }

    return { front, back };
  } catch (e) {
    console.warn(`[Supabase] Template fetch failed for ${normalized}, using cached:`, e);
    return { front: null, back: null }; // Clean fallback to IndexedDB
  }
}


