// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as projectSupabase } from '@/integrations/supabase/client';

// Read configuration from environment or fallback.
// vite.config.ts maps the Supabase integration's injected names
// (NEXT_PUBLIC_SUPABASE_* / SUPABASE_*) onto VITE_SUPABASE_* at build time,
// but we also read the raw names here for robustness across contexts.
const metaEnv = (import.meta as any).env || {};
const procEnv = typeof process !== 'undefined' ? process.env || {} : {};
const supabaseUrl =
  metaEnv.VITE_SUPABASE_URL ||
  metaEnv.NEXT_PUBLIC_SUPABASE_URL ||
  procEnv.VITE_SUPABASE_URL ||
  procEnv.NEXT_PUBLIC_SUPABASE_URL ||
  procEnv.SUPABASE_URL ||
  '';
const supabaseAnonKey =
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  procEnv.VITE_SUPABASE_ANON_KEY ||
  procEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  procEnv.SUPABASE_ANON_KEY ||
  metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

// Devices that used the app before the move to the current Supabase project may
// still hold cached template/background URLs pointing at the retired project.
// Rewrite them once so every device resolves assets from the current project.
const LEGACY_SUPABASE_HOST = 'cxmbustlvhzentduuvnx.supabase.co';
function migrateLegacySupabaseCache() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const currentHost = new URL(supabaseUrl).host;
    if (currentHost === LEGACY_SUPABASE_HOST) return;
    const storage = window.localStorage;
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (!key) continue;
      if (key.startsWith('sb-cxmbustlvhzentduuvnx')) {
        storage.removeItem(key);
        continue;
      }
      const value = storage.getItem(key);
      if (value && value.includes(LEGACY_SUPABASE_HOST)) {
        storage.setItem(key, value.split(LEGACY_SUPABASE_HOST).join(currentHost));
      }
    }
  } catch {
    // Cache migration is best-effort; the cloud fetch remains authoritative.
  }
}
migrateLegacySupabaseCache();

const DEFAULT_TIMEOUT = 12000; // 12 seconds

async function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = DEFAULT_TIMEOUT, 
  errorMsg: string = 'Connection timed out. Please check your internet connection or try again.'
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
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('YOUR_SUPABASE')
);

// Initialize Supabase Client with persistent session handling
export const supabase: SupabaseClient | null = projectSupabase as unknown as SupabaseClient;

/**
 * SQL Schema definition for PROMPT 50 Migration
 */
