import mammoth from "mammoth";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export interface DocxConversionResult {
  blob: Blob;
  fileName: string;
  pageCount: number;
  sizeBytes: number;
}

export async function convertDocxToPdf(
  file: File,
  onProgress?: (status: string) => void
): Promise<DocxConversionResult> {
  const fileNameLower = file.name.toLowerCase();

  // Validate format
  if (fileNameLower.endsWith(".doc") && !fileNameLower.endsWith(".docx")) {
    throw new Error(
      "Legacy binary Word (.doc) is not supported directly in the browser. Please open the file in Microsoft Word, Google Docs, or LibreOffice and save it as .docx or PDF first."
    );
  }

  if (!fileNameLower.endsWith(".docx")) {
    throw new Error("Unsupported format. Please select a Word document (.docx).");
  }

  onProgress?.("Reading Word document...");
  const arrayBuffer = await file.arrayBuffer();

  onProgress?.("Extracting document structure & styles...");
  const mammothResult = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1.title:fresh",
        "p[style-name='Subtitle'] => p.subtitle:fresh",
      ],
    }
  );

  const rawHtml = mammothResult.value;
  if (!rawHtml || rawHtml.trim().length === 0) {
    throw new Error("The document appears to be empty or contains no readable content.");
  }

  onProgress?.("Formatting pages for PDF generation...");

  // Create an offscreen, styled rendering container representing A4 pages (794px width)
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px"; // Standard A4 width at 96 DPI
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#111827";
  container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  container.style.fontSize = "13px";
  container.style.lineHeight = "1.6";
  container.style.padding = "48px 56px";
  container.style.boxSizing = "border-box";

  // Inject sanitized HTML with clean print formatting styles
  container.innerHTML = `
    <style>
      .docx-pdf-content h1 { font-size: 24px; font-weight: 800; margin: 20px 0 10px 0; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
      .docx-pdf-content h2 { font-size: 19px; font-weight: 700; margin: 16px 0 8px 0; color: #1e293b; }
      .docx-pdf-content h3 { font-size: 15px; font-weight: 600; margin: 12px 0 6px 0; color: #334155; }
      .docx-pdf-content p { margin: 0 0 10px 0; }
      .docx-pdf-content table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
      .docx-pdf-content th, .docx-pdf-content td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
      .docx-pdf-content th { background-color: #f1f5f9; font-weight: 700; }
      .docx-pdf-content img { max-width: 100%; height: auto; display: block; margin: 12px auto; }
      .docx-pdf-content ul, .docx-pdf-content ol { margin: 8px 0 12px 24px; padding: 0; }
      .docx-pdf-content li { margin-bottom: 4px; }
      .docx-pdf-content blockquote { border-left: 3px solid #3b82f6; margin: 12px 0; padding-left: 14px; color: #475569; font-style: italic; }
    </style>
    <div class="docx-pdf-content">
      ${rawHtml}
    </div>
  `;

  document.body.appendChild(container);

  try {
    onProgress?.("Rendering PDF pages...");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    await new Promise<void>((resolve, reject) => {
      pdf.html(container, {
        html2canvas: {
          scale: 0.75, // Scale down from 794px to match A4 pt width (~595pt)
          useCORS: true,
          logging: false,
        },
        x: 0,
        y: 0,
        width: 595.28, // A4 width in pt
        windowWidth: 794,
        autoPaging: "text",
        callback: () => resolve(),
      }).catch(reject);
    });

    const pageCount = pdf.getNumberOfPages();
    const outputBlob = pdf.output("blob");
    const outputName = file.name.replace(/\.docx$/i, "") + ".pdf";

    return {
      blob: outputBlob,
      fileName: outputName,
      pageCount,
      sizeBytes: outputBlob.size,
    };
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
