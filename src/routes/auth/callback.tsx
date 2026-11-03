import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({ component: AuthCallback });

type CallbackState = "loading" | "reset-password" | "redirecting" | "error";

function AuthCallback() {
  const [state, setState] = useState<CallbackState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const completeAuth = async () => {
      const url = new URL(window.location.href);
      const recovery = url.searchParams.get("type") === "recovery";
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } else {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error || !session) throw error || new Error("This sign-in link is invalid or expired.");
      }

      if (cancelled) return;
      if (recovery) {
        setState("reset-password");
        return;
      }

      setState("redirecting");
      window.setTimeout(() => window.location.replace("/"), 700);
    };

    void completeAuth().catch(() => {
      if (!cancelled) {
        setErrorMessage("This account link is invalid or expired. Request a new link and try again.");
        setState("error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handlePasswordUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage("Password update failed. Request a fresh reset link and try again.");
      return;
    }

    setState("redirecting");
    window.setTimeout(() => window.location.replace("/"), 700);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B132B] px-4 py-8 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1C2541]/95 p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-xl border border-[#47A5FF]/30 bg-[#47A5FF]/10 p-3 text-[#47A5FF]">
            {state === "loading" || state === "redirecting" ? (
              <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : state === "error" ? (
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            ) : (
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div>
            <h1 className="text-xl font-bold">BIGsta account</h1>
            <p className="text-sm text-slate-300">
              {state === "reset-password" ? "Choose a new password" : "Verifying your secure link"}
            </p>
          </div>
        </div>

        {state === "loading" && (
          <p className="text-sm text-slate-300" role="status" aria-live="polite">
            Checking your account link…
          </p>
        )}

        {state === "redirecting" && (
          <p className="flex items-center gap-2 text-sm text-emerald-200" role="status" aria-live="polite">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Account verified. Opening BIGsta…
          </p>
        )}

        {state === "error" && (
          <p className="text-sm text-red-200" role="alert">
            {errorMessage}
          </p>
        )}

        {state === "reset-password" && (
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium">
              <span>New password</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#0B132B] px-3.5 py-3 text-white outline-none transition focus:border-[#47A5FF] focus:ring-2 focus:ring-[#47A5FF]/20"
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">
              <span>Confirm new password</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#0B132B] px-3.5 py-3 text-white outline-none transition focus:border-[#47A5FF] focus:ring-2 focus:ring-[#47A5FF]/20"
              />
            </label>
            {errorMessage && (
              <p className="text-sm text-red-200" role="alert">
                {errorMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#47A5FF] px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Updating password…" : "Update password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
