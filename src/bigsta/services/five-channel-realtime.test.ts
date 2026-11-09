import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";

describe("Database Migration: Five Channel Realtime, Feedback & Token Grant RPC", () => {
  const migrationPath = new URL(
    "../../../supabase/migrations/20261109184000_five_channel_realtime_and_feedback.sql",
    import.meta.url,
  );
  let migrationSql = "";

  try {
    migrationSql = readFileSync(migrationPath, "utf8");
  } catch {
    migrationSql = readFileSync(
      "supabase/migrations/20261109184000_five_channel_realtime_and_feedback.sql",
      "utf8",
    );
  }

  it("configures REPLICA IDENTITY FULL and Realtime publication for user_feedback", () => {
    expect(migrationSql).toContain("ALTER TABLE public.user_feedback REPLICA IDENTITY FULL;");
    expect(migrationSql).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.user_feedback;");
  });

  it("adds user_email, admin_reply, and replied_at columns to user_feedback", () => {
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS user_email text");
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS admin_reply text");
    expect(migrationSql).toContain("ADD COLUMN IF NOT EXISTS replied_at timestamptz");
  });

  it("enables and configures Row Level Security policies on user_feedback", () => {
    expect(migrationSql).toContain("ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;");
    expect(migrationSql).toContain('CREATE POLICY "Users can read own feedback"');
    expect(migrationSql).toContain('CREATE POLICY "Users can insert feedback"');
    expect(migrationSql).toContain('CREATE POLICY "Admins can update feedback"');
  });

  it("defines atomic admin_grant_tokens RPC with is_bigsta_admin check and token_transactions log", () => {
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.admin_grant_tokens");
    expect(migrationSql).toContain("IF NOT public.is_bigsta_admin() THEN");
    expect(migrationSql).toContain("Unauthorized: Admin role required");
    expect(migrationSql).toContain("UPDATE public.profiles");
    expect(migrationSql).toContain("UPDATE public.user_profiles");
    expect(migrationSql).toContain("INSERT INTO public.token_transactions");
    expect(migrationSql).toContain("'ADMIN_GRANT'");
  });
});