export const SUPABASE_SQL_SCHEMA = `
-- =========================================================
-- BIGsta Supabase Database Foundation Migration Schema (Phases 1-10)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access users" ON public.users FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY,
  name TEXT,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'user',
  passkey TEXT,
  tokens INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access user_profiles" ON public.user_profiles FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  name TEXT,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'user',
  passkey TEXT,
  tokens INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow individual insert/update profiles" ON public.profiles FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.token_wallets (
  id TEXT PRIMARY KEY,
  user_id UUID,
  balance INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.token_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access token_wallets" ON public.token_wallets FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.tokens (
  id TEXT PRIMARY KEY,
  user_id UUID,
  balance INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access tokens" ON public.tokens FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.services (
  id TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access services" ON public.services FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.template_categories (
  id TEXT PRIMARY KEY,
  category_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access template_categories" ON public.template_categories FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.templates (
  id TEXT PRIMARY KEY,
  service_type TEXT NOT NULL,
  template_name TEXT,
  template_json JSONB NOT NULL,
  background_url TEXT,
  is_universal BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select templates" ON public.templates FOR SELECT USING (true);
CREATE POLICY "Allow full write templates" ON public.templates FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.template_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT REFERENCES public.templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  template_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access template_versions" ON public.template_versions FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.template_elements (
  id TEXT PRIMARY KEY,
  template_id TEXT REFERENCES public.templates(id) ON DELETE CASCADE,
  element_name TEXT,
  element_type TEXT,
  element_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.template_elements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access template_elements" ON public.template_elements FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.user_generated_cards (
  id TEXT PRIMARY KEY,
  user_id UUID,
  service_type TEXT,
  card_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_generated_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access user_generated_cards" ON public.user_generated_cards FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.token_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  usages INTEGER NOT NULL,
  price TEXT NOT NULL,
  description TEXT,
  visibility TEXT DEFAULT 'public',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  bonus INTEGER DEFAULT 0,
  promotion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.token_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select token_packages" ON public.token_packages FOR SELECT USING (true);
CREATE POLICY "Allow full write token_packages" ON public.token_packages FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.weekly_offers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  tokens INTEGER NOT NULL,
  price TEXT NOT NULL,
  services TEXT[], -- Array of service IDs
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.weekly_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select weekly_offers" ON public.weekly_offers FOR SELECT USING (true);
CREATE POLICY "Allow full write weekly_offers" ON public.weekly_offers FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.background_assets (
  id TEXT PRIMARY KEY,
  name TEXT,
  url TEXT NOT NULL,
  service_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.background_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select background_assets" ON public.background_assets FOR SELECT USING (true);
CREATE POLICY "Allow full write background_assets" ON public.background_assets FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.token_transactions (
  id TEXT PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access token_transactions" ON public.token_transactions FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.user_payments (
  id TEXT PRIMARY KEY,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  amount NUMERIC NOT NULL,
  sender TEXT,
  receiver TEXT,
  reference TEXT,
  status TEXT DEFAULT 'PENDING',
  payment_date TEXT,
  tokens_granted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access user_payments" ON public.user_payments FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.payment_submissions (
  id TEXT PRIMARY KEY,
  user_id UUID,
  payload JSONB,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access payment_submissions" ON public.payment_submissions FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.payment_reviews (
  id TEXT PRIMARY KEY,
  submission_id TEXT,
  admin_id UUID,
  review_notes TEXT,
  status TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.payment_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access payment_reviews" ON public.payment_reviews FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY,
  profile_settings JSONB,
  preferences JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access user_settings" ON public.user_settings FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY,
  config_key TEXT UNIQUE,
  config_value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access system_settings" ON public.system_settings FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.download_records (
  id TEXT PRIMARY KEY,
  user_id UUID,
  service TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Ready',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.download_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access download_records" ON public.download_records FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access audit_logs" ON public.audit_logs FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY,
  role TEXT DEFAULT 'user',
  permissions JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access user_roles" ON public.user_roles FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.manual_requests (
  id TEXT PRIMARY KEY,
  user_id UUID,
  full_name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  normal_call_number TEXT NOT NULL,
  service_name TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.manual_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access manual_requests" ON public.manual_requests FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.passkeys (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user',
  active BOOLEAN DEFAULT TRUE,
  created_date TEXT,
  created_at_timestamp BIGINT,
  created_by TEXT,
  description TEXT,
  last_used TEXT,
  total_usages INTEGER DEFAULT 1,
  used_usages INTEGER DEFAULT 0,
  remaining_usages INTEGER DEFAULT 1,
  payment_status TEXT DEFAULT 'ACTIVE',
  package_name TEXT,
  package_price TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access passkeys" ON public.passkeys FOR ALL USING (true);

-- BIGsta internal APK SMS receiver (raw SMS is always kept)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sms_hash TEXT UNIQUE NOT NULL,
  sender TEXT NOT NULL,
  raw_sms TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_id TEXT NOT NULL,
  network TEXT,
  amount NUMERIC,
  reference TEXT,
  receiver TEXT,
  balance NUMERIC,
  transaction_id TEXT,
  payer_name TEXT,
  payer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'UNREVIEWED',
  processing_state TEXT NOT NULL DEFAULT 'PARSE_FAILED',
  source TEXT NOT NULL DEFAULT 'bigsta_apk',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sms_logs_received_at_idx ON public.sms_logs (received_at DESC);
CREATE INDEX IF NOT EXISTS sms_logs_status_idx ON public.sms_logs (status);
CREATE INDEX IF NOT EXISTS sms_logs_sms_hash_idx ON public.sms_logs (sms_hash);
CREATE TABLE IF NOT EXISTS public.nida_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  mother_name TEXT,
  ward_of_residence TEXT,
  district_of_birth TEXT,
  nida_registration_place TEXT,
  request_type TEXT CHECK (request_type IN ('picture', 'signature', 'both')),
  status TEXT DEFAULT 'pending',
  picture_url TEXT,
  signature_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.nida_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to insert own requests" ON public.nida_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to view own requests" ON public.nida_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow admins to view/update all" ON public.nida_requests FOR ALL USING (true);
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.sms_logs TO anon, authenticated;
DROP POLICY IF EXISTS "Allow public access sms_logs" ON public.sms_logs;
CREATE POLICY "Allow public access sms_logs" ON public.sms_logs FOR ALL USING (true) WITH CHECK (true);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sms_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_logs;
  END IF;
END $$;
`;

