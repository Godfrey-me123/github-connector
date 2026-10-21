# BIGsta — Combined Technical Improvement Prompt
## DOCX to PDF, PDF Library & Thumbnails, Downloads Center, and Integration Testing

### Instructions to the AI Developer

Work on the existing BIGsta application. Inspect the actual source code and current implementation before changing anything. Implement the improvements in this prompt using the existing architecture, components, routes, storage, and design patterns wherever possible.

**STRICT SCOPE:** Only modify the DOCX-to-PDF workflow, PDF Library and PDF viewing experience, Downloads Center, their necessary shared storage logic, and integration required to make these features work together.

**Do not redesign, remove, rename, or break unrelated screens, services, navigation, authentication, templates, branding, or existing functionality.** Preserve all unrelated app logic and appearance.

All four work areas below belong to one coordinated implementation. Shared functionality must use the existing code and data structures rather than introducing competing systems.

The application must work responsively across:
- Android phones and tablets.
- iPhones and iPads.
- Windows computers and laptops.
- macOS computers.
- Linux computers.
- Supported browsers and installed PWAs on other compatible devices.

Do not assume that every device has the same filesystem permissions or storage capabilities. Adapt file selection, layout, saving, printing, sharing, and navigation to the capabilities of the current browser and operating system.

---

# PROMPT 1 — Fix DOCX-to-PDF Upload and Conversion

### Primary files to inspect

- `src/bigsta/components/DocxToPdfScreen.tsx`
- `src/bigsta/components/pdf/DocxToPdfModal.tsx`
- `src/bigsta/utils/docxToPdf.ts`
- `src/bigsta/utils/idb.ts`
- `package.json`

Inspect related components and utilities only when needed to connect the workflow correctly.

### 1.1 Accept DOCX files only

The DOCX-to-PDF workflow must accept genuine `.docx` documents only.

- Set the file picker to accept `.docx` and the appropriate DOCX MIME type.
- Reject `.doc`, `.txt`, `.rtf`, `.odt`, `.html`, `.md`, PDF, images, executables, and unrelated formats in this workflow.
- Disable unrelated file types in the picker wherever the platform supports filtering.
- Validate the extension, MIME type where available, and actual file contents. Do not trust the filename alone.
- Display a clear validation message for an invalid, corrupt, empty, or unsupported file.
- Do not silently reinterpret legacy `.doc` files as DOCX.
- Do not produce a PDF containing placeholder text when parsing fails.

Use the same validation rules in both the full screen and modal so the two entry points behave consistently.

### 1.2 Repair the actual conversion process

Inspect why DOCX parsing or conversion currently fails or appears to do nothing.

Implement and verify the complete workflow:

1. User selects a valid DOCX document.
2. The selected filename and file information appear.
3. The application validates and reads the document.
4. Mammoth.js converts the DOCX content into HTML.
5. The HTML is safely prepared for rendering and PDF generation.
6. jsPDF and its compatible rendering dependencies generate a genuine PDF.
7. The application validates that a nonempty PDF Blob has been produced.
8. The generated PDF appears in the application's result or preview area.
9. The user can open, print where supported, share where supported, or download the actual generated PDF.
10. The successful output is saved in the existing BIGsta download storage system.

Review the current use of `pdf.html()` and its rendering dependencies. If `html2canvas` or another renderer is required, ensure the dependency is installed directly, version-compatible, imported correctly, and works in the actual build environment. Do not assume a transitive dependency will always be available.

Preserve reasonable document formatting, including paragraphs, headings, tables, lists, images where supported, and page breaks where practical. Handle long documents, margins, page sizes, and content overflowing page boundaries.

If conversion fails, display the actual error in user-friendly language and allow the user to retry. Do not display a success message unless a valid PDF was generated and the requested operation actually succeeded.

### 1.3 Make the interface professional and device-independent

