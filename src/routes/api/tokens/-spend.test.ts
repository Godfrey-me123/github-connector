import { describe, expect, it } from "vitest";
import { Route } from "./spend";

describe("Fail-Closed Token Spend Endpoint (/api/tokens/spend)", () => {
  const postHandler = (Route as any).options?.server?.handlers?.POST;

  it("rejects unauthenticated spend requests with 401", async () => {
    const req = new Request("https://bigsta.com/api/tokens/spend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId: "nida", operationId: "op-123" }),
    });

    const res = await postHandler({ request: req });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Authentication required.");
  });

  it("rejects invalid service IDs with 400 Bad Request", async () => {
    const req = new Request("https://bigsta.com/api/tokens/spend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer mock-token-123",
      },
      body: JSON.stringify({ serviceId: "unsupported_service", operationId: "op-123" }),
    });

    const res = await postHandler({ request: req });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid token transaction.");
  });
});
