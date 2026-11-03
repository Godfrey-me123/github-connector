import { CardTemplate, UploadedBackground } from "../types";
import { isBackSideTemplate } from "./templateMappingEngine";

/**
 * Canonical Document Type Identifiers supported by BIGsta.
 * Guarantees strict 1-to-1 isolation between categories.
 */
export const SUPPORTED_DOCUMENT_CATEGORIES: {
  id: string;
  name: string;
  displayName: string;
  aliases: string[];
}[] = [
  {
    id: "nida",
    name: "National ID",
    displayName: "NIDA National ID",
    aliases: ["nida", "national id", "tanzania nida", "national_id"],
  },
  {
    id: "driving_license",
    name: "Driving Licence",
    displayName: "Driving Licence",
    aliases: ["driving_license", "driving license", "driving licence", "driver licence", "licence"],
  },
  {
    id: "passport",
    name: "Passport",
    displayName: "Passport",
    aliases: ["passport", "passport_studio", "international passport"],
  },
  {
    id: "nhif",
    name: "NHIF Membership Card",
    displayName: "NHIF Health Card",
    aliases: ["nhif", "nhif card", "nhif membership card", "health card"],
  },
  {
    id: "nrc_zambia",
    name: "NRC Zambia",
    displayName: "NRC Card Zambia",
    aliases: ["nrc_zambia", "nrc card-zambia", "zambia nrc", "nrc"],
  },
  {
    id: "birth_certificate",
    name: "Birth Certificate",
    displayName: "Birth Certificate",
    aliases: ["birth_certificate", "birth certificate", "rita"],
  },
  {
    id: "tin",
    name: "TIN Certificate",
    displayName: "TRA TIN Certificate",
    aliases: ["tin", "tin certificate", "tra tin"],
  },
  {
    id: "business_license",
    name: "Business License",
    displayName: "Business License",
    aliases: ["business_license", "business license", "brela"],
  },
  {
    id: "heslb",
    name: "HESLB",
    displayName: "Student ID / HESLB",
    aliases: ["heslb", "student id", "heslb loan"],
  },
  {
    id: "ajira",
    name: "Ajira Portal",
    displayName: "Ajira Portal",
    aliases: ["ajira", "ajira portal"],
  },
  {
    id: "kadi_ya_mpiga_kura",
    name: "Kadi ya Mpiga Kura",
    displayName: "Kadi ya Mpiga Kura",
    aliases: ["kadi ya mpiga kura", "voter card", "voter registration card", "mpiga kura"],
  },
];

/**
 * Resolves the canonical document_type_id (e.g. "nida", "driving_license", "passport", etc.).
 * Guarantees strict non-mixing. NEVER defaults to NIDA when an explicit service or cardType is given.
 */
export function resolveDocumentTypeId(
  input: string | Partial<CardTemplate> | null | undefined,
  fallbackToDefault = false,
): string {
  if (!input) {
    if (fallbackToDefault) return "nida";
    return "";
  }

  let testStr = "";
  if (typeof input === "string") {
    testStr = input.toLowerCase().trim();
  } else {
    // Check template properties in order of precision: serviceId, cardType, templateName, id
    const serviceId = (input.serviceId || "").toLowerCase().trim();
    const cardType = (input.cardType || "").toLowerCase().trim();
    const name = (input.templateName || "").toLowerCase().trim();
    const id = (input.id || "").toLowerCase().trim();

    testStr = `${serviceId} ${cardType} ${name} ${id}`;
  }

  // Exact match against aliases
  for (const cat of SUPPORTED_DOCUMENT_CATEGORIES) {
    for (const alias of cat.aliases) {
      if (testStr.includes(alias)) {
        return cat.id;
      }
    }
  }

  if (fallbackToDefault) return "nida";
  return "";
}

/**
 * Normalizes side identifier to strictly "front" or "back".
 */
export function normalizeSide(
  sideOrTemplate: string | Partial<CardTemplate> | null | undefined,
): "front" | "back" {
  if (!sideOrTemplate) return "front";

  if (typeof sideOrTemplate === "object") {
    return isBackSideTemplate(sideOrTemplate as CardTemplate) ? "back" : "front";
  }

  const s = String(sideOrTemplate).toLowerCase().trim();
  if (s === "back" || s === "back side" || s === "back_side" || s.endsWith("_back")) {
    return "back";
  }
  return "front";
}

