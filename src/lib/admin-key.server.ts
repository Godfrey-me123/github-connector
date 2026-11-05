export async function checkAdminSession(request: Request): Promise<Response | null> {
  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!accessToken) {
    return Response.json(
      { success: false, error: "Authentication required." },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  try {
    const { readAccountRole } = await import("./account-role.server");
    const account = await readAccountRole(accessToken);
    if (!account) {
      return Response.json({ success: false, error: "Invalid account session." }, { status: 401 });
    }

    if (!account.isAdmin) {
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
