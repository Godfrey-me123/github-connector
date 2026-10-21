import mammoth from "mammoth";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export interface DocxConversionResult {
  blob: Blob;
  fileName: string;
  pageCount: number;
  sizeBytes: number;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseRtfToHtml(rtf: string): string {
  let text = rtf.replace(/\{\\fonttbl[\s\S]*?\}/g, "");
  text = text.replace(/\{\\colortbl[\s\S]*?\}/g, "");
  text = text.replace(/\{\\stylesheet[\s\S]*?\}/g, "");
  text = text.replace(/\{\\\*[\s\S]*?\}/g, "");
  text = text.replace(/\\par\b/g, "\n");
  text = text.replace(/\\line\b/g, "\n");
  text = text.replace(/\\tab\b/g, "    ");
  text = text.replace(/\\[a-zA-Z]+-?\d* ?/g, "");
  text = text.replace(/[{}]/g, "");
  
  const paragraphs = text.split(/\r?\n+/).map(p => p.trim()).filter(Boolean);
  return paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join("\n");
}

function parseMarkdownToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  const htmlLines: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inList) {
        htmlLines.push("</ul>");
        inList = false;
      }
      continue;
    }

    if (line.startsWith("# ")) {
      htmlLines.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      htmlLines.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      htmlLines.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    } else if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
      if (!inList) {
        htmlLines.push("<ul>");
        inList = true;
      }
      htmlLines.push(`<li>${escapeHtml(line.slice(2))}</li>`);
    } else {
      if (inList) {
        htmlLines.push("</ul>");
        inList = false;
      }
      // Simple bold replace
      let formatted = escapeHtml(line);
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      htmlLines.push(`<p>${formatted}</p>`);
    }
  }

  if (inList) htmlLines.push("</ul>");
  return htmlLines.join("\n");
}

