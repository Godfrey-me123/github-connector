export async function checkAdminSession(
  request: Request,
  verify?: (accessToken: string) => Promise<{ isAdmin: boolean } | null>,
): Promise<Response | null> {
  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!accessToken) {
    return Response.json(
      { success: false, error: "Authentication required." },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  try {
    const readRole = verify ?? (await import("./account-role.server")).readAccountRole;
    const account = await readRole(accessToken);
    if (!account) {
      return Response.json({ success: false, error: "Invalid account session." }, { status: 401 });
    }

    if (!account.isAdmin) {
      return Response.json({ success: false, error: "Admin access required." }, { status: 403 });
    }

    return null;
  } catch (error) {
    return Response.json(
      { success: false, error: "Admin service is temporarily unavailable." },
      { status: 503 },
    );
  }
}
