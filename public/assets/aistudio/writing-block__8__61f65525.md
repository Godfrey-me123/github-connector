BIGsta — DOC/DOCX TO PDF REPAIR PROMPTS
Cross-Environment Repair: Google AI Studio, Vercel, Android APK/WebView

GLOBAL RULE FOR ALL EIGHT PROMPTS

Inspect and modify the existing BIGsta repository. Preserve all unrelated features, screens, routes, styling, authentication, user permissions and business logic. Do not create a separate demo or replace working code unnecessarily. Implement real fixes, run available tests and report actual results. Do not claim an environment passed unless it was tested.

PROMPT 1 — AUDIT THE EXISTING CODE

Inspect the existing DOC/DOCX-to-PDF workflow, including file selection, parsing, HTML preview, PDF generation, PDF/Print navigation, storage, recent files and downloads.

Find the exact root causes of:
- Production parsing errors that do not occur in Google AI Studio preview.
- The unsupported CSS color error: "Attempting to parse an unsupported color 'oklch'".
- PDFs with the correct number of pages but missing all or most document content.
- Screen controls becoming unresponsive after a conversion error.

Inspect package.json, the lockfile, Vite configuration, parser imports, rendering dependencies, WebView compatibility and existing persistence utilities. Trace an actual document through every conversion stage.

Before editing, report the affected files and root causes. Then proceed with the repair without changing unrelated functionality.

PROMPT 2 — REPAIR DOC/DOCX PARSING

Fix document validation and parsing using the actual libraries and versions installed in BIGsta.

For DOCX files:
- Read the document as the binary format required by the parser.
- Generate valid HTML using a supported DOCX parser API.
- Preserve paragraphs, headings, lists, tables, links, inline formatting, Unicode and supported embedded images.
- Sanitize generated HTML without removing legitimate document content.
- Detect corrupt, empty, malformed and unsupported files.

If Mammoth.js is used, do not treat it as a general legacy .doc converter. Support .doc only if a genuine converter exists.

If parsing returns empty content, stop conversion and show a useful error. Never produce a blank PDF and report success.

Verify dependency imports and bundler compatibility for both development and production.

PROMPT 3 — FIX BLANK PDF OUTPUT

Trace the actual content from parsed HTML through the preview DOM and PDF rendering pipeline.

Verify that:
- The parsed document contains real content.
- The correct DOM element is rendered.
- The element is attached to the DOM and has non-zero dimensions.
- Framework rendering has completed before capture.
- Fonts and supported images are loaded before rendering.
- Page breaks and pagination do not discard or hide content.
- Canvas dimensions and PDF rendering inputs are valid.
- All asynchronous operations are awaited and errors are handled.

If html2canvas, jsPDF or another rendering library is used, investigate its actual limitations and fix the identified cause.

After generation, validate the PDF signature, file size, page count and visible content. Where practical, use PDF.js or another appropriate method to verify extracted text.

Do not declare success based on page count alone. Do not replace the source document with a placeholder or silently discard tables, images or paragraphs.

PROMPT 4 — FIX THE OKLCH PARSE ERROR

Identify the exact library or code that cannot parse oklch() CSS colors.

Implement a reliable, scoped compatibility solution:
- Normalize unsupported computed colors in the PDF-rendering subtree.
- Use supported RGB, RGBA, hexadecimal or compatible HSL values.
- Handle relevant text, background, border and other styles consumed by the renderer.
- Preserve transparency and supported styling.
- Keep the fix limited to PDF conversion rather than redesigning BIGsta globally.
- Report conversion errors without crashing the entire screen.

Do not merely suppress the error or remove all styles. Test the production rendering path with the relevant CSS values.

PROMPT 5 — RESTORE SCREEN FUNCTIONALITY AFTER ERRORS

Ensure the application remains usable when parsing, rendering, PDF generation, storage or download fails.

Back, Open Recent Files, file selection, Retry, Convert, Preview and navigation must remain functional.