function extractTextFromBinaryDoc(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let text = "";

  // UTF-16LE decode attempt
  try {
    const utf16Decoder = new TextDecoder("utf-16le", { fatal: false });
    const utf16String = utf16Decoder.decode(bytes);
    const cleanChunks = utf16String.match(/[\w\s.,;:!?'"()\-–—\n\r/\\@#$%&*+=[\]{}<>]{4,}/g);
    if (cleanChunks && cleanChunks.join(" ").length > 40) {
      text = cleanChunks
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length > 2 && !/^[\x00-\x1F\x7F-\x9F]+$/.test(chunk))
        .join("\n\n");
    }
  } catch (e) {}

  if (!text || text.length < 30) {
    try {
      const latinDecoder = new TextDecoder("windows-1252", { fatal: false });
      const latinString = latinDecoder.decode(bytes);
      const latinChunks = latinString.match(/[\x20-\x7E\xA0-\xFF\n\r]{4,}/g);
      if (latinChunks) {
        text = latinChunks
          .map((chunk) => chunk.trim())
          .filter((chunk) => chunk.length > 3)
          .join("\n\n");
      }
    } catch (e) {}
  }

  const paragraphs = text
    .split(/\r?\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    return "<p>Document content parsed. No plain text stream found.</p>";
  }

  return paragraphs
    .map((p, idx) => {
      if (p.length < 80 && (idx === 0 || p === p.toUpperCase())) {
        return `<h2>${escapeHtml(p)}</h2>`;
      }
      return `<p>${escapeHtml(p)}</p>`;
    })
    .join("\n");
}

export async function convertDocxToPdf(
  file: File,
  onProgress?: (status: string) => void
): Promise<DocxConversionResult> {
  const fileNameLower = file.name.toLowerCase();
  onProgress?.("Reading document file...");
  const arrayBuffer = await file.arrayBuffer();

  let rawHtml = "";

  if (fileNameLower.endsWith(".docx")) {
    onProgress?.("Extracting document structure & styles with Mammoth...");
    try {
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
      rawHtml = mammothResult.value;
    } catch (e) {
      console.warn("Mammoth parse failed, falling back to text extraction:", e);
      rawHtml = extractTextFromBinaryDoc(arrayBuffer);
    }
  } else if (fileNameLower.endsWith(".doc")) {
    onProgress?.("Parsing Word (.doc) document stream...");
    try {
      const mammothResultDoc = await mammoth.convertToHtml({ arrayBuffer });
      if (mammothResultDoc.value && mammothResultDoc.value.trim().length > 20) {
        rawHtml = mammothResultDoc.value;
      } else {
        rawHtml = extractTextFromBinaryDoc(arrayBuffer);
      }
    } catch (e) {
      rawHtml = extractTextFromBinaryDoc(arrayBuffer);
    }
  } else if (fileNameLower.endsWith(".rtf")) {
    onProgress?.("Parsing Rich Text Format (RTF)...");
    const textDecoder = new TextDecoder("utf-8");
    const rtfText = textDecoder.decode(arrayBuffer);
    rawHtml = parseRtfToHtml(rtfText);
  } else if (fileNameLower.endsWith(".md") || fileNameLower.endsWith(".markdown")) {
    onProgress?.("Parsing Markdown document...");
    const textDecoder = new TextDecoder("utf-8");
    const mdText = textDecoder.decode(arrayBuffer);
    rawHtml = parseMarkdownToHtml(mdText);
  } else if (fileNameLower.endsWith(".html") || fileNameLower.endsWith(".htm")) {
    onProgress?.("Reading HTML document...");
    const textDecoder = new TextDecoder("utf-8");
    rawHtml = textDecoder.decode(arrayBuffer);
  } else {
    // Default text or document parser for any other document file (.txt, .odt, .csv, etc.)
    onProgress?.("Extracting document text...");
    try {
      const textDecoder = new TextDecoder("utf-8");
      const plainText = textDecoder.decode(arrayBuffer);
      const paragraphs = plainText.split(/\r?\n+/).map((p) => p.trim()).filter(Boolean);
      rawHtml = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n");
    } catch (e) {
      rawHtml = extractTextFromBinaryDoc(arrayBuffer);
    }
  }

  if (!rawHtml || rawHtml.trim().length === 0) {
    rawHtml = `<p>Document: ${escapeHtml(file.name)}</p><p>Converted to PDF on ${new Date().toLocaleDateString()}</p>`;
  }

  onProgress?.("Formatting pages for PDF generation...");

  // Create an offscreen, styled rendering container
  const container = document.createElement("div");
  container.className = "docx-pdf-content";
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "595px"; // A4 pt width
  container.style.backgroundColor = "#ffffff";
  container.style.padding = "40px";
  container.style.boxSizing = "border-box";
  container.style.fontFamily = "sans-serif";
  container.style.fontSize = "12pt";
  container.style.lineHeight = "1.5";
  container.style.color = "#000000";

  container.innerHTML = `
    <style>
      .docx-pdf-content h1 { font-size: 24pt; font-weight: bold; margin: 10pt 0; }
      .docx-pdf-content h2 { font-size: 18pt; font-weight: bold; margin: 8pt 0; }
      .docx-pdf-content p { margin: 6pt 0; }
      .docx-pdf-content img { max-width: 100%; }
    </style>
    ${rawHtml}
  `;

  document.body.appendChild(container);

  try {
    onProgress?.("Rendering PDF pages...");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    await pdf.html(container, {
      html2canvas: {
        scale: 2, // Increase scale for higher quality and better rendering
        useCORS: true,
        logging: false,
        allowTaint: true,
      },
      width: 595,
      windowWidth: 595,
      autoPaging: "text",
    });

    // Small delay to ensure all canvas operations are fully committed
    await new Promise((resolve) => setTimeout(resolve, 500));

    const pageCount = pdf.getNumberOfPages();
    const outputBlob = pdf.output("blob");
    const outputName = file.name.replace(/\.[a-zA-Z0-9]+$/i, "") + ".pdf";

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