// Helper: Upload Background to Supabase Storage
export async function uploadBackgroundToSupabase(file: File | Blob, filename: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const cleanFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { data, error } = await supabase.storage.from('backgrounds').upload(cleanFilename, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (error) {
      console.warn('Supabase storage upload warning:', error.message);
      return null;
    }
    const { data: publicUrlData } = supabase.storage.from('backgrounds').getPublicUrl(cleanFilename);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Upload background failed:', err);
    return null;
  }
}

// Helper: Sync/Upsert Manual Request on Supabase
export async function syncManualRequestSupabase(req: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('manual_requests').upsert({
      id: req.id,
      full_name: req.fullName,
      whatsapp_number: req.whatsappNumber,
      normal_call_number: req.normalCallNumber || req.normalNumber || '',
      service_name: req.serviceName,
      status: req.status,
    });

    if (error) {
      console.warn('Supabase manual_requests sync error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to sync manual request to Supabase:', e);
    return false;
  }
}

// Helper: Fetch All Manual Requests from Supabase
export async function fetchManualRequestsSupabase(): Promise<any[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('manual_requests')
      .select('*')
      .order('id', { ascending: false });
    if (error || !data) return [];
    return data.map((d: any) => ({
      id: d.id,
      timestamp: d.submitted_at ? new Date(d.submitted_at).getTime() : Date.now(),
      submittedAt: d.submitted_at ? new Date(d.submitted_at).getTime() : Date.now(),
      date: d.submitted_at ? new Date(d.submitted_at).toISOString().replace('T', ' ').substring(0, 16) : '',
      serviceId: d.service_id || d.service_name?.toLowerCase().replace(' ', '_') || 'unknown',
      serviceName: d.service_name,
      fullName: d.full_name,
      whatsappNumber: d.whatsapp_number,
      normalNumber: d.normal_call_number,
      normalCallNumber: d.normal_call_number,
      accountKey: d.user_passkey || 'Guest',
      accountUser: d.full_name,
      userPasskey: d.user_passkey || 'Guest',
      status: d.status || 'PENDING',
      adminNotes: d.admin_notes || '',
    }));
  } catch (e) {
    console.error('Failed to fetch manual requests from Supabase:', e);
    return [];
  }
}

