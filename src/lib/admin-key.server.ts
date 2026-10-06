// Optional protection matching the original server: if ADMIN_API_KEY is set,
// admin endpoints require the x-admin-key header.
export function checkAdminKey(request: Request): Response | null {
  const key = process.env["ADMIN_API_KEY"];
  if (!key) return null;
  if (request.headers.get("x-admin-key") === key) return null;
  return Response.json(
    { success: false, error: "Unauthorized: missing or invalid x-admin-key" },
    { status: 401 },
  );
}
