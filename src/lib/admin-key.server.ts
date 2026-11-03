export async function checkAdminSession(request: Request): Promise<Response | null> {
  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!accessToken) {
    return Response.json(
      { success: false, error: "Authentication required." },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user) {
      return Response.json({ success: false, error: "Invalid account session." }, { status: 401 });
    }

    if (user.app_metadata?.role !== "admin") {
      return Response.json({ success: false, error: "Admin access required." }, { status: 403 });
    }

    return null;
  } catch (error) {
    console.error("[Admin API] Session validation failed:", error);
    return Response.json(
      { success: false, error: "Admin service is temporarily unavailable." },
      { status: 503 },
    );
  }
}
