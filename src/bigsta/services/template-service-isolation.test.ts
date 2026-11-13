import { describe, it, expect } from "bun:test";
import { isTemplateForService } from "./shared/templateMappingEngine";
import { useTemplateStore } from "../store/useTemplateStore";
import { detectTemplateType } from "../utils/templateTypeDetector";
import { CardTemplate } from "../types";

describe("Strict Template Service Isolation & Misclassification Guard", () => {
  // Simulated misclassified Supabase template (exact replica of template_1793603069358)
  const misclassifiedNhifUnderNida: CardTemplate = {
    id: "template_1793603069358",
    templateName: "nhif 1",
    cardType: "National ID",
    serviceId: "nida",
    isUniversal: false,
    isActive: true,
    cardWidth: 85.6,
    cardHeight: 53.98,
    layers: [
      { id: "nhif_card_number", name: "Card Number", type: "text", x: 10, y: 10, width: 50, height: 10 },
      { id: "nhif_full_name", name: "Full Name", type: "text", x: 10, y: 25, width: 50, height: 10 },
      { id: "nhif_gender", name: "Gender", type: "text", x: 10, y: 35, width: 20, height: 10 },
      { id: "nhif_date_of_birth", name: "DOB", type: "text", x: 10, y: 45, width: 30, height: 10 },
      { id: "nhif_passport_photo", name: "Photo", type: "placeholder", x: 60, y: 10, width: 20, height: 25 },
    ],
  };

  const validNidaTemplate: CardTemplate = {
    id: "sample_national_id",
    templateName: "Tanzania National ID (NIDA) - Front",
    cardType: "National ID",
    serviceId: "nida",
    isUniversal: true,
    isActive: true,
    cardWidth: 85.6,
    cardHeight: 53.98,
    layers: [
      { id: "nida_nin", name: "NIN", type: "text", x: 10, y: 10, width: 50, height: 10 },
      { id: "nida_first_name", name: "First Name", type: "text", x: 10, y: 25, width: 50, height: 10 },
    ],
  };

  it("isTemplateForService strictly rejects misclassified NHIF template when requesting NIDA", () => {
    // Even though serviceId is 'nida' and cardType is 'National ID',
    // the name contains 'nhif' and layers start with 'nhif_'
    const matchesNida = isTemplateForService(misclassifiedNhifUnderNida, "nida");
    expect(matchesNida).toBe(false);

    // Should correctly match NHIF based on layer IDs and template name
    const matchesNhif = isTemplateForService(misclassifiedNhifUnderNida, "nhif");
    expect(matchesNhif).toBe(true);

    // Valid NIDA template matches NIDA and not NHIF
    expect(isTemplateForService(validNidaTemplate, "nida")).toBe(true);
    expect(isTemplateForService(validNidaTemplate, "nhif")).toBe(false);
  });

  it("detectTemplateType does not classify misclassified NHIF card as NIDA", () => {
    const detected = detectTemplateType(misclassifiedNhifUnderNida);
    expect(detected).not.toBe("NIDA");
  });

  it("getUniversalFrontTemplate('nida') ignores misclassified custom templates and provides clean NIDA template", () => {
    const prevCustoms = useTemplateStore.getState().customTemplates;

    // Inject the misclassified template into customTemplates
    useTemplateStore.setState({
      customTemplates: [misclassifiedNhifUnderNida, ...prevCustoms],
    });

    const resolved = useTemplateStore.getState().getUniversalFrontTemplate("nida");
    expect(resolved).not.toBeNull();
    expect(resolved?.id).not.toBe("template_1793603069358");
    expect(resolved?.templateName?.toLowerCase().includes("nhif")).toBe(false);

    // Clean up
    useTemplateStore.setState({ customTemplates: prevCustoms });
  });

  it("setPopulatedCardPair reliably creates serviceId 'nida' when populated with NIDA form data", () => {
    useTemplateStore.getState().setPopulatedCardPair(
      validNidaTemplate,
      null,
      { nidaNumber: "19900101-12345-00001-20", firstName: "Juma", lastName: "Rashid" } as any
    );

    const session = useTemplateStore.getState().currentGenerationSession;
    expect(session).not.toBeNull();
    expect(session?.serviceId).toBe("nida");
    expect(session?.formData.firstName).toBe("Juma");
  });
});
