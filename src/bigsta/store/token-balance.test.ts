import { describe, it, expect, beforeEach } from "bun:test";
import { useTemplateStore } from "./useTemplateStore";

const USER_ID = "11111111-2222-3333-4444-555555555555";

function seed() {
  useTemplateStore.setState({
    authRole: "user",
    currentAuthKey: USER_ID,
    userProfile: { name: "Test", phone: "", email: "test@gmail.com", region: "" },
    userTokens: 0,
    registeredUsers: [
      { id: "profile-1", passkey: USER_ID, authUserId: USER_ID, email: "test@gmail.com", tokens: 99 } as never,
      { id: "other", passkey: "someone-else", authUserId: "someone-else", email: "x@y.com", tokens: 3 } as never,
    ],
    activePasskeys: [
      { id: "profile-1", key: USER_ID, role: "user", totalUsages: 99, usedUsages: 0, remainingUsages: 99 } as never,
    ],
  });
}

describe("one token balance for every display", () => {
  beforeEach(seed);

  for (const balance of [0, 1, 7]) {
    it(`balance ${balance}: badge, banner, recharge window and passkey all agree`, () => {
      useTemplateStore.getState().applyWalletBalance(balance);
      const s = useTemplateStore.getState();
      expect(s.userTokens).toBe(balance);
      expect(s.registeredUsers.find((u) => u.id === "profile-1")?.tokens).toBe(balance);
      expect(s.activePasskeys[0].remainingUsages).toBe(balance);
      expect(s.activePasskeys[0].paymentStatus).toBe(balance > 0 ? "ACTIVE" : "EXHAUSTED");
    });
  }

  it("never touches another account's balance", () => {
    useTemplateStore.getState().applyWalletBalance(7);
    expect(useTemplateStore.getState().registeredUsers.find((u) => u.id === "other")?.tokens).toBe(3);
  });
});

describe("balance change notification rules", () => {
  it("does not announce the first balance load", async () => {
    const { notifyBalanceChange } = await import("./useTemplateStore");
    let opened = false;
    // first call for a new owner primes, never announces
    notifyBalanceChange("user", "fresh-owner", 0, 7, () => (opened = true));
    expect(opened).toBe(false);
  });
});
