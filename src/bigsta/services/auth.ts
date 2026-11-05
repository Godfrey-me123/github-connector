import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export interface AuthActionResult {
  success: boolean;
  message: string;
}

export function getAuthRedirectUrl(): string {
  const configuredRedirect = import.meta.env["NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL"];
  return typeof configuredRedirect === "string" && configuredRedirect.trim()
    ? configuredRedirect.trim()
    : `${window.location.origin}/auth/callback`;
}

function safeAuthErrorMessage(error: unknown, action: "sign-in" | "sign-up" | "reset") {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : 0;

  if (status === 429 || /rate limit|too many requests|over_email_send_rate_limit/.test(message)) {
    return "Too many attempts. Please wait a little while before trying again.";
  }
  if (/email not confirmed|email_not_confirmed/.test(message)) {
    return "Please confirm your email address using the link we sent before signing in.";
  }
  if (/weak_password|password.*(weak|short)|at least \d+ characters/.test(message)) {
    return "Choose a stronger password with at least 8 characters.";
  }
  if (/invalid.*email|email.*invalid/.test(message)) {
    return "Enter a valid email address.";
  }
  if (/invalid login credentials|invalid email or password|user not found/.test(message)) {
    return "Invalid email or password.";
  }
  if (/already registered|already exists|user already registered/.test(message)) {
    return "Unable to create this account. Try signing in or resetting your password.";
  }
  if (action === "reset") {
    return "We couldn’t send a reset email right now. Please try again shortly.";
  }
  return action === "sign-up"
    ? "Account registration is temporarily unavailable. Please try again shortly."
    : "Sign-in is temporarily unavailable. Please try again shortly.";
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) return { success: false, message: safeAuthErrorMessage(error, "sign-in") };
  return { success: true, message: "Signed in." };
}

export async function registerWithEmailPassword(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthActionResult> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
      data: {
        full_name: input.fullName.trim(),
        phone: input.phone.trim(),
      },
    },
  });

  if (error) return { success: false, message: safeAuthErrorMessage(error, "sign-up") };

  return {
    success: true,
    message: data.session
      ? "Your account is ready. You’re now signed in."
      : "Account created. Check your email and confirm your address before signing in.",
  };
}

export async function requestPasswordReset(email: string): Promise<AuthActionResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: getAuthRedirectUrl(),
  });

  if (error) {
    return { success: false, message: safeAuthErrorMessage(error, "reset") };
  }

  return {
    success: true,
    message: "If an account exists for that email, a password reset link has been sent.",
  };
}

export async function bootstrapAuthenticatedSession(session: Session): Promise<{
  session: Session;
  welcomeTokenGranted: boolean;
  isAdmin: boolean;
}> {
  const response = await fetch("/api/auth/bootstrap", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) {
    throw new Error("Could not verify the account session with the server.");
  }

  const result = (await response.json()) as {
    claimsUpdated?: boolean;
    welcomeTokenGranted?: boolean;
    isAdmin?: boolean;
  };

  if (!result.claimsUpdated) {
    return { session, welcomeTokenGranted: result.welcomeTokenGranted === true, isAdmin: result.isAdmin === true };
  }

  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.error || !refreshed.data.session) {
    throw new Error("Could not refresh the account session. Please sign in again.");
  }

  return {
    session: refreshed.data.session,
    welcomeTokenGranted: result.welcomeTokenGranted === true,
    isAdmin: result.isAdmin === true,
  };
}
