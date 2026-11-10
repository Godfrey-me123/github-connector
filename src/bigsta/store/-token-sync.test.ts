import { describe, expect, it, beforeEach } from "vitest";
import { useTemplateStore, selectEffectiveTokens } from "./useTemplateStore";

describe("Single Source of Truth: Token Balance Synchronization", () => {
  beforeEach(() => {
    // Reset store to known user state
    useTemplateStore.setState({
      authRole: "user",
      currentAuthKey: "user-uuid-12345",
      userProfile: {
        name: "Godfrey Chris",
        email: "godfreychris2002@gmail.com",
        phone: "0754000000",
        region: "Dar es Salaam",
      },
      registeredUsers: [
        {
          id: "user-uuid-12345",
          fullName: "Godfrey Chris",
          email: "godfreychris2002@gmail.com",
          phone: "0754000000",
          passkey: "godfreychris2002@gmail.com",
          passkeyId: "user-uuid-12345",
          authUserId: "user-uuid-12345",
          role: "user",
          tokens: 0,
          status: "ACTIVE",
          registeredDate: "2026-11-10 04:00",
          createdAtTimestamp: Date.now(),
          lastActive: "Now",
          lastActiveTimestamp: Date.now(),
          isOnline: true,
          currentService: "None",
          currentActivity: "Active",
          servicesUsed: [],
        },
      ],
      activePasskeys: [
        {
          id: "user-uuid-12345",
          key: "user-uuid-12345",
          role: "user",
          active: true,
          createdDate: "2026-11-10",
          createdAtTimestamp: Date.now(),
          createdBy: "Godfrey Chris",
          description: "Godfrey Chris (godfreychris2002@gmail.com)",
          totalUsages: 1,
          usedUsages: 0,
          remainingUsages: 0,
          paymentStatus: "EXHAUSTED",
          packageName: "Standard",
          packagePrice: "Free",
          usageHistory: [],
        },
      ],
      userTokens: 0,
      paymentRequests: [],
    });
  });

  it("Test with 7 tokens: Hides 'No Tokens Remaining' banner and displays 7 in all components", () => {
    // Set token balance to 7 (matching the scenario in the user screenshot)
    useTemplateStore.getState().setUserTokens(7);

    const state = useTemplateStore.getState();
    const effectiveTokens = selectEffectiveTokens(state);

    // 1. Selector returns 7
    expect(effectiveTokens).toBe(7);
    expect(state.getEffectiveTokens()).toBe(7);

    // 2. Global banner check: isExhausted MUST be false
    const isExhausted = effectiveTokens <= 0;
    expect(isExhausted).toBe(false);

    // 3. Form badge check: remaining tokens MUST be 7 and status MUST be ACTIVE
    expect(state.userTokens).toBe(7);
    expect(state.activePasskeys[0].remainingUsages).toBe(7);
    expect(state.activePasskeys[0].paymentStatus).toBe("ACTIVE");
    expect(state.registeredUsers[0].tokens).toBe(7);

    // 4. Service validation check: generation must be allowed
    const validation = state.validateServiceAccess("nida");
    expect(validation.allowed).toBe(true);
    expect(validation.remainingUsages).toBe(7);
  });

  it("Test with 1 token: Hides 'No Tokens Remaining' banner and permits service usage", () => {
    useTemplateStore.getState().setUserTokens(1);

    const state = useTemplateStore.getState();
    const effectiveTokens = selectEffectiveTokens(state);

    expect(effectiveTokens).toBe(1);
    expect(state.getEffectiveTokens()).toBe(1);

    // Banner is hidden
    expect(effectiveTokens <= 0).toBe(false);

    // All mirrored stores agree
    expect(state.activePasskeys[0].remainingUsages).toBe(1);
    expect(state.registeredUsers[0].tokens).toBe(1);

    const validation = state.validateServiceAccess("nida");
    expect(validation.allowed).toBe(true);
    expect(validation.remainingUsages).toBe(1);
  });

  it("Test with 0 tokens: Consistently displays recharge banner and blocks generation", () => {
    useTemplateStore.getState().setUserTokens(0);

    const state = useTemplateStore.getState();
    const effectiveTokens = selectEffectiveTokens(state);

    expect(effectiveTokens).toBe(0);
    expect(state.getEffectiveTokens()).toBe(0);

    // Banner is shown
    expect(effectiveTokens <= 0).toBe(true);

    // Mirrored stores agree
    expect(state.activePasskeys[0].remainingUsages).toBe(0);
    expect(state.activePasskeys[0].paymentStatus).toBe("EXHAUSTED");
    expect(state.registeredUsers[0].tokens).toBe(0);

    // Service validation must block and trigger recharge prompt
    const validation = state.validateServiceAccess("nida");
    expect(validation.allowed).toBe(false);
    expect(validation.reason).toBe("OUT_OF_TOKENS");
  });

  it("Prevents stale cached values when registeredUsers or activePasskeys have outdated counts", () => {
    // Simulate race condition where activePasskeys and registeredUsers have 0,
    // but the authenticated profile loaded 7 tokens into userTokens:
    useTemplateStore.setState({
      userTokens: 7,
      registeredUsers: [], // e.g. unhydrated or empty for non-admin
      activePasskeys: [
        {
          id: "user-uuid-12345",
          key: "user-uuid-12345",
          role: "user",
          active: true,
          createdDate: "2026-11-10",
          createdAtTimestamp: Date.now(),
          createdBy: "Godfrey Chris",
          description: "Stale Passkey Record",
          totalUsages: 1,
          usedUsages: 0,
          remainingUsages: 0, // stale 0
          paymentStatus: "EXHAUSTED",
          packageName: "Standard",
          packagePrice: "Free",
          usageHistory: [],
        },
      ],
    });

    const state = useTemplateStore.getState();
    const effectiveTokens = selectEffectiveTokens(state);

    // Single source of truth must prioritize authenticated userTokens over stale passkey usages
    expect(effectiveTokens).toBe(7);
    expect(effectiveTokens <= 0).toBe(false); // Global banner will NOT show "No Tokens Remaining"
  });

  it("Immediately refreshes all displays upon token deduction and recharge", () => {
    // 1. Initial 7 tokens
    useTemplateStore.getState().setUserTokens(7);
    expect(selectEffectiveTokens(useTemplateStore.getState())).toBe(7);

    // 2. Deduct 1 token -> 6 tokens
    useTemplateStore.getState().setUserTokens(6);
    expect(selectEffectiveTokens(useTemplateStore.getState())).toBe(6);
    expect(useTemplateStore.getState().activePasskeys[0].remainingUsages).toBe(6);

    // 3. Recharge 10 tokens -> 16 tokens
    useTemplateStore.getState().setUserTokens(16);
    expect(selectEffectiveTokens(useTemplateStore.getState())).toBe(16);
    expect(useTemplateStore.getState().registeredUsers[0].tokens).toBe(16);
  });
});