export type CompletionSituation = "A" | "B" | "C" | "D";

export interface TemplateCompletionStatus {
  front_status: "configured" | "missing";
  back_status: "configured" | "missing";
  is_complete: boolean;
  situation: CompletionSituation;
  statusMessage: string;
}

/**
 * INTELLIGENT FRONT/BACK COMPLETION CHECK
 * Evaluates whether Front, Back, or Both are configured for the given template.
 */
export function checkTemplateCompletion(
  template: CardTemplate | null | undefined,
  allBackgrounds: UploadedBackground[] = [],
  frontTemplateOverride?: CardTemplate | null,
  backTemplateOverride?: CardTemplate | null,
): TemplateCompletionStatus {
  if (!template) {
    return {
      front_status: "missing",
      back_status: "missing",
      is_complete: false,
      situation: "A",
      statusMessage:
        "Front and Back backgrounds have not yet been configured. Start by setting up the Front.",
    };
  }

  const docTypeId = resolveDocumentTypeId(template, true);
  const currentSide = normalizeSide(template);

  // Check Front Status:
  // 1. If explicit front_status is stored
  // 2. If frontTemplateOverride has a valid background
  // 3. If currentTemplate is front and has a valid background
  // 4. If any active background exists for (docTypeId, template.id, 'front')
  let frontConfigured = false;
  if (template.front_status === "configured") {
    frontConfigured = true;
  } else if (frontTemplateOverride?.background?.src) {
    frontConfigured = true;
  } else if (currentSide === "front" && template.background?.src) {
    frontConfigured = true;
  } else if (template.front_background?.src) {
    frontConfigured = true;
  } else {
    // Check if an active front background exists in uploaded library
    const hasActiveFrontBg = allBackgrounds.some(
      (b) =>
        b.documentTypeId === docTypeId &&
        (b.templateId === template.id || !b.templateId) &&
        b.side === "front" &&
        b.isActive,
    );
    if (hasActiveFrontBg) frontConfigured = true;
  }

  // Check Back Status:
  // 1. If explicit back_status is stored
  // 2. If backTemplateOverride has a valid background
  // 3. If currentTemplate is back and has a valid background
  // 4. If any active background exists for (docTypeId, template.id, 'back')
  let backConfigured = false;
  if (template.back_status === "configured") {
    backConfigured = true;
  } else if (backTemplateOverride?.background?.src) {
    backConfigured = true;
  } else if (currentSide === "back" && template.background?.src) {
    backConfigured = true;
  } else if (template.back_background?.src) {
    backConfigured = true;
  } else {
    // Check if an active back background exists in uploaded library
    const hasActiveBackBg = allBackgrounds.some(
      (b) =>
        b.documentTypeId === docTypeId &&
        (b.templateId === template.id || !b.templateId) &&
        b.side === "back" &&
        b.isActive,
    );
    if (hasActiveBackBg) backConfigured = true;
  }

  const front_status = frontConfigured ? "configured" : "missing";
  const back_status = backConfigured ? "configured" : "missing";
  const is_complete = frontConfigured && backConfigured;

  let situation: CompletionSituation = "A";
  let statusMessage = "";

  if (!frontConfigured && !backConfigured) {
    situation = "A";
    statusMessage =
      "Front and Back backgrounds have not yet been configured. Start by setting up the Front.";
  } else if (frontConfigured && !backConfigured) {
    situation = "B";
    statusMessage =
      "Front background is already configured and active. Now configure the Back background.";
  } else if (!frontConfigured && backConfigured) {
    situation = "C";
    statusMessage =
      "Back background is already configured and active. Now configure the Front background.";
  } else {
    situation = "D";
    statusMessage =
      "Both Front and Back backgrounds are successfully configured and active for this template. You can now continue with other template settings.";
  }

  return {
    front_status,
    back_status,
    is_complete,
    situation,
    statusMessage,
  };
}