- Match the existing clean visual language of the PDF & Print section.
- Remove unnecessary AI-themed Sparkles icons and other decorative elements that make the service look inconsistent.
- Use conventional document, upload, conversion, preview, print, and download icons.
- Replace computer-specific wording such as “Browse Computer” with device-neutral language such as “Choose DOCX file” or “Select document.”
- Use the platform's native file picker so mobile devices can select documents from their supported document providers and computers can select files through their standard file dialog.
- Use responsive layouts, accessible buttons, appropriate touch targets, readable text, and visible progress/error states.
- Prevent duplicate conversion requests while conversion is in progress.

Do not claim that every operating system exposes identical file sources. Use the available file picker capabilities and explain unsupported operations clearly.

### 1.4 Preserve and reuse storage

Inspect the existing `idb.ts` implementation and reuse its current IndexedDB database and `downloads` object store.

Save the real generated PDF Blob or equivalent binary data, its filename, MIME type, file size, creation/modification timestamps as applicable, page count when available, and user ownership information where the application supports authenticated accounts.

Do not create a competing download database, save only a fake URL, or store large binary files in `localStorage`.

### 1.5 Acceptance tests

- A valid DOCX document converts to a genuine PDF.
- Invalid file types are rejected.
- Corrupt documents produce an understandable error, not a fake PDF.
- The conversion button performs real work.
- Progress, failure, and success states are accurate.
- The resulting PDF opens and downloads correctly.
- The saved PDF appears in Downloads and, where appropriate, the PDF Library.
- The workflow works on mobile, tablet, and desktop layouts.

---

# PROMPT 2 — PDF Library, Real PDF Thumbnails, and PDF Viewing

### Primary files to inspect

- `src/bigsta/components/PdfLibraryScreen.tsx`
- `src/bigsta/components/PDFViewerScreen.tsx`
- `src/bigsta/components/pdf/ContinuousPdfViewer.tsx`
- `src/bigsta/components/pdf/PdfGridView.tsx`
- `src/bigsta/components/DownloadsScreen.tsx`
- `src/bigsta/utils/idb.ts`

Reuse the existing PDF.js implementation, viewer routes, and PDF & Print functionality wherever possible.

### 2.1 Show actual PDF previews before opening

The PDF Library must clearly identify each item as a PDF before the user opens it.

- Generate a thumbnail from the actual first page of the PDF using PDF.js.
- Render the page as a thumbnail image or canvas preview.
- Keep the PDF filename visible and readable.
- Identify the item as a PDF using a conventional PDF label or document indicator.
- Do not use a generic file icon as the only visual representation when a real preview can be generated.
- Never display a thumbnail from a different document.
- If the PDF is corrupt, encrypted, unavailable, or unsupported, show a clear PDF-specific fallback thumbnail and explain the problem when relevant.
- Do not create a fake preview that looks like the document's real contents.

Generate thumbnails efficiently, release unnecessary canvas resources, and avoid rendering every page of every document at full resolution. Handle large libraries without freezing the interface.

### 2.2 Display useful PDF metadata

Each PDF entry should show available information such as:

- Filename.
- File size, formatted in KB or MB.
- Last modified or imported date, when available.
- Page count, after successful PDF inspection.
- PDF availability or processing status when relevant.

If metadata is unavailable, show a neutral indication rather than inventing values.

Use a consistent, clean card or list design matching the existing PDF & Print section. On phones, use a readable compact layout; on larger screens, take advantage of available space without making the interface unnecessarily oversized.

### 2.3 Connect PDF Library items to the existing viewer

When a user taps or clicks a PDF:

1. Open the actual selected document in the existing PDF viewer.
2. Preserve the selected document's identity and stored content.
3. Allow navigation back to the library without losing the user's place.
4. Connect to the existing PDF & Print actions where supported.
5. Provide the existing page viewing modes, including continuous and grid views where already implemented.
6. Keep print, download, zoom, page navigation, and other existing viewer actions working.
7. Show a useful error if the file cannot be opened.

