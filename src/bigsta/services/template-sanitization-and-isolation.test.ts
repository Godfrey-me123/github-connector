import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { sanitizeTemplateForSaving } from "../utils/templateMappingEngine";
import { detectTemplateType } from "../utils/templateTypeDetector";
import { CardTemplate, TextLayer, ImageLayer, BarcodeLayer, QRCodeLayer } from "../types";
import { useTemplateStore } from "../store/useTemplateStore";

describe("BIGsta Template Sanitization & Service Isolation", () => {
  const sampleUserAPhotoBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
  const sampleUserASigBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  const populatedNidaTemplate: CardTemplate = {
    id: "universal_nida_front",
    templateName: "NIDA Front Card Design",
    cardWidth: 85.6,
    cardHeight: 53.98,
    unit: "mm",
    dpi: 300,
    orientation: "landscape",
    serviceId: "nida",
    side: "Front Side",
    background: {
      type: "image",
      src: "https://supabase.co/storage/v1/object/public/backgrounds/nida_front_bg.png",
    },
    layers: [
      {
        id: "txt_first_name",
        name: "First Name",
        type: "text",
        x: 10,
        y: 15,
        width: 40,
        height: 8,
        fontSize: 12,
        fontFamily: "Arial",
        color: "#000000",
        bindingKey: "FIRST_NAME",
        text: "ALICE",
      } as TextLayer,
      {
        id: "txt_last_name",
        name: "Last Name",
        type: "text",
        x: 10,
        y: 25,
        width: 40,
        height: 8,
        fontSize: 12,
        fontFamily: "Arial",
        color: "#000000",
        bindingKey: "LAST_NAME",
        text: "MKWAWA",
      } as TextLayer,
      {
        id: "txt_nida_number",
        name: "NIDA ID Number",
        type: "text",
        x: 10,
        y: 35,
        width: 60,
        height: 8,
        fontSize: 14,
        fontFamily: "Arial",
        color: "#111111",
        bindingKey: "NIDA_NUMBER",
        text: "19900101-11111-00001-01",
      } as TextLayer,
      {
        id: "img_user_photo",
        name: "Cardholder Photo",
        type: "image",
        x: 55,
        y: 10,
        width: 25,
        height: 32,
        src: sampleUserAPhotoBase64,
        bindingKey: "PHOTO",
      } as ImageLayer,
      {
        id: "img_signature",
        name: "User Signature",
        type: "image",
        x: 10,
        y: 45,
        width: 30,
        height: 10,
        src: sampleUserASigBase64,
        bindingKey: "SIGNATURE",
      } as ImageLayer,
      {
        id: "barcode_nida",
        name: "Card Barcode",
        type: "barcode",
        x: 10,
        y: 48,
        width: 50,
        height: 6,
        data: "19900101111110000101",
        barcodeType: "Code128",
      } as BarcodeLayer,
      {
        id: "qr_nida",
        name: "Card QR Code",
        type: "qrcode",
        x: 70,
        y: 35,
        width: 12,
        height: 12,
        data: "NIDA:19900101111110000101:ALICE:MKWAWA",
      } as QRCodeLayer,
    ],
    guides: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = String(v);
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
        clear: () => {
          mockStorage = {};
        },
      },
    };
    (globalThis as any).localStorage = (globalThis as any).window.localStorage;

    (globalThis as any).indexedDB = {
      open: () => ({
        result: {
          transaction: () => ({
            objectStore: () => ({
              get: () => ({ onsuccess: null, onerror: null }),
              put: () => ({ onsuccess: null, onerror: null }),
              getAll: () => ({ onsuccess: null, onerror: null }),
            }),
          }),
        },
        addEventListener: () => {},
        onerror: () => {},
        onsuccess: () => {},
      }),
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
    delete (globalThis as any).indexedDB;
  });

  it("sanitizes populated NIDA template JSON to contain design data only", () => {
    const sanitized = sanitizeTemplateForSaving(populatedNidaTemplate);
    const jsonStr = JSON.stringify(sanitized);

    // Verify personal details of User A are completely absent
    expect(jsonStr).not.toContain("ALICE");
    expect(jsonStr).not.toContain("MKWAWA");
    expect(jsonStr).not.toContain("19900101-11111-00001-01");
    expect(jsonStr).not.toContain("19900101111110000101");
    expect(jsonStr).not.toContain(sampleUserAPhotoBase64);
    expect(jsonStr).not.toContain(sampleUserASigBase64);

    // Verify design properties are preserved
    expect(sanitized.cardWidth).toBe(85.6);
    expect(sanitized.cardHeight).toBe(53.98);
    expect(sanitized.background?.src).toContain("nida_front_bg.png");
    expect(sanitized.layers.length).toBe(populatedNidaTemplate.layers.length);

    // Verify placeholder conversions
    const firstNameLayer = sanitized.layers.find((l) => l.id === "txt_first_name") as TextLayer;
    expect(firstNameLayer.text).toBe("{{FIRST_NAME}}");

    const photoLayer = sanitized.layers.find((l) => l.id === "img_user_photo") as any;
    expect(photoLayer.type).toBe("placeholder");
    expect(photoLayer.placeholderKey).toBe("photo");
    expect(photoLayer.src).toBeUndefined();

    const sigLayer = sanitized.layers.find((l) => l.id === "img_signature") as any;
    expect(sigLayer.type).toBe("placeholder");
    expect(sigLayer.placeholderKey).toBe("signature");
    expect(sigLayer.src).toBeUndefined();

    const barcodeLayer = sanitized.layers.find((l) => l.id === "barcode_nida") as BarcodeLayer;
    expect(barcodeLayer.data).toBe("12345678901234567890");

    const qrLayer = sanitized.layers.find((l) => l.id === "qr_nida") as QRCodeLayer;
    expect(qrLayer.data).toBe("12345678901234567890");
  });

  it("sanitizes NHIF and Zambia NRC templates without retaining cardholder details", () => {
    const populatedNhifTemplate: CardTemplate = {
      ...populatedNidaTemplate,
      id: "nhif_card_template",
      serviceId: "nhif",
      layers: [
        {
          id: "txt_member_name",
          name: "Member Name",
          type: "text",
          x: 10,
          y: 10,
          bindingKey: "FULL_NAME",
          text: "BAKARI JUMA",
        } as TextLayer,
        {
          id: "txt_card_no",
          name: "Card Number",
          type: "text",
          x: 10,
          y: 20,
          bindingKey: "CARD_NO",
          text: "1234567890",
        } as TextLayer,
        {
          id: "txt_nrc_reg",
          name: "Registration Number",
          type: "text",
          x: 10,
          y: 30,
          bindingKey: "REGISTRATION_NUMBER",
          text: "999999/11/1",
        } as TextLayer,
        {
          id: "img_thumbprint",
          name: "Thumbprint",
          type: "image",
          x: 50,
          y: 20,
          src: sampleUserAPhotoBase64,
          bindingKey: "THUMBPRINT",
        } as ImageLayer,
      ],
    };

    const sanitized = sanitizeTemplateForSaving(populatedNhifTemplate);
    const jsonStr = JSON.stringify(sanitized);

    expect(jsonStr).not.toContain("BAKARI JUMA");
    expect(jsonStr).not.toContain("1234567890");
    expect(jsonStr).not.toContain("999999/11/1");
    expect(jsonStr).not.toContain(sampleUserAPhotoBase64);

    const nameLayer = sanitized.layers.find((l) => l.id === "txt_member_name") as TextLayer;
    expect(nameLayer.text).toBe("{{FULL_NAME}}");

    const cardNoLayer = sanitized.layers.find((l) => l.id === "txt_card_no") as TextLayer;
    expect(cardNoLayer.text).toBe("{{CARD_NO}}");

    const thumbLayer = sanitized.layers.find((l) => l.id === "img_thumbprint") as any;
    expect(thumbLayer.type).toBe("placeholder");
    expect(thumbLayer.placeholderKey).toBe("thumbprint");
  });

  it("sanitizes unbound uploaded images and base64 crops", () => {
    const templateWithCustomImage: CardTemplate = {
      ...populatedNidaTemplate,
      id: "custom_card",
      layers: [
        {
          id: "layer_user_crop_123",
          name: "User Crop Upload",
          type: "image",
          x: 20,
          y: 20,
          src: sampleUserAPhotoBase64,
        } as ImageLayer,
      ],
    };

    const sanitized = sanitizeTemplateForSaving(templateWithCustomImage);
    const jsonStr = JSON.stringify(sanitized);

    expect(jsonStr).not.toContain(sampleUserAPhotoBase64);
    const cropLayer = sanitized.layers[0] as any;
    expect(cropLayer.type).toBe("placeholder");
    expect(cropLayer.src).toBeUndefined();
  });

  it("saveStudioDraft saves only sanitized templates to localStorage without user data", () => {
    useTemplateStore.setState({
      activeServiceId: "nida",
      currentTemplate: populatedNidaTemplate,
    });

    const store = useTemplateStore.getState();
    store.saveStudioDraft();

    const storedDraftJson = (globalThis as any).localStorage.getItem("bigsta_studio_draft_nida");
    expect(storedDraftJson).toBeDefined();
    expect(storedDraftJson).not.toContain("ALICE");
    expect(storedDraftJson).not.toContain("MKWAWA");
    expect(storedDraftJson).not.toContain("19900101-11111-00001-01");
    expect(storedDraftJson).not.toContain(sampleUserAPhotoBase64);
  });

  it("detectTemplateType does not fall back to NIDA for non-national ID card types", () => {
    const employeeCard: Partial<CardTemplate> = {
      templateName: "Staff Access Card",
      cardType: "Employee ID",
      layers: [],
    };
    expect(detectTemplateType(employeeCard as CardTemplate)).toBe("Generic ID");

    const studentCard: Partial<CardTemplate> = {
      templateName: "Campus Student Card",
      cardType: "Student ID",
      layers: [],
    };
    expect(detectTemplateType(studentCard as CardTemplate)).toBe("Generic ID");

    const actualNida: Partial<CardTemplate> = {
      templateName: "NIDA Citizen Card",
      cardType: "National ID",
      layers: [],
    };
    expect(detectTemplateType(actualNida as CardTemplate)).toBe("NIDA");
  });
});
