// @ts-nocheck -- imported legacy BIGsta code; typed incrementally during audit
export const FONT_LIBRARY = [
  "Manual Typewriter",
  "Courier Prime",
  "Special Elite",
  "Olympia Congress",
  "Cooper Black",
  "Archivo Black",
  "Arial Black",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Impact",
  "Trebuchet MS",
  "Georgia",
  "Verdana",
  "Comic Sans MS",
  "Tahoma",
];

export interface FontWeightOption {
  label: string;
  value: number; // 300, 400, 500, 600, 700, 800, 900
  name: string; // Light, Regular, Medium, Semi Bold, Bold, Extra Bold, Black
}

export const ALL_FONT_WEIGHTS: FontWeightOption[] = [
  { label: "Light — 300", value: 300, name: "Light" },
  { label: "Regular — 400", value: 400, name: "Regular" },
  { label: "Medium — 500", value: 500, name: "Medium" },
  { label: "Semi Bold — 600", value: 600, name: "Semi Bold" },
  { label: "Bold — 700", value: 700, name: "Bold" },
  { label: "Extra Bold — 800", value: 800, name: "Extra Bold" },
  { label: "Black — 900", value: 900, name: "Black" },
];

// Available weights mapping per font family based on standard font files and web availability
export const FONT_WEIGHTS_BY_FAMILY: Record<string, number[]> = {
  "Manual Typewriter": [400, 700],
  "Manual Typewriter Regular": [400],
  "Courier Prime": [400, 700],
  "Special Elite": [400],
  "Olympia Congress": [400],
  "Cooper Black": [400],
  "Cooper Black Regular": [400],
  "Archivo Black": [400],
  Arial: [400, 700],
  "Arial Black": [900],
  Helvetica: [300, 400, 500, 700],
  "Times New Roman": [400, 700],
  "Courier New": [400, 700],
  Impact: [400, 900],
  "Trebuchet MS": [400, 700],
  Georgia: [400, 700],
  Verdana: [400, 700],
  "Comic Sans MS": [400, 700],
  Tahoma: [400, 700],
};

export function getAvailableWeightsForFont(fontFamily: string): FontWeightOption[] {
  const allowedValues = FONT_WEIGHTS_BY_FAMILY[fontFamily] || [400, 700];
  return ALL_FONT_WEIGHTS.filter((w) => allowedValues.includes(w.value));
}

export function getClosestValidWeight(fontFamily: string, currentWeight: number): number {
  const options = getAvailableWeightsForFont(fontFamily);
  if (options.some((o) => o.value === currentWeight)) {
    return currentWeight;
  }
  let closest = options[0].value;
  let minDiff = Math.abs(currentWeight - closest);
  for (const opt of options) {
    const diff = Math.abs(currentWeight - opt.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = opt.value;
    }
  }
  return closest;
}

export function getWeightLabel(value: number): string {
  const match = ALL_FONT_WEIGHTS.find((w) => w.value === value);
  return match ? match.label : `Weight ${value}`;
}

export const FONT_SCOPE_STORAGE_KEY = "id_card_font_scope_preference";
export const WEIGHT_SCOPE_STORAGE_KEY = "id_card_weight_scope_preference";

export type FontScope = "selected" | "all";