Do not create a second independent PDF reader when the current PDF.js viewer can be reused.

### 2.4 PDF Library and Downloads integration

Use the existing IndexedDB `downloads` store as the shared source of stored files wherever its current schema permits.

Avoid unnecessary duplicate records when a PDF appears in both the Downloads Center and PDF Library. A single underlying file can appear in multiple views while retaining a consistent identifier, Blob, filename, and ownership information.

If the current schema requires an extension, make a backward-compatible change and handle older records safely.

Do not claim the application can automatically scan every hidden folder, messaging application, Bluetooth transfer location, or external device. Browser access to these sources depends on the operating system and permissions. Provide a clear import workflow for files that the user explicitly selects or makes accessible.

### 2.5 Acceptance tests

- Actual PDF pages appear in thumbnails.
- Thumbnails match their corresponding files.
- Filename, file size, date, and page count are accurate when available.
- Selecting a PDF opens the correct document.
- Back navigation works.
- Continuous/grid viewing and existing PDF & Print actions continue to work.
- The layout adapts to mobile, tablet, laptop, and desktop screens.
- Large files and corrupt PDFs are handled without crashing the app.

---

# PROMPT 3 — Downloads Center, Local Storage, User and Admin Controls

### Primary files to inspect

- `src/bigsta/components/DownloadsScreen.tsx`
- `src/bigsta/utils/idb.ts`
- `src/bigsta/store/useTemplateStore.ts`
- `src/bigsta/components/PdfLibraryScreen.tsx`
- `src/bigsta/components/PDFViewerScreen.tsx`
- `src/bigsta/App.tsx`

Inspect the existing authentication, role, permissions, download-record, and file-generation logic before modifying behavior.

### 3.1 Make Downloads usable by both users and administrators

The current Downloads Center must not remain blocked for ordinary users by an “in progress” or development placeholder message.

Implement the real Downloads Center for both supported roles.

**Regular user capabilities:**
- View their own available downloads.
- Open or preview supported files.
- Download the actual stored file.
- Print supported documents where available.
- Rename or remove their own items when permitted by existing application rules.
- Retry a failed operation only when a genuine retry or regeneration function exists.
- See file type, filename, size, and date when available.
- Understand why a file is unavailable or a download failed.

**Administrator capabilities:**
- Use the normal user-facing download functions.
- Access additional file-management controls consistent with the existing authorization model.
- Manage other users' records only where the application's existing admin policy explicitly authorizes it.
- Review available metadata and failed operations where supported.
- Avoid exposing sensitive file contents or account data to unauthorized roles.

Do not rely on hiding a button as the only security measure. Enforce ownership and authorization in the actual operation or data-access layer.

Preserve existing authentication and role semantics. Do not introduce a new role system unnecessarily.

### 3.2 Store actual files reliably

Reuse the existing IndexedDB database and `downloads` object store in `idb.ts`.

Where applicable, preserve or populate:

- Unique record identifier.
- Filename.
- MIME type.
- Actual Blob or binary file data.
- File size.
- Page count for PDFs.
- Creation/import date and last modified date where known.
- User ownership identifier.
- Status and source metadata where supported.

The Downloads Center must not treat a page URL as if it were the actual document.

For generated files, save the real output Blob. For imported files, store the actual selected file content when the user requests that it be saved.

Do not use `localStorage` for large binary files. Use it only for small preferences or metadata if appropriate. IndexedDB is the primary local binary-storage mechanism.

Handle database errors, quota failures, interrupted writes, unavailable Blob data, and older records gracefully.

### 3.3 Repair download, share, and retry actions

Inspect and fix the existing handlers.

**Download**
- Retrieve the actual file Blob.
- Generate a valid download operation and filename.
- Never use `href="#"` as a substitute for a file.
- Revoke temporary object URLs when no longer needed.
- Report success only when the operation has actually been initiated successfully.