// Helper: Sanitize & Upload Template Background to Supabase Storage before persisting
export async function sanitizeAndUploadTemplateBackground(template: any): Promise<any> {
  if (!template || !template.background) return template;
  try {
    if (template.background.type === 'image' && template.background.src) {
      const src = template.background.src;
      // Only upload data URLs or blob URLs to Supabase Storage
      if (src.startsWith('data:') || src.startsWith('blob:')) {
        let blob: Blob | null = null;
        try {
          const res = await fetch(src);
          blob = await res.blob();
        } catch (fetchErr) {
          console.warn('Could not extract blob from background source:', fetchErr);
        }

        if (blob) {
          const safeId = (template.id || 'tpl').replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `${safeId}_bg_latest.png`; // Fixed filename
          const publicUrl = await uploadBackgroundToSupabase(blob, filename);
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
    console.warn('Background photo sanitization and storage upload skipped:', err);
  }
  return template;
}

// Helper: Save/Update Universal Template on Supabase
export async function saveUniversalTemplateSupabase(
  serviceType: string,
  template: any,
  isUniversalFront: boolean,
  isUniversalBack: boolean
): Promise<boolean> {
  if (!supabase) return false;
  try {
    // Sanitize background and upload to Supabase Storage if needed
    const cleanTemplate = await sanitizeAndUploadTemplateBackground(template);

    // 1. Deactivate previous active version for this service_type & specific side (PROMPT 50.4)
    const sideValue = isUniversalBack ? 'Back Side' : 'Front Side';

    // Filter by side in JS: the JSON-path filter was unreliable and deactivated the opposite side too.
    const { data: activeRows } = await supabase
      .from('templates')
      .select('id, template_json')
      .eq('service_type', serviceType)
      .eq('is_universal', true)
      .eq('is_active', true);
    const sameSideIds = (activeRows || [])
      .filter((r: any) => r.id !== cleanTemplate.id && String(r.template_json?.side || '').toLowerCase() === sideValue.toLowerCase())
      .map((r: any) => r.id);
    if (sameSideIds.length > 0) {
      await supabase.from('templates').update({ is_active: false }).in('id', sameSideIds);
    }

    // 2. Insert new active template record
    const { error } = await supabase.from('templates').upsert({
      id: cleanTemplate.id,
      service_type: serviceType,
      template_name: cleanTemplate.templateName || `${serviceType} ${sideValue.split(' ')[0].toUpperCase()} Universal`,
      template_json: cleanTemplate,
      background_url: cleanTemplate.background?.src || null,
      is_universal: true,
      is_active: true,
      version: Date.now(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase universal template save error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to save universal template to Supabase:', e);
    return false;
  }
}

// Helper: Save/Update General Template on Supabase
export async function saveTemplateSupabase(template: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    // Sanitize background and upload to Supabase Storage if needed
    const cleanTemplate = await sanitizeAndUploadTemplateBackground(template);

    const { error } = await supabase.from('templates').upsert({
      id: cleanTemplate.id,
      service_type: cleanTemplate.serviceId || cleanTemplate.cardType?.toLowerCase().replace(' ', '_') || 'custom',
      template_name: cleanTemplate.templateName || 'Untitled Template',
      template_json: cleanTemplate,
      background_url: cleanTemplate.background?.src || null,
      is_universal: cleanTemplate.isUniversal || false,
      is_active: true,
      version: cleanTemplate.version || 1,
      created_by: cleanTemplate.publishedBy || 'User',
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase template save error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to save template to Supabase:', e);
    return false;
  }
}

// Helper: Delete Template on Supabase
export async function deleteTemplateSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) {
      console.error('Supabase template delete error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to delete template from Supabase:', e);
    return false;
  }
}

// Helper: Fetch Latest Active Universal Template from Supabase
export async function fetchActiveUniversalTemplateSupabase(serviceType: string, isBack: boolean): Promise<any | null> {
  if (!supabase) return null;
  try {
    const sideValue = isBack ? 'Back Side' : 'Front Side';
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('service_type', serviceType)
      .eq('is_universal', true)
      .eq('is_active', true)
      .eq('template_json->>side', sideValue)
      .order('version', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return data[0].template_json;
  } catch (e) {
    console.error('Error fetching universal template from Supabase:', e);
    return null;
  }
}

// Helper: Fetch All Templates from Supabase (Universal + Custom Admin Templates)
// Returns null on failure so the loader only prunes local copies when the cloud answered.
export async function fetchAllActiveTemplatesSupabase(): Promise<any[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error || !data || !Array.isArray(data)) return null;

    return data.map((d: any) => {
      let parsed = d.template_json;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch (e) {}
      }
      if (!parsed || typeof parsed !== 'object') {
        parsed = {};
      }
      return {
        ...parsed,
        id: d.id || parsed.id,
        serviceId: parsed.serviceId || d.service_type || 'custom',
        templateName: d.template_name || parsed.templateName || 'Untitled Template',
        isUniversal: d.is_universal !== undefined ? d.is_universal : (parsed.isUniversal || false),
        isActive: d.is_active !== undefined ? d.is_active : (parsed.isActive !== undefined ? parsed.isActive : true),
        updatedAt: d.updated_at || parsed.updatedAt || new Date().toISOString(),
      };
    });
  } catch (e) {
    console.error('Error fetching all templates from Supabase:', e);
    return [];
  }
}

// Helper: Fetch Payment Methods from Supabase
export async function fetchPaymentMethodsSupabase(): Promise<any[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('config_value')
      .eq('config_key', 'payment_methods')
      .single();
    if (error || !data) return null;
    return data.config_value as any[];
  } catch (e) {
    console.error('Failed to fetch payment methods from Supabase:', e);
    return null;
  }
}

// Helper: Save/Publish Payment Methods to Supabase
export async function savePaymentMethodsSupabase(methods: any[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('system_settings').upsert({
      id: 'payment_methods',
      config_key: 'payment_methods',
      config_value: methods,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('Failed to save payment methods to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to save payment methods to Supabase:', e);
    return false;
  }
}

// Helper: Fetch Admin Settings from Supabase
export async function fetchAdminSettingsSupabase(): Promise<any | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('config_value')
      .eq('config_key', 'admin_settings')
      .single();
    if (error || !data) return null;
    return data.config_value;
  } catch (e) {
    console.error('Failed to fetch admin settings from Supabase:', e);
    return null;
  }
}

// Helper: Save/Publish Admin Settings to Supabase
export async function saveAdminSettingsSupabase(settings: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('system_settings').upsert({
      id: 'admin_settings',
      config_key: 'admin_settings',
      config_value: settings,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('Failed to save admin settings to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to save admin settings to Supabase:', e);
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
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

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
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!uError && uData && Array.isArray(uData)) {
        uData.forEach((u) => {
          const key = u.id || u.phone || u.passkey;
          if (key && !seen.has(key)) {
            seen.add(key);
            combined.push({
              id: u.id || u.user_id,
              name: u.name || u.full_name,
              phone: u.phone || u.phone_number,
              email: u.email,
              passkey: u.passkey,
              role: u.role || 'user',
              tokens: u.tokens || u.token_balance || 0,
              created_at: u.created_at,
              status: u.status || 'ACTIVE',
            });
          }
        });
      }
    } catch (e) {}

    return combined;
  } catch (e) {
    console.error('Failed to fetch profiles from Supabase:', e);
    return [];
  }
}

// Helper: Deterministic UUID Generator to prevent PostgreSQL casting syntax errors
export function getUUID(id: string): string {
  if (!id) return '00000000-0000-0000-0000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h = h & h;
  }
  const hex = Math.abs(h).toString(16).padStart(8, '0');
  const part2 = Math.abs(h * 31).toString(16).padStart(4, '0').slice(0, 4);
  const part3 = Math.abs(h * 17).toString(16).padStart(4, '0').slice(0, 4);
  const part4 = Math.abs(h * 7).toString(16).padStart(4, '0').slice(0, 4);
  const part5 = Math.abs(h * 13).toString(16).padStart(12, '0').slice(0, 12);
  return `${hex}-${part2}-${part3}-${part4}-${part5}`;
}

