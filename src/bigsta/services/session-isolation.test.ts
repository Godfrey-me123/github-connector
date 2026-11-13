import { describe, it, expect, beforeEach } from "vitest";
import { useTemplateStore } from "../store/useTemplateStore";
import { saveActiveImageStorage, loadActiveImageStorage, clearActiveImageStorage } from "./activeImageStorage";

// Polyfill minimal localStorage for non-browser test runner environment
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] || null,
    get length() { return store.size; },
  } as Storage;
}

describe("Session & Multi-Service State Isolation", () => {
  beforeEach(() => {
    useTemplateStore.setState({
      activeServiceId: "nida",
      currentGenerationSession: null,
      lastNidaFormData: null,
      lastDrivingLicenseFormData: null,
      lastNhifFormData: null,
      lastNrcFormData: null,
    });
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("clears previous service form and session data when switching services", () => {
    // 1. Simulate active NIDA session
    useTemplateStore.setState({
      activeServiceId: "nida",
      lastNidaFormData: { firstName: "Alice", nidaNumber: "19900101-11111-00001-01" },
      currentGenerationSession: {
        sessionId: "sess_nida_1",
        serviceId: "nida",
        templateId: "tpl_nida",
        formData: { firstName: "Alice" },
        photoUrl: "data:image/png;base64,alice",
        createdAt: Date.now(),
      },
    });

    expect(useTemplateStore.getState().lastNidaFormData?.firstName).toBe("Alice");
    expect(useTemplateStore.getState().currentGenerationSession?.sessionId).toBe("sess_nida_1");

    // 2. Switch to driving license service
    useTemplateStore.getState().setActiveServiceId("licence");

    // 3. Verify NIDA data and session are wiped clean
    const stateAfterSwitch = useTemplateStore.getState();
    expect(stateAfterSwitch.activeServiceId).toBe("licence");
    expect(stateAfterSwitch.lastNidaFormData).toBeNull();
    expect(stateAfterSwitch.currentGenerationSession).toBeNull();
  });

  it("isolates active image storage across distinct session IDs", async () => {
    await clearActiveImageStorage();

    // Save image for session A
    await saveActiveImageStorage("data:image/png;base64,imageA", {
      sessionId: "session_user_a",
      name: "alice_photo.png",
      service: "nida",
    });

    // Save image for session B
    await saveActiveImageStorage("data:image/png;base64,imageB", {
      sessionId: "session_user_b",
      name: "bakari_photo.png",
      service: "nida",
    });

    // Verify session A returns image A
    const loadedA = await loadActiveImageStorage("session_user_a");
    expect(loadedA?.dataUrl).toBe("data:image/png;base64,imageA");
    expect(loadedA?.metadata?.sessionId).toBe("session_user_a");

    // Verify session B returns image B
    const loadedB = await loadActiveImageStorage("session_user_b");
    expect(loadedB?.dataUrl).toBe("data:image/png;base64,imageB");
    expect(loadedB?.metadata?.sessionId).toBe("session_user_b");
  });

  it("prevents cross-service form bleed across NHIF and NRC switches", () => {
    // Populate NHIF form state
    useTemplateStore.setState({
      activeServiceId: "nhic",
      lastNhifFormData: { fullName: "Bakari Juma", nhifNumber: "NHIF-999" },
    });

    // Switch to NRC
    useTemplateStore.getState().setActiveServiceId("nrc");

    const state = useTemplateStore.getState();
    expect(state.activeServiceId).toBe("nrc");
    expect(state.lastNhifFormData).toBeNull();
    expect(state.lastNrcFormData).toBeNull();
  });

  it("allows setting and clearing currentGenerationSession explicitly", () => {
    const session = {
      sessionId: "gen_12345",
      serviceId: "nida" as const,
      templateId: "nida-front-default",
      formData: { firstName: "Chausiku" },
      photoUrl: null,
      createdAt: 1700000000,
    };

    useTemplateStore.getState().setCurrentGenerationSession(session);
    expect(useTemplateStore.getState().currentGenerationSession).toEqual(session);

    useTemplateStore.getState().clearGenerationSession();
    expect(useTemplateStore.getState().currentGenerationSession).toBeNull();
  });
});

  it("creates an isolated generation session upon setPopulatedCardPair", () => {
    const front = { id: "tpl_front_1", templateName: "NIDA Front", cardType: "NIDA Card", layers: [] } as any;
    const back = { id: "tpl_back_1", templateName: "NIDA Back", cardType: "NIDA Card", layers: [] } as any;
    const formData = {
      firstName: "Hawa",
      lastName: "Moyo",
      nidaNumber: "19950101-12345-00001-20",
      photoUrl: "data:image/png;base64,hawa",
    };

    useTemplateStore.getState().setActiveServiceId("nida");
    useTemplateStore.getState().setPopulatedCardPair(front, back, formData);

    const session = useTemplateStore.getState().currentGenerationSession;
    expect(session).not.toBeNull();
    expect(session?.serviceId).toBe("nida");
    expect(session?.templateId).toBe("tpl_front_1");
    expect(session?.formData).toEqual(formData);
    expect(session?.photoUrl).toBe("data:image/png;base64,hawa");
    expect(session?.sessionId.startsWith("sess_nida_")).toBe(true);
  });

  it("isolates Driving License generation session from NIDA session data", () => {
    const dlFront = { id: "dl_front", templateName: "Driving License Front", cardType: "Driving License", layers: [] } as any;
    const dlBack = { id: "dl_back", templateName: "Driving License Back", cardType: "Driving License", layers: [] } as any;
    const dlData = {
      firstName: "Juma",
      licenceNumber: "TZ-DL-998877",
      pinNumber: "123456",
    };

    useTemplateStore.getState().setActiveServiceId("driving_license");
    useTemplateStore.getState().setPopulatedCardPair(dlFront, dlBack, dlData);

    const session = useTemplateStore.getState().currentGenerationSession;
    expect(session).not.toBeNull();
    expect(session?.serviceId).toBe("licence");
    expect(session?.formData).toEqual(dlData);
    expect(session?.sessionId.startsWith("sess_licence_")).toBe(true);
  });