**Share**
- Share the actual file using the Web Share API with file support where available.
- If file sharing is unsupported, offer a valid alternative such as downloading the file or copying a legitimate share link if the application has a real sharing backend.
- Do not copy the BIGsta homepage URL and claim that the file was shared.
- Handle user cancellation without falsely reporting a failure.

**Retry**
- Retry the real failed operation when possible.
- Regenerate a file only if the required source and a genuine regeneration function are available.
- If regeneration is impossible because the original input is missing, explain that limitation and let the user choose a valid alternative.
- Do not simulate regeneration with a timeout or fabricate a successful result.

**Delete**
- Confirm destructive actions where appropriate.
- Remove the correct record and its associated locally stored binary data when the user confirms.
- Keep the PDF Library and Downloads Center synchronized.
- Do not delete another user's files unless an authorized administrative action explicitly permits it.

### 3.4 Make downloads available across device sizes

Use a responsive interface with conventional icons and a clear hierarchy.

- Replace unnecessary AI-themed icons with standard download, document, preview, print, share, retry, and delete icons.
- Remove development placeholders and unnecessary technical wording from the user interface.
- Use touch-friendly controls on phones and tablets.
- Use sensible list or grid layouts on larger screens.
- Make filenames and statuses readable without horizontal overflow.
- Provide loading, empty, error, and success states.
- Ensure keyboard accessibility and visible focus on computers.

Do not promise that a file saved in a browser on one device automatically appears on another device. Local IndexedDB data is ordinarily device/browser-specific. Cross-device synchronization requires a real backend or cloud-storage service and appropriate authentication.

### 3.5 Be accurate about browser storage

Use IndexedDB for local file storage and the Storage API where appropriate.

- Request persistent storage only when appropriate and supported.
- Handle browser quotas and possible eviction.
- Explain that clearing browser data can remove locally stored files.
- Never claim that files are guaranteed to remain forever.
- Never claim access to the computer's or phone's entire filesystem.
- Do not attempt to silently read private folders or files from other applications.

Support explicit file imports using the native file picker or another supported user-authorized browser capability.

### 3.6 Acceptance tests

- Regular users can access the Downloads Center.
- Users can access only the files authorized for them.
- Admin controls follow the existing authorization rules.
- A saved file can be opened and downloaded as the actual file.
- Share, retry, and delete operations behave honestly.
- PDFs remain connected to the PDF Library.
- Storage failures produce understandable messages.
- The UI works on all supported device sizes.

---

# PROMPT 4 — Integration, Regression Testing, and Final Verification

### Primary integration files to inspect

- `src/bigsta/App.tsx`
- `src/bigsta/utils/idb.ts`
- `src/bigsta/components/DocxToPdfScreen.tsx`
- `src/bigsta/components/pdf/DocxToPdfModal.tsx`
- `src/bigsta/utils/docxToPdf.ts`
- `src/bigsta/components/PdfLibraryScreen.tsx`
- `src/bigsta/components/PDFViewerScreen.tsx`
- `src/bigsta/components/pdf/ContinuousPdfViewer.tsx`
- `src/bigsta/components/pdf/PdfGridView.tsx`
- `src/bigsta/components/DownloadsScreen.tsx`
- `src/bigsta/store/useTemplateStore.ts`
- `package.json`

### 4.1 Establish one consistent file lifecycle

Verify the complete lifecycle:

1. A user selects a DOCX file using the supported device file picker.
2. The DOCX is validated and converted to a real PDF.
3. The PDF is saved in the existing IndexedDB download store.
4. The saved record includes accurate metadata and actual binary content.
5. The file appears in Downloads for the authorized user.
6. The PDF appears in the PDF Library where applicable.
7. The PDF Library creates a thumbnail from the correct first page.
8. Opening the PDF launches the existing PDF viewer.
9. The user can navigate, preview, download, and print where supported.
10. Deletion, updates, and metadata changes are reflected consistently across the relevant screens.

Use stable record IDs and existing application abstractions. Avoid storing separate conflicting copies of the same file without a clear reason.