// Helper: Sync Payment Record to Supabase user_payments table
export async function syncPaymentRecordSupabase(payment: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('user_payments').upsert({
      id: payment.id,
      user_id: payment.passkeyId ? getUUID(payment.passkeyId) : null,
      user_name: payment.senderName || null,
      user_phone: payment.senderPhone || payment.sender || null,
      amount: payment.amount || 0,
      sender: payment.senderName || payment.sender || null,
      receiver: payment.deviceName || 'BIGsta Gateway',
      reference: payment.transactionReference || null,
      status: payment.status?.toUpperCase() || 'PENDING',
      payment_date: payment.transactionTime || payment.receivedAt || new Date().toISOString(),
      tokens_granted: payment.tokensGranted || 0,
    });
    if (error) {
      console.warn('Sync payment record to Supabase warning:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to sync payment record to Supabase:', e);
    return false;
  }
}

// Helper: Fetch All Payment Records from Supabase user_payments table
export async function fetchAllPaymentsSupabase(): Promise<any[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('user_payments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    
    return data.map((d: any) => ({
      id: d.id,
      rawSms: d.reference ? `${d.reference} Imethibitishwa. Tsh ${d.amount} imetumwa kwa ${d.receiver}.` : '',
      sender: d.user_phone || d.sender || '',
      receivedAt: d.payment_date || d.created_at,
      deviceName: d.receiver || '',
      status: d.status?.toLowerCase() === 'verified' ? 'verified' : d.status?.toLowerCase() || 'pending',
      used: d.status?.toLowerCase() === 'verified' || d.status?.toLowerCase() === 'used',
      transactionReference: d.reference,
      senderName: d.user_name || d.sender,
      senderPhone: d.user_phone,
      amount: Number(d.amount),
      tokensGranted: d.tokens_granted || 0,
      passkeyId: d.user_id,
    }));
  } catch (e) {
    console.error('Failed to fetch payments from Supabase:', e);
    return [];
  }
}