Implement proper try/catch/finally handling. Restore loading states, re-enable controls, clean up temporary resources safely and prevent stale conversion jobs from overwriting a newly selected document.

Provide clear errors for invalid files, empty parsed content, unsupported styles, image failures, rendering timeouts and invalid PDF output.

A failure must never leave the user with an infinite spinner, frozen screen or forced application restart. Retrying must work without requiring unnecessary reloads.

PROMPT 6 — REPAIR VERCEL AND ANDROID COMPATIBILITY

Verify the real production build and target runtime.

Vercel:
- Check dependencies, production imports, case-sensitive paths, asset URLs, routing and build configuration.
- Confirm parser libraries, fonts and any required workers/assets are bundled correctly.
- Run the actual production build and fix relevant failures.
- Verify deployed conversion rather than relying on the AI Studio preview.

Android APK/WebView:
- Check supported browser APIs and CSS features.
- Ensure file selection, Blob handling, PDF preview and export use compatible mechanisms.
- Integrate with existing native bridges and permissions where applicable.
- Handle memory limits, canvas restrictions and rendering timeouts.
- Keep the application usable after a WebView conversion failure.

Verify responsive behavior on phones, tablets and desktop computers. Do not claim success for environments that were not tested.

PROMPT 7 — INTEGRATE PDF/PRINT AND RECENT FILES

Integrate the repaired conversion process with BIGsta's existing PDF/Print workflow.

Use the same verified PDF artifact for preview, printing, download and recent files.

Preserve existing storage architecture and reuse src/bigsta/utils/idb.ts if it exists and is appropriate.

Store actual PDF bytes or a Blob where required, not only a temporary object URL. Manage object URL lifetimes safely.

Do not add a failed or blank conversion to recent files as a successful document. Do not overwrite an existing valid file with failed output.

Preserve existing user and administrator permissions, navigation, styling and unrelated features.

PROMPT 8 — RUN TESTS AND VERIFY THE COMPLETE REPAIR

Test actual documents containing:
- Multiple pages of text and headings.
- Tables, lists, links and inline formatting.
- Embedded images.
- Unicode and non-English text.
- Long content requiring pagination.

Also test empty files, corrupt files, unsupported legacy DOC files where applicable, oklch-related rendering failures, image failures, invalid PDF output and download failures.

After every simulated failure, verify Back, Open Recent Files, file selection, Retry and navigation remain functional.

Verify that the resulting PDF:
- Contains the source document's visible content.
- Has the expected page count.
- Opens in BIGsta's PDF viewer.
- Is not blank or zero bytes.
- Can be downloaded and opened in an independent PDF reader where available.

Test Google AI Studio, Vercel production, Android APK/WebView, mobile, tablet and desktop. Record actual pass/fail results and identify environments that could not be tested.

FINAL REPORT REQUIRED

Provide the exact root causes, files changed, dependency changes, build commands, test results, remaining limitations and confirmation that unrelated BIGsta features were preserved.

Do not stop when the error message disappears. The repair is complete only when real document content survives conversion and all tested environments remain usable.

TECHNICAL REFERENCES

Mammoth.js:
https://github.com/mwilliamson/mammoth.js
https://github.com/mwilliamson/mammoth.js#api

jsPDF:
https://github.com/parallax/jsPDF
https://artskydj.github.io/jsPDF/docs/

html2canvas:
https://html2canvas.hertzen.com/documentation.html
https://html2canvas.hertzen.com/faq.html

PDF.js:
https://mozilla.github.io/pdf.js/
https://github.com/mozilla/pdf.js

Browser APIs:
https://developer.mozilla.org/en-US/docs/Web/API/Blob
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
https://developer.mozilla.org/en-US/docs/Web/API/Document/fonts
https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob

Deployment and compatibility:
https://vercel.com/docs/frameworks/frontend/vite
https://developer.android.com/develop/ui/views/layout/webapps/webview
https://www.w3.org/TR/css-color-4/