### 4.2 Check navigation and prevent dead ends

- Verify the existing `downloads`, `pdf_viewer`, `pdf_library`, and `docx_to_pdf` routes.
- Ensure every new or modified workflow has a functional way to go back or return to the appropriate screen.
- Preserve navigation state where reasonable.
- Handle missing record IDs and unavailable files gracefully.
- Do not route users to blank screens or dead-end placeholders.
- Do not break browser back navigation or mobile navigation.
- Ensure modals can be closed and return users to the correct context.

### 4.3 Verify responsive and cross-device behavior

Test the UI at narrow, medium, and wide viewport sizes.

Verify:
- Native file selection and supported file types.
- DOCX conversion and error reporting.
- PDF thumbnail generation.
- PDF viewing, scrolling, zooming, and page navigation.
- Download and print behavior where supported.
- Sharing with capability-aware fallbacks.
- Touch targets, keyboard navigation, and readable content.
- No horizontal overflow or controls hidden outside the viewport.

Do not assume identical support for file sharing, printing, filesystem access, or persistence on all browsers. Detect unsupported capabilities and provide reasonable alternatives.

### 4.4 Build and regression tests

- Review TypeScript errors and existing lint rules.
- Check imports, dependency declarations, and PDF.js worker configuration.
- Confirm the selected DOCX-to-PDF renderer works in the actual project build.
- Verify IndexedDB upgrades remain backward-compatible.
- Test empty, invalid, corrupt, large, and valid files.
- Test regular-user and administrator access.
- Test download records with and without stored Blob data.
- Test failed writes, unavailable files, and storage quota errors.
- Run the project's existing tests and production build commands.
- Fix errors introduced by this implementation.
- Do not modify unrelated dependencies or configuration unless a specific compatibility issue requires it.

### 4.5 Required final report

After implementation, report:

1. The exact files changed.
2. What was fixed in each work area.
3. How DOCX parsing and PDF generation were verified.
4. How thumbnails and PDF viewing were verified.
5. How IndexedDB and Downloads integration were verified.
6. Which user and admin permissions were tested.
7. Which mobile and desktop layouts were tested.
8. The actual test and build results.
9. Any remaining limitations, with a clear distinction between verified behavior and untested assumptions.

Do not claim tests passed if they were not run. Do not mark a feature complete when it only has a visual interface without functioning logic.

---

# Technical Reference Links

Use these official or primary project references while implementing and verifying the work. Consult the relevant documentation rather than guessing API behavior.

1. **Mammoth.js — DOCX to HTML conversion**  
   https://github.com/mwilliamson/mammoth.js

2. **jsPDF — PDF generation**  
   https://github.com/parallax/jsPDF

3. **PDF.js — PDF rendering and page thumbnails**  
   https://mozilla.github.io/pdf.js/

4. **MDN — IndexedDB storage**  
   https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

5. **MDN — Browser storage limits and persistence**  
   https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

---

# Final Non-Negotiable Requirements

- Preserve all unrelated BIGsta features and existing design.
- Fix actual functionality, not merely the appearance.
- Use the existing PDF.js viewer and IndexedDB storage wherever possible.
- Keep DOCX-to-PDF restricted to genuine DOCX inputs.
- Display real PDF page thumbnails before opening files.
- Make Downloads work for authorized regular users and administrators.
- Keep the interface clean and consistent with PDF & Print.
- Support mobile phones, tablets, laptops, and desktop computers with responsive layouts.
- Use device-neutral wording and capability-aware controls.
- Do not fabricate files, previews, downloads, conversions, sharing, or success messages.
- Do not promise unrestricted filesystem access, guaranteed permanent browser storage, or automatic cross-device synchronization without the required capabilities.
- Keep navigation functional and eliminate dead ends.
- Verify the implementation using the actual codebase and report truthful test results.

Implement the four work areas as one integrated improvement while keeping the scope strictly limited to these requested features and their necessary dependencies.