// Helper: Sync Profile
export async function syncProfileSupabase(profile: {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  tokens: number;
  passkey?: string;
}): Promise<boolean> {
  if (!supabase) return false;
  try {
    const pUuid = getUUID(profile.id);
    const { error: err1 } = await supabase.from('profiles').upsert({
      id: pUuid,
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      role: profile.role,
      passkey: profile.passkey,
      tokens: profile.tokens,
      updated_at: new Date().toISOString(),
    });

    const { error: err2 } = await supabase.from('user_profiles').upsert({
      id: pUuid,
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      role: profile.role,
      passkey: profile.passkey,
      tokens: profile.tokens,
      updated_at: new Date().toISOString(),
    });

    if (err1 && err2) {
      console.warn('Sync profile warning:', err1?.message || err2?.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed profile sync:', e);
    return false;
  }
}

// Helper: Fetch Profile
export async function fetchProfileSupabase(userId: string): Promise<any | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', getUUID(userId)).single();
    if (error || !data) return null;
    return data;
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
    const { error } = await supabase.from('passkeys').upsert({
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
      payment_status: passkey.paymentStatus ?? 'ACTIVE',
      package_name: passkey.packageName,
      package_price: passkey.packagePrice,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Sync passkey warning:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed passkey sync to Supabase:', e);
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
      const { data: passkeyData } = await supabase.from('passkeys').select('*');
      if (passkeyData && Array.isArray(passkeyData)) {
        passkeyData.forEach((p) => {
          if (p.key) {
            seenKeys.add(p.key.toLowerCase());
            list.push({
              id: p.id,
              key: p.key,
              role: p.role || 'user',
              active: p.active !== false && p.payment_status !== 'DISABLED',
              createdDate: p.created_date || (isNaN(new Date(p.created_at || Date.now()).getTime()) 
                ? new Date().toISOString().replace('T', ' ').substring(0, 16)
                : new Date(p.created_at || Date.now()).toISOString().replace('T', ' ').substring(0, 16)),
              createdAtTimestamp: p.created_at_timestamp || (isNaN(new Date(p.created_at || Date.now()).getTime()) ? Date.now() : new Date(p.created_at || Date.now()).getTime()),
              createdBy: p.created_by || 'Supabase',
              description: p.description || 'Supabase Passkey',
              lastUsed: p.last_used,
              totalUsages: p.total_usages ?? (p.role === 'admin' ? 99999 : 1),
              usedUsages: p.used_usages ?? 0,
              remainingUsages: p.remaining_usages ?? (p.role === 'admin' ? 99999 : 1),
              paymentStatus: p.payment_status || 'ACTIVE',
              packageName: p.package_name || (p.role === 'admin' ? 'Unlimited Admin' : '1 Usage Package'),
              packagePrice: p.package_price || 'Free',
              usageHistory: [],
            });
          }
        });
      }
    } catch (e) {}

    // 2. Fetch from profiles table for registered user passkeys
    try {
      const { data: profileData } = await supabase.from('profiles').select('*');
      if (profileData && Array.isArray(profileData)) {
        profileData.forEach((p) => {
          if (p.passkey && !seenKeys.has(p.passkey.toLowerCase())) {
            seenKeys.add(p.passkey.toLowerCase());
            list.push({
              id: p.id || 'pk_' + p.passkey,
              key: p.passkey,
              role: p.role || 'user',
              active: p.status !== 'DISABLED',
              createdDate: p.created_at && !isNaN(new Date(p.created_at).getTime()) 
                ? new Date(p.created_at).toISOString().replace('T', ' ').substring(0, 16) 
                : new Date().toISOString().replace('T', ' ').substring(0, 16),
              createdAtTimestamp: p.created_at && !isNaN(new Date(p.created_at).getTime()) 
                ? new Date(p.created_at).getTime() 
                : Date.now(),
              createdBy: 'User Self-Registration',
              description: `${p.name || 'Registered User'} (${p.phone || 'No Phone'})`,
              totalUsages: typeof p.tokens === 'number' ? p.tokens : 1,
              usedUsages: 0,
              remainingUsages: typeof p.tokens === 'number' ? p.tokens : 1,
              paymentStatus: 'ACTIVE',
              packageName: 'Registered User',
              packagePrice: 'Free',
              usageHistory: [],
            });
          }
        });
      }
    } catch (e) {}

    return list;
  } catch (e) {
    console.error('Failed to fetch passkeys from Supabase:', e);
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
      .from('passkeys')
      .select('*')
      .ilike('key', trimmed)
      .limit(1);

    if (!error && passkeys && passkeys.length > 0) {
      const p = passkeys[0];
      if (p.active === false || p.payment_status === 'DISABLED') {
        return null;
      }
      return {
        id: p.id,
        key: p.key,
        role: p.role || 'user',
        active: p.active !== false,
        createdDate: p.created_date || (isNaN(new Date(p.created_at || Date.now()).getTime()) 
          ? new Date().toISOString().replace('T', ' ').substring(0, 16)
          : new Date(p.created_at || Date.now()).toISOString().replace('T', ' ').substring(0, 16)),
        createdAtTimestamp: p.created_at_timestamp || (isNaN(new Date(p.created_at || Date.now()).getTime()) ? Date.now() : new Date(p.created_at || Date.now()).getTime()),
        createdBy: p.created_by || 'Supabase',
        description: p.description || 'Supabase Passkey',
        lastUsed: p.last_used,
        totalUsages: typeof p.total_usages === 'number' ? p.total_usages : (p.role === 'admin' ? 99999 : 1),
        usedUsages: typeof p.used_usages === 'number' ? p.used_usages : 0,
        remainingUsages: typeof p.remaining_usages === 'number' ? p.remaining_usages : (p.role === 'admin' ? 99999 : 1),
        paymentStatus: p.payment_status || 'ACTIVE',
        packageName: p.package_name || (p.role === 'admin' ? 'Unlimited Admin' : '1 Usage Package'),
        packagePrice: p.package_price || 'Free',
        usageHistory: [],
      };
    }

    // 2. Fallback check profiles table
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .ilike('passkey', trimmed)
      .limit(1);

    if (!profErr && profiles && profiles.length > 0) {
      const prof = profiles[0];
      if (prof.status === 'DISABLED') return null;
      const tokensCount = typeof prof.tokens === 'number' ? prof.tokens : 1;
      return {
        id: `pk_prof_${prof.id}`,
        key: prof.passkey,
        role: prof.role || 'user',
        active: true,
        createdDate: isNaN(new Date(prof.created_at || Date.now()).getTime()) 
          ? new Date().toISOString().replace('T', ' ').substring(0, 16)
          : new Date(prof.created_at || Date.now()).toISOString().replace('T', ' ').substring(0, 16),
        createdAtTimestamp: isNaN(new Date(prof.created_at || Date.now()).getTime()) ? Date.now() : new Date(prof.created_at || Date.now()).getTime(),
        createdBy: prof.name || 'User',
        description: `Profile Passkey: ${prof.name} (${prof.phone})`,
        totalUsages: tokensCount,
        usedUsages: 0,
        remainingUsages: tokensCount,
        paymentStatus: 'ACTIVE',
        packageName: 'Standard User Package',
        packagePrice: 'Free',
        usageHistory: [],
      };
    }

    // 3. Fallback check user_profiles table
    const { data: uProfiles, error: uProfErr } = await supabase
      .from('user_profiles')
      .select('*')
      .ilike('passkey', trimmed)
      .limit(1);

    if (!uProfErr && uProfiles && uProfiles.length > 0) {
      const uProf = uProfiles[0];
      if (uProf.status === 'DISABLED') return null;
      const tokensCount = typeof uProf.tokens === 'number' ? uProf.tokens : 1;
      return {
        id: `pk_uprof_${uProf.id}`,
        key: uProf.passkey,
        role: uProf.role || 'user',
        active: true,
        createdDate: isNaN(new Date(uProf.created_at || Date.now()).getTime()) 
          ? new Date().toISOString().replace('T', ' ').substring(0, 16)
          : new Date(uProf.created_at || Date.now()).toISOString().replace('T', ' ').substring(0, 16),
        createdAtTimestamp: isNaN(new Date(uProf.created_at || Date.now()).getTime()) ? Date.now() : new Date(uProf.created_at || Date.now()).getTime(),
        createdBy: uProf.name || uProf.full_name || 'User',
        description: `Profile Passkey: ${uProf.name || uProf.full_name} (${uProf.phone})`,
        totalUsages: tokensCount,
        usedUsages: 0,
        remainingUsages: tokensCount,
        paymentStatus: 'ACTIVE',
        packageName: 'Standard User Package',
        packagePrice: 'Free',
        usageHistory: [],
      };
    }

    return null;
  } catch (e) {
    console.error('Error querying passkey from Supabase:', e);
    return null;
  }
}

// Helper: Delete Passkey on Supabase
export async function deletePasskeySupabase(id?: string, key?: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    if (id) {
      await supabase.from('passkeys').delete().eq('id', id);
    }
    if (key) {
      await supabase.from('passkeys').delete().eq('key', key);
    }
    return true;
  } catch (e) {
    console.error('Failed to delete passkey from Supabase:', e);
    return false;
  }
}

