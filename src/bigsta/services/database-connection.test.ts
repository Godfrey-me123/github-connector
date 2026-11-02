import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";

test("BIGsta uses only the configured database client without embedded database credentials", () => {
  const source = readFileSync(new URL("./supabase.ts", import.meta.url), "utf8");
  expect(source).toContain('import { supabase as connectedSupabase } from "@/integrations/supabase/client"');
  expect(source).toContain("export const supabase = connectedSupabase;");
  expect(source).not.toMatch(/https:\/\/[^\s"']+\.supabase\.co|FALLBACK_URL|FALLBACK_ANON|LEGACY_SUPABASE_HOST|createClient\(/);
});

test("the connectivity probe never falls back to a different database", () => {
  const source = readFileSync(new URL("../../routes/api/health.ts", import.meta.url), "utf8");
  expect(source).toContain('const url = process.env["SUPABASE_URL"];');
  expect(source).toContain('if (!url || !key) return "down";');
  expect(source).not.toMatch(/https:\/\/[^\s"']+\.supabase\.co|FALLBACK_URL|FALLBACK_ANON/);
});