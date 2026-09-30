import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle, Check, X, FileText, Lock, Eye, Scale } from 'lucide-react';

interface TermsAndConditionsProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  showWarning?: boolean;
  disabled?: boolean;
}

export const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({
  checked,
  onChange,
  showWarning = false,
  disabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Escape key listener for modal
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  return (
    <div className="w-full font-sans">
      <div
        className={`p-4 bg-[#000000]/60 border rounded-2xl transition-all shadow-inner ${
          showWarning && !checked
            ? 'border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
            : checked
            ? 'border-emerald-500/50'
            : 'border-[#4C5055]/60'
        }`}
      >
        {/* Checkbox and Clickable Link */}
        <div className="flex items-start gap-3">
          <label className="relative flex items-center justify-center cursor-pointer mt-0.5 select-none shrink-0">
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                checked
                  ? 'bg-gradient-to-r from-[#47A5FF] to-[#2563eb] border-[#47A5FF] shadow-[0_0_10px_rgba(71,165,255,0.4)]'
                  : showWarning
                  ? 'bg-[#14171C] border-rose-500/90'
                  : 'bg-[#14171C] border-[#4C5055] hover:border-[#47A5FF]'
              }`}
            >
              {checked && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
            </div>
          </label>

          <div className="flex-1 text-xs text-[#A0A4A8] leading-relaxed">
            <span>I agree to the </span>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-[#47A5FF] hover:text-[#3b8fdc] font-semibold underline underline-offset-2 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span>Terms and Conditions</span>
            </button>
            <span className="text-[#7D8287]"> for identity processing and digital template generation.</span>
          </div>
        </div>

        {/* Validation Warning Alert (Only shown on submit attempt when unchecked) */}
        {showWarning && !checked && (
          <div className="mt-3 flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Please accept the Terms and Conditions to proceed.</span>
          </div>
        )}
      </div>

      {/* Dedicated Terms and Conditions Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[#0F1115] border border-[#2D3139] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2D3139] bg-[#14171D]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#47A5FF]">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Terms and Conditions</h3>
                  <p className="text-xs text-[#A0A4A8]">Identity verification and template generation policy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-[#C5C8CD] leading-relaxed select-text">
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Welcome to BIGsta</p>
                <p className="text-xs text-[#A0A4A8]">
                  BIGsta is a specialized document template creation and card design platform intended for professional design, record-keeping, and template development.
                </p>
                <p className="text-xs text-[#A0A4A8]">
                  By accessing or using BIGsta, you agree to comply with and be bound by the following Terms and Conditions.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[#47A5FF]" />
                  1. Independent Private Application
                </h4>
                <p className="text-[#A0A4A8] pl-5">
                  BIGsta is a privately developed application.<br />
                  BIGsta is <strong>NOT</strong>:<br />
                  • A government website<br />
                  • A government system<br />
                  • A government service<br />
                  • A government agency<br />
                  • A government database<br />
                  • A government verification platform<br />
                  • An official identification authority<br /><br />
                  BIGsta operates independently and has no affiliation, partnership, endorsement, authorization, or approval from any government institution. This includes but is not limited to: NIDA, RITA, Immigration Department, TRA, NHIF, HESLB, eCitizen, BRELA, Police Force, Local Government Authorities, or any government ministry, agency, or department.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#47A5FF]" />
                  2. Purpose of the Platform
                </h4>
                <p className="text-[#A0A4A8] pl-5">
                  BIGsta is designed for: Educational purposes, Template creation, Design demonstrations, UI/UX prototyping, Record keeping, Training environments, Software testing, Sample document generation, and Visual previews.<br /><br />
                  The platform is not intended to replace official government systems or legally recognized document issuance processes.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-[#47A5FF]" />
                  3. Generated Documents Are Not Official
                </h4>
                <p className="text-[#A0A4A8] pl-5">
                  Any document or visual output generated through BIGsta is a user-defined template and design preview.<br /><br />
                  Generated outputs must never be represented as genuine, official, government-issued, or legally valid documents unless independently issued and authorized by the appropriate lawful authority.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#47A5FF]" />
                  4. No Government Verification
                </h4>
                <p className="text-[#A0A4A8] pl-5">
                  BIGsta does not verify: Identity records, Citizenship records, National ID records, Birth records, Passport records, Tax records, Health records, Educational records, or Government databases.<br /><br />
                  All information displayed within generated documents originates solely from user input. BIGsta does not confirm the accuracy, existence, validity, or legality of any information entered by users.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <Scale className="w-3.5 h-3.5 text-[#47A5FF]" />
                  5. User Responsibility
                </h4>
                <p className="text-[#A0A4A8] pl-5">
                  Users are fully responsible for all information submitted into the platform. This includes: First names, Middle names, Last names, Photos, Signatures, Identification numbers, Dates of birth, Addresses, Uploaded files, Logos, or any other content.<br /><br />
                  Users acknowledge that all generated outputs are created based on information they provide.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wide flex items-center gap-2">
                  <X className="w-3.5 h-3.5 text-rose-400" />
                  6. Prohibited Activities
                </h4>
                <p className="text-[#A0A4A8] pl-5">
                  Users must not use BIGsta for: Fraud, Forgery, Identity theft, Impersonation, Deception, Misrepresentation, Criminal activity, Financial scams, Government impersonation, Unauthorized document production, Illegal transactions, Cybercrime, or any activity prohibited by law.<br /><br />
                  Any misuse of the platform is solely the responsibility of the user.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-[#47A5FF]" />
                  7. User Content Ownership
                </h4>
                <p className="text-[#A0A4A8] pl-5">
                  Users are responsible for ensuring they have the legal right to use and upload: Photographs, Signatures, Logos, Graphics, Images, Text content, and Brand materials.<br /><br />
                  BIGsta does not assume ownership of user-generated content.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <Scale className="w-3.5 h-3.5 text-[#47A5FF]" />
                  8. Artificial Intelligence and Automation
                </h4>
                <p className="text-[#A0A4A8] pl-5">
                  Some features within BIGsta may utilize automated processing, intelligent design tools, template engines, or artificial intelligence technologies. Generated results may contain user-provided content, template placeholders, sample information, or AI-assisted outputs.<br /><br />
                  Users must independently review all generated content before use.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[#47A5FF]" />
                  9. No Legal Validity
                </h4>
                <p className="text-[#A0A4A8] pl-5">
                  Documents generated through BIGsta carry no automatic legal recognition. BIGsta does not grant: Legal identity, Citizenship status, Government approval, Official certification, or Legal authentication. Only authorized institutions may issue legally recognized documents.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#47A5FF]" />
                  10. Privacy and Information Processing
                </h4>
                <p className="text-[#A0A4A8] pl-5">
                  BIGsta may temporarily process information submitted by users for the purpose of generating previews, templates, and documents. Users should avoid entering information they are unwilling to process through the application. Users remain responsible for protecting their own information and devices.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-[#A0A4A8] uppercase tracking-wide flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-[#A0A4A8]" />
                  11. Limitation of Liability
                </h4>
                <p className="text-[#A0A4A8] pl-5">
                  To the maximum extent permitted by law, BIGsta, its developers, owners, contributors, employees, and service providers shall not be liable for: Data loss, Financial loss, Business interruption, Damages, Claims, Penalties, Legal disputes, User misuse, or Third-party actions. Use of the platform is entirely at the user's own risk.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#47A5FF]" />
                  12. Availability of Services
                </h4>
                <p className="text-[#A0A4A8] pl-5">
                  BIGsta may modify, update, improve, suspend, or discontinue any feature at any time without prior notice. This includes: Templates, Design tools, Export systems, Storage systems, User interfaces, Services, and Platform functionality. Continued use of BIGsta after updates constitutes acceptance of those changes.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  13. Acceptance of Terms
                </h4>
                <p className="text-[#A0A4A8] pl-5">
                  By using BIGsta, you confirm that: You have read these Terms and Conditions; You understand the limitations of the platform; You understand that generated documents are not official documents; You agree not to use generated content unlawfully; You accept responsibility for your use of the platform; and You agree to comply with applicable laws within your jurisdiction.
                </p>
              </section>

              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 mt-4 text-xs">
                <p className="font-extrabold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  IMPORTANT NOTICE
                </p>
                <div className="space-y-1.5 text-[#C5C8CD] pl-1">
                  <p>⚠️ BIGsta is not an official government application, government portal, government database, or government verification service.</p>
                  <p>⚠️ BIGsta does not connect to, access, or verify records from NIDA, RITA, Immigration, TRA, NHIF, HESLB, or any government institution.</p>
                  <p>⚠️ All documents generated within BIGsta are user-defined templates and design previews.</p>
                  <p>⚠️ Generated outputs should not be used for identity verification, legal transactions, government submissions, immigration processes, banking services, financial services, employment verification, or any activity requiring genuine official documents.</p>
                  <p>⚠️ Users are solely responsible for any information entered into the platform and for how generated outputs are used.</p>
                  <p>⚠️ Misuse of generated documents may violate local laws and regulations and may result in civil or criminal consequences.</p>
                  <p>⚠️ By continuing to use BIGsta, you acknowledge and accept all terms, conditions, responsibilities, limitations, and notices described above.</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#2D3139] bg-[#14171D] shrink-0">
              <p className="text-xs text-[#7D8287]">
                Last Updated: January 01, 2026
              </p>
              <div className="flex items-center gap-2">
                {!checked && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(true);
                      setIsModalOpen(false);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Accept & Continue
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