// Helper: Fetch all token packages from Supabase
// Returns null on failure so callers can tell "cloud unreachable" apart from "admin removed every package".
export async function fetchTokenPackagesSupabase(): Promise<any[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('token_packages')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('usages', { ascending: true });
    
    if (error) {
      console.error('Supabase fetch token packages error:', error.message);
      return null;
    }
    return data || [];
  } catch (e) {
    console.error('Failed to fetch token packages from Supabase:', e);
    return null;
  }
}

// Helper: Save/Update token package on Supabase
export async function saveTokenPackageSupabase(pkg: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('token_packages').upsert({
      id: pkg.id,
      name: pkg.name,
      usages: pkg.usages,
      price: pkg.price,
      description: pkg.description || null,
      visibility: pkg.visibility || 'public',
      is_active: pkg.active !== false,
      sort_order: pkg.sortOrder ?? pkg.sort_order ?? 0,
      bonus: pkg.bonus ?? 0,
      promotion: pkg.promotion || null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase token package save error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to save token package to Supabase:', e);
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
        'postgres_changes',
        { event: '*', schema: 'public', table: 'token_packages' },
        async () => {
          const fresh = await fetchTokenPackagesSupabase();
          if (fresh) callback(fresh);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.error('Realtime subscription error:', e);
    return () => {};
  }
}

// Helper: Delete token package on Supabase
export async function deleteTokenPackageSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('token_packages').delete().eq('id', id);
    if (error) {
      console.error('Supabase token package delete error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to delete token package from Supabase:', e);
    return false;
  }
}

// Helper: Fetch all weekly offers from Supabase
export async function fetchAllWeeklyOffersSupabase(): Promise<any[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('weekly_offers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase fetch weekly offers error:', error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error('Failed to fetch weekly offers from Supabase:', e);
    return [];
  }
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
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weekly_offers' },
        async () => {
          const fresh = await fetchAllWeeklyOffersSupabase();
          callback(fresh);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.error('Weekly offers realtime subscription error:', e);
    return () => {};
  }
}

// Helper: Save/Update weekly offer on Supabase
export async function saveWeeklyOfferSupabase(offer: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('weekly_offers').upsert({
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
      console.error('Supabase weekly offer save error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to save weekly offer to Supabase:', e);
    return false;
  }
}

// Helper: Delete weekly offer on Supabase
export async function deleteWeeklyOfferSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('weekly_offers').delete().eq('id', id);
    if (error) {
      console.error('Supabase weekly offer delete error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to delete weekly offer from Supabase:', e);
    return false;
  }
}

// Helper: Recover / Reset Passkey by Phone Number
export async function recoverPasskeyByPhoneSupabase(phoneInput: string, newPasskey: string): Promise<{ success: boolean; message: string; fullName?: string }> {
  if (!supabase) return { success: false, message: 'Backend database not initialized' };
  const rawPhone = phoneInput.trim().replace(/\s+/g, '');
  const trimmedKey = newPasskey.trim();
  if (!rawPhone || !trimmedKey) {
    return { success: false, message: 'Please provide both phone number and new passkey' };
  }

  try {
    // 1. Check profiles table
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', rawPhone)
      .limit(1);

    if (profiles && profiles.length > 0) {
      const prof = profiles[0];
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ passkey: trimmedKey, updated_at: new Date().toISOString() })
        .eq('id', prof.id);

      if (updateErr) {
        return { success: false, message: updateErr.message || 'Failed to update passkey in backend' };
      }

      return { success: true, message: 'Passkey successfully recovered and updated', fullName: prof.name };
    }

    // 2. Check passkeys table by description containing phone
    const { data: passkeys } = await supabase
      .from('passkeys')
      .select('*')
      .ilike('description', `%${rawPhone}%`)
      .limit(1);

    if (passkeys && passkeys.length > 0) {
      const pk = passkeys[0];
      const { error: pkErr } = await supabase
        .from('passkeys')
        .update({ key: trimmedKey })
        .eq('id', pk.id);

      if (pkErr) {
        return { success: false, message: pkErr.message || 'Failed to update passkey' };
      }

      return { success: true, message: 'Passkey successfully recovered and updated', fullName: pk.created_by || 'User' };
    }

    return { success: false, message: 'No registered account found with this phone number' };
  } catch (e: any) {
    console.error('Error recovering passkey:', e);
    return { success: false, message: e.message || 'Failed to recover passkey' };
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
    const { error } = await withTimeout(
      supabase.from('token_transactions').upsert(
        {
          id: record.id,
          user_id: getUUID(record.ownerId),
          user_email: record.ownerId,
          amount: Math.trunc(record.amount),
          reason: record.reason.slice(0, 500),
          created_at: record.timestamp,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      ) as unknown as Promise<{ error: any }>
    );
    if (error) {
      console.warn('Token history insert failed:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Token history insert error:', e);
    return false;
  }
}

export async function fetchTokenHistorySupabase(ownerIds?: string[], limit = 200): Promise<TokenHistoryRecord[] | null> {
  if (!supabase) return null;
  try {
    let query = supabase
      .from('token_transactions')
      .select('id, user_email, amount, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (ownerIds && ownerIds.length > 0) {
      query = query.in('user_email', ownerIds);
    }
    const { data, error } = await withTimeout(query as unknown as Promise<{ data: any[] | null; error: any }>);
    if (error || !data) {
      if (error) console.warn('Token history fetch failed:', error.message);
      return null;
    }
    return data.map((row) => ({
      id: row.id,
      ownerId: row.user_email || '',
      amount: row.amount,
      reason: row.reason,
      timestamp: row.created_at,
    }));
  } catch (e) {
    console.warn('Token history fetch error:', e);
    return null;
  }
}