export function getStoredFontScope(): FontScope {
  try {
    const saved = localStorage.getItem(FONT_SCOPE_STORAGE_KEY);
    if (saved === "selected" || saved === "all") {
      return saved;
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return "selected";
}

export function setStoredFontScope(scope: FontScope): void {
  try {
    localStorage.setItem(FONT_SCOPE_STORAGE_KEY, scope);
  } catch (e) {
    // Ignore localStorage errors
  }
}

export function getStoredWeightScope(): FontScope {
  try {
    const saved = localStorage.getItem(WEIGHT_SCOPE_STORAGE_KEY);
    if (saved === "selected" || saved === "all") {
      return saved;
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  return "selected";
}

export function setStoredWeightScope(scope: FontScope): void {
  try {
    localStorage.setItem(WEIGHT_SCOPE_STORAGE_KEY, scope);
  } catch (e) {
    // Ignore localStorage errors
  }
}

/**
 * Actively forces Manual Typewriter, typewriter families, and Cooper Black to load on Web and inside APK WebViews.
 * Uses FontFace API, document.fonts.load, and a DOM layout primer to ensure glyph rasterization
 * is completed before canvas operations or UI rendering.
 */
export async function forceLoadAppFonts(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // 1. Programmatically register and load FontFace objects for local files
  if (typeof FontFace !== "undefined" && document.fonts) {
    try {
      const facesToLoad = [
        new FontFace("Manual Typewriter", "url(/fonts/ManualTypewriter-Regular.ttf)", {
          weight: "400",
          style: "normal",
          display: "swap",
        }),
        new FontFace("Manual Typewriter", "url(/fonts/ManualTypewriter-Bold.ttf)", {
          weight: "700",
          style: "normal",
          display: "swap",
        }),
        new FontFace("Manual Typewriter Regular", "url(/fonts/ManualTypewriter-Regular.ttf)", {
          weight: "400",
          style: "normal",
          display: "swap",
        }),
        new FontFace("Courier Prime", "url(/fonts/CourierPrime-Regular.ttf)", {
          weight: "400",
          style: "normal",
          display: "swap",
        }),
        new FontFace("Courier Prime", "url(/fonts/CourierPrime-Bold.ttf)", {
          weight: "700",
          style: "normal",
          display: "swap",
        }),
        new FontFace("Courier Prime", "url(/fonts/CourierPrime-Italic.ttf)", {
          weight: "400",
          style: "italic",
          display: "swap",
        }),
        new FontFace("Special Elite", "url(/fonts/SpecialElite-Regular.ttf)", {
          weight: "400",
          style: "normal",
          display: "swap",
        }),
        new FontFace("Olympia Congress", "url(/fonts/OlympiaCongress.ttf)", {
          weight: "400",
          style: "normal",
          display: "swap",
        }),
        new FontFace("Cooper Black", "url(/fonts/CooperBlack.ttf)", {
          weight: "400",
          style: "normal",
          display: "swap",
        }),
        new FontFace("Cooper Black Regular", "url(/fonts/CooperBlack.ttf)", {
          weight: "400",
          style: "normal",
          display: "swap",
        }),
        new FontFace("Cooper Black", "url(/fonts/CooperBlackItalic.ttf)", {
          weight: "400",
          style: "italic",
          display: "swap",
        }),
      ];

      const loaded = await Promise.allSettled(facesToLoad.map((f) => f.load()));
      loaded.forEach((res) => {
        if (res.status === "fulfilled" && res.value) {
          try {
            document.fonts.add(res.value);
          } catch {}
        }
      });
    } catch {}

    // 2. Trigger document.fonts.load explicitly
    try {
      await Promise.allSettled([
        document.fonts.load('400 16px "Manual Typewriter"'),
        document.fonts.load('700 16px "Manual Typewriter"'),
        document.fonts.load('400 16px "Manual Typewriter Regular"'),
        document.fonts.load('400 16px "Courier Prime"'),
        document.fonts.load('700 16px "Courier Prime"'),
        document.fonts.load('italic 400 16px "Courier Prime"'),
        document.fonts.load('400 16px "Special Elite"'),
        document.fonts.load('400 16px "Olympia Congress"'),
        document.fonts.load('400 16px "Cooper Black"'),
        document.fonts.load('400 16px "Cooper Black Regular"'),
        document.fonts.load('italic 400 16px "Cooper Black"'),
      ]);
    } catch {}
  }

  // 3. Inject an offscreen DOM primer to force Android WebView / APK layout engine to rasterize
  try {
    if (!document.getElementById("bigsta-font-primer")) {
      const primer = document.createElement("div");
      primer.id = "bigsta-font-primer";
      primer.setAttribute("aria-hidden", "true");
      primer.style.cssText =
        "position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none;z-index:-1;width:1px;height:1px;overflow:hidden;";
      primer.innerHTML = `
        <span style="font-family:'Manual Typewriter', monospace; font-weight:400;">Manual Typewriter Regular</span>
        <span style="font-family:'Manual Typewriter', monospace; font-weight:700;">Manual Typewriter Bold</span>
        <span style="font-family:'Manual Typewriter Regular', monospace; font-weight:400;">Manual Typewriter Regular</span>
        <span style="font-family:'Courier Prime', monospace; font-weight:400;">Courier Prime Regular</span>
        <span style="font-family:'Courier Prime', monospace; font-weight:700;">Courier Prime Bold</span>
        <span style="font-family:'Special Elite', cursive, monospace; font-weight:400;">Special Elite Primer</span>
        <span style="font-family:'Olympia Congress', monospace; font-weight:400;">Olympia Congress Primer</span>
        <span style="font-family:'Cooper Black', serif; font-weight:400;">Cooper Black Primer</span>
        <span style="font-family:'Cooper Black Regular', serif; font-weight:400;">Cooper Black Regular Primer</span>
        <span style="font-family:'Cooper Black', serif; font-weight:400; font-style:italic;">Cooper Black Italic Primer</span>
      `;
      document.body?.appendChild(primer);
    }
  } catch {}

  // 4. Ensure document.fonts.ready has resolved
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {}
  }
}

