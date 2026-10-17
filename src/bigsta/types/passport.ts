export interface PassportDocumentSpec {
  country: string;
  document: string;
  widthMm: number;
  heightMm: number;
  dpi: number;
  backgroundRequirements: "white" | "blue" | "red" | "any";
  minResolution: { width: number; height: number };
  maxFileSizeKb: number;
  allowedFormats: ("jpg" | "png")[];
  description?: string;
  tips?: string[];
}

export const PASSPORT_SPECS: PassportDocumentSpec[] = [
  {
    country: "Tanzania",
    document: "Passport & Visa",
    widthMm: 35,
    heightMm: 45,
    dpi: 300,
    backgroundRequirements: "white",
    minResolution: { width: 413, height: 531 },
    maxFileSizeKb: 200,
    allowedFormats: ["jpg"],
    description: "Official passport photo for Tanzania.",
    tips: ["Head straight and centered", "Neutral expression", "Even lighting without shadows"],
  },
  {
    country: "United Kingdom",
    document: "Passport",
    widthMm: 35,
    heightMm: 45,
    dpi: 300,
    backgroundRequirements: "white",
    minResolution: { width: 413, height: 531 },
    maxFileSizeKb: 1024,
    allowedFormats: ["jpg"],
  },
  {
    country: "United States",
    document: "Visa / Passport",
    widthMm: 51,
    heightMm: 51,
    dpi: 300,
    backgroundRequirements: "white",
    minResolution: { width: 600, height: 600 },
    maxFileSizeKb: 240,
    allowedFormats: ["jpg"],
  },
  {
    country: "Schengen Area",
    document: "Visa",
    widthMm: 35,
    heightMm: 45,
    dpi: 300,
    backgroundRequirements: "white",
    minResolution: { width: 413, height: 531 },
    maxFileSizeKb: 500,
    allowedFormats: ["jpg"],
  },
];
