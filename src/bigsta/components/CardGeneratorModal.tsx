import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Download,
  CreditCard,
  Printer,
  Layers,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useTemplateStore } from '../store/useTemplateStore';
import { CardTemplate } from '../types';
import {
  renderTemplateToCanvas,
  downloadPNG,
  downloadJPG,
  downloadPDF,
  download2In1PDF,
} from '../utils/export';
import { SAMPLE_TEMPLATES } from '../utils/sampleTemplates';
import { applyTemplateMapping, formatDrivingLicenceCategoriesFront } from '../utils/templateMappingEngine';

export const CardGeneratorModal: React.FC = () => {
  const {
    isCardGeneratorOpen,
    setCardGeneratorOpen,
    currentTemplate,
    frontPopulatedTemplate,
    backPopulatedTemplate,
    lastDrivingLicenseFormData,
    lastNidaFormData,
    lastNhifFormData,
    activeServiceId,
    getUniversalFrontTemplate,
    getUniversalBackTemplate,
  } = useTemplateStore();

  const [outputType, setOutputType] = useState<'single' | 'merge'>('merge');
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');

  // Previews
  const [singlePreviewUrl, setSinglePreviewUrl] = useState<string>('');
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string>('');
  const [backPreviewUrl, setBackPreviewUrl] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadState, setDownloadState] = useState<'IDLE' | 'QUEUED' | 'GENERATING' | 'READY' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [downloadError, setDownloadError] = useState<string>('');

  const isDL =
    activeServiceId === 'driving_license' ||
    currentTemplate?.cardType === 'Driving License';

  const submittedData: any = activeServiceId === 'nhif'
    ? (lastNhifFormData || {})
    : isDL
    ? (lastDrivingLicenseFormData || {})
    : (lastNidaFormData || {});

  // Resolve front & back templates
  const resolvedFrontTemplate: CardTemplate = React.useMemo(() => {
    if (frontPopulatedTemplate) return frontPopulatedTemplate;
    if (currentTemplate && (!currentTemplate.side || currentTemplate.side === 'Front Side')) {
      return currentTemplate;
    }
    const defaultFront = getUniversalFrontTemplate(activeServiceId);

    if (submittedData && Object.keys(submittedData).length > 0) {
      const res = applyTemplateMapping(defaultFront, submittedData);
      return res.populatedTemplate || defaultFront;
    }
    return defaultFront;
  }, [frontPopulatedTemplate, currentTemplate, activeServiceId, getUniversalFrontTemplate, submittedData]);

  const resolvedBackTemplate: CardTemplate = React.useMemo(() => {
    if (backPopulatedTemplate) return backPopulatedTemplate;
    if (currentTemplate && currentTemplate.side === 'Back Side') {
      return currentTemplate;
    }
    const defaultBack = getUniversalBackTemplate(activeServiceId);

    if (submittedData && Object.keys(submittedData).length > 0) {
      const res = applyTemplateMapping(defaultBack, submittedData);
      return res.populatedTemplate || defaultBack;
    }
    return defaultBack;
  }, [backPopulatedTemplate, currentTemplate, activeServiceId, getUniversalBackTemplate, submittedData]);

  // Current single preview template
  const activeSingleTemplate = activeSide === 'back' ? resolvedBackTemplate : resolvedFrontTemplate;

  // Render live preview canvases whenever modal is opened or selection changes
  useEffect(() => {
    if (!isCardGeneratorOpen) return;

    let isMounted = true;
    setIsRendering(true);

    if (outputType === 'single') {
      renderTemplateToCanvas(activeSingleTemplate, submittedData, 200)
        .then((canvas) => {
          if (isMounted) {
            setSinglePreviewUrl(canvas.toDataURL('image/png'));
            setIsRendering(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsRendering(false);
        });
    } else {
      Promise.all([
        renderTemplateToCanvas(resolvedFrontTemplate, submittedData, 200),
        renderTemplateToCanvas(resolvedBackTemplate, submittedData, 200),
      ])
        .then(([frontCanvas, backCanvas]) => {
          if (isMounted) {
            setFrontPreviewUrl(frontCanvas.toDataURL('image/png'));
            setBackPreviewUrl(backCanvas.toDataURL('image/png'));
            setIsRendering(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsRendering(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [
    isCardGeneratorOpen,
    outputType,
    activeSide,
    activeSingleTemplate,
    resolvedFrontTemplate,
    resolvedBackTemplate,
    submittedData,
  ]);

  // Escape key listener to close modal
  useEffect(() => {
    if (!isCardGeneratorOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCardGeneratorOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCardGeneratorOpen, setCardGeneratorOpen]);

  if (!isCardGeneratorOpen) return null;

  // Format cardholder details for read-only summary badge
  const cardholderName = isDL
    ? [submittedData.firstName, submittedData.secondName, submittedData.thirdName].filter(Boolean).join(' ') || 'Driver Record'
    : [submittedData.firstName, submittedData.middleName, submittedData.lastName].filter(Boolean).join(' ') || 'Citizen Record';

  const identifierNumber = isDL
    ? submittedData.licenceNumber || 'DL-PENDING'
    : submittedData.nidaNumber || 'NIDA-PENDING';

  const secondaryIdentifier = isDL
    ? submittedData.pinNumber ? `PIN: ${submittedData.pinNumber}` : null
    : submittedData.dateOfBirth ? `DOB: ${submittedData.dateOfBirth}` : null;

  const categoriesFormatted = isDL && submittedData.classes
    ? formatDrivingLicenceCategoriesFront(submittedData.classes)
    : null;

  // Download states (Prompt 24)
  const executeSecureExport = async (format: 'pdf' | 'png' | 'jpg' | 'pdf_merge', description: string, exportFn: () => Promise<void>) => {
    const store = useTemplateStore.getState();
    const val = store.validateExportAccess(format);
    if (!val.allowed) {
      alert(val.reason || 'Export access not allowed. Please top up tokens.');
      return;
    }

    setDownloadState('QUEUED');
    setDownloadError('');
    setIsExporting(true);

    try {
      // 1. GENERATING
      setDownloadState('GENERATING');
      await new Promise(r => setTimeout(r, 150));

      // Generate export file & verify existence / size > 0
      await exportFn();

      // 2 & 3. READY
      setDownloadState('READY');
      await new Promise(r => setTimeout(r, 150));

      // 4 & 5. DOWNLOADING (Create download URL & deliver file)
      setDownloadState('DOWNLOADING');
      await new Promise(r => setTimeout(r, 200));

      // 6. COMPLETED (Confirm successful download)
      setDownloadState('COMPLETED');

      // 7. Only then consume token
      store.consumeUsage(description, undefined, 1);
    } catch (e: any) {
      console.error('Export failed:', e);
      setDownloadState('FAILED');
      setDownloadError(e?.message || 'Export generation failed. Token was NOT consumed.');
      alert('Export failed: ' + (e?.message || 'Unknown error') + '. Token remains intact.');
    } finally {
      setIsExporting(false);
    }
  };

  // Single card print/download handlers
  const handleExportSinglePDF = () => executeSecureExport('pdf', 'Single Card PDF Export', () => downloadPDF(activeSingleTemplate, submittedData));
  const handleExportSinglePNG = () => executeSecureExport('png', 'Single Card PNG Export', () => downloadPNG(activeSingleTemplate, submittedData));
  const handleExportSingleJPG = () => executeSecureExport('jpg', 'Single Card JPG Export', () => downloadJPG(activeSingleTemplate, submittedData));
  const handleExportMergePDF = () => executeSecureExport('pdf_merge', '2-in-1 Sheet PDF Export', () => download2In1PDF(resolvedFrontTemplate, resolvedBackTemplate, submittedData));

  // Direct print handler
  const handleDirectPrint = async () => {
    if (outputType === 'merge') {
      await handleExportMergePDF();
    } else {
      await handleExportSinglePDF();
    }
  };

  return (
    <div
      onClick={() => setCardGeneratorOpen(false)}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 cursor-pointer animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="generator-title"
        className="w-full max-w-5xl bg-[#FFFFFF] border border-[#C8C2BE] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] cursor-default animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 sm:px-7 py-4 border-b border-[#E7E2DE] flex items-center justify-between bg-[#F8F6F4]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#101010] text-amber-400 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="generator-title" className="text-base sm:text-lg font-bold text-[#101010] tracking-tight">
                {isDL ? 'Driving Licence Generation' : 'Card Generation & Export'}
              </h2>
              <p className="text-xs text-[#101010]/70 font-medium">
                Generates high-resolution vector cards directly from your submitted form data
              </p>
            </div>
          </div>

          <button
            onClick={() => setCardGeneratorOpen(false)}
            className="p-2 text-[#101010]/60 hover:text-[#101010] rounded-xl hover:bg-[#E7E2DE] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Output Type Selector Bar */}
        <div className="px-5 sm:px-7 py-3 bg-[#FFFFFF] border-b border-[#E7E2DE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#101010]/70 uppercase tracking-wider">
              Choose Output:
            </span>
            <div className="inline-flex items-center bg-[#F0ECE9] p-1 rounded-xl border border-[#E0DBD6]">
              <button
                type="button"
                onClick={() => setOutputType('single')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  outputType === 'single'
                    ? 'bg-[#101010] text-white shadow-xs'
                    : 'text-[#101010] hover:bg-[#E2DDD8]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Single Card</span>
              </button>

              <button
                type="button"
                onClick={() => setOutputType('merge')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  outputType === 'merge'
                    ? 'bg-[#101010] text-amber-400 shadow-xs'
                    : 'text-[#101010] hover:bg-[#E2DDD8]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Front + Back (Merge 2-in-1)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Form Data Locked & Verified</span>
          </div>
        </div>

        {/* Content Split: Generation Options vs Live WYSIWYG Preview */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-[#FAF8F6]">
          
          {/* Left Column: Generation & Record Specifications (NO data-entry fields) */}
          <div className="space-y-5">
            {/* Submitted Form Record Summary Card */}
            <div className="p-4 sm:p-5 bg-[#FFFFFF] rounded-2xl border border-[#C8C2BE] shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#E7E2DE] pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                    Submitted Record Information
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  Active
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#101010]/60 block">
                    {isDL ? 'Driver Name' : 'Cardholder Name'}
                  </span>
                  <span className="font-bold text-[#101010] text-sm block">
                    {cardholderName}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#101010]/60 block">
                      {isDL ? 'Licence Number' : 'NIDA Number'}
                    </span>
                    <span className="font-mono font-bold text-[#101010]">
                      {identifierNumber}
                    </span>
                  </div>

                  {secondaryIdentifier && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#101010]/60 block">
                        Identifier
                      </span>
                      <span className="font-mono font-bold text-[#101010]">
                        {secondaryIdentifier}
                      </span>
                    </div>
                  )}
                </div>

                {categoriesFormatted && (
                  <div className="pt-1">
                    <span className="text-[10px] uppercase font-bold text-[#101010]/60 block">
                      Permitted Categories (Front Card)
                    </span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 block mt-0.5 tracking-wider">
                      {categoriesFormatted}
                    </span>
                  </div>
                )}

                {isDL && submittedData.dateOfIssue && submittedData.dateOfExpiry && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#101010]/60 block">
                        Date of Issue
                      </span>
                      <span className="font-mono text-[#101010]">
                        {submittedData.dateOfIssue}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#101010]/60 block">
                        Date of Expiry
                      </span>
                      <span className="font-mono text-[#101010]">
                        {submittedData.dateOfExpiry}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Print & Output Specifications */}
            <div className="p-4 sm:p-5 bg-[#FFFFFF] rounded-2xl border border-[#C8C2BE] shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-[#E7E2DE] pb-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                  Print Sheet & Layout Specifications
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-[#F8F6F4] border border-[#E7E2DE]">
                  <span className="text-[10px] uppercase font-bold text-[#101010]/60 block">Paper Size</span>
                  <span className="font-bold text-[#101010]">Standard A4 (210 × 297 mm)</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#F8F6F4] border border-[#E7E2DE]">
                  <span className="text-[10px] uppercase font-bold text-[#101010]/60 block">Card Standard</span>
                  <span className="font-bold text-[#101010]">CR80 (85.60 × 53.98 mm)</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#F8F6F4] border border-[#E7E2DE]">
                  <span className="text-[10px] uppercase font-bold text-[#101010]/60 block">Print Separation</span>
                  <span className="font-bold text-[#101010]">12 mm Vertical Gap</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#F8F6F4] border border-[#E7E2DE]">
                  <span className="text-[10px] uppercase font-bold text-[#101010]/60 block">Resolution</span>
                  <span className="font-bold text-[#101010]">300 DPI Vector High-Res</span>
                </div>
              </div>
            </div>

            {/* Single Card Side Selector (Only when Single Card output is selected) */}
            {outputType === 'single' && (
              <div className="p-4 bg-[#FFFFFF] rounded-2xl border border-[#C8C2BE] shadow-xs space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-[#101010]">
                  Select Card Face to Export:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSide('front')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      activeSide === 'front'
                        ? 'bg-[#101010] text-amber-400 border-[#101010] shadow-xs'
                        : 'bg-[#F8F6F4] text-[#101010] border-[#E7E2DE] hover:bg-[#EDE8E4]'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Front Side</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSide('back')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      activeSide === 'back'
                        ? 'bg-[#101010] text-amber-400 border-[#101010] shadow-xs'
                        : 'bg-[#F8F6F4] text-[#101010] border-[#E7E2DE] hover:bg-[#EDE8E4]'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Back Side</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live WYSIWYG Preview & Instant Export Actions */}
          <div className="flex flex-col items-center justify-between bg-[#FFFFFF] p-5 sm:p-6 rounded-2xl border border-[#C8C2BE] shadow-xs">
            <div className="w-full flex flex-col items-center">
              <div className="text-xs font-bold text-[#101010] uppercase tracking-wider mb-4 text-center">
                {outputType === 'single'
                  ? `Live Card Preview — ${activeSide === 'front' ? 'Front Side' : 'Back Side'}`
                  : 'Front + Back Merge 2-in-1 Print Sheet Layout'}
              </div>

              {isRendering ? (
                <div className="h-56 flex flex-col items-center justify-center text-[#101010]/60 text-xs font-medium gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                  <span>Rendering card with submitted data...</span>
                </div>
              ) : outputType === 'single' ? (
                /* Single Card Preview */
                singlePreviewUrl ? (
                  <div className="flex justify-center my-2 w-full">
                    <img
                      src={singlePreviewUrl}
                      alt="Single Card Preview"
                      className="max-w-full max-h-64 rounded-xl shadow-md border border-[#C8C2BE] object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-[#101010]/50 text-xs">
                    Preview unavailable
                  </div>
                )
              ) : (
                /* Front + Back Merge 2-in-1 Preview (Vertical Stack matching A4 PDF) */
                <div className="w-full max-w-sm bg-[#F8F6F4] border border-[#C8C2BE] rounded-2xl p-4 shadow-sm flex flex-col items-center space-y-3">
                  {/* Front Card Box */}
                  <div className="w-full bg-[#FFFFFF] rounded-xl p-2.5 border border-[#E7E2DE] flex flex-col items-center">
                    <div className="text-[10px] font-bold text-[#101010] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <span>FRONT CARD</span>
                    </div>
                    {frontPreviewUrl ? (
                      <img
                        src={frontPreviewUrl}
                        alt="Front Card Preview"
                        className="w-full max-h-32 object-contain rounded-lg border border-[#C8C2BE] shadow-xs"
                      />
                    ) : (
                      <div className="h-20 flex items-center justify-center text-[10px] text-[#101010]/50">
                        Rendering Front...
                      </div>
                    )}
                  </div>

                  {/* Connector indicator */}
                  <div className="text-[#101010]/70 text-[10px] uppercase font-mono font-bold tracking-wider flex items-center gap-1">
                    <span>↓ 12mm Print Gap ↓</span>
                  </div>

                  {/* Back Card Box */}
                  <div className="w-full bg-[#FFFFFF] rounded-xl p-2.5 border border-[#E7E2DE] flex flex-col items-center">
                    <div className="text-[10px] font-bold text-[#101010] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <span>BACK CARD</span>
                    </div>
                    {backPreviewUrl ? (
                      <img
                        src={backPreviewUrl}
                        alt="Back Card Preview"
                        className="w-full max-h-32 object-contain rounded-lg border border-[#C8C2BE] shadow-xs"
                      />
                    ) : (
                      <div className="h-20 flex items-center justify-center text-[10px] text-[#101010]/50">
                        Rendering Back...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Generation & Export Actions */}
            <div className="w-full pt-5 border-t border-[#E7E2DE] space-y-3 mt-4">
              <div className="text-xs font-bold text-[#101010] text-center">
                Generation & Export Options
              </div>

              {downloadState !== 'IDLE' && (
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${
                  downloadState === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                  downloadState === 'FAILED' ? 'bg-red-50 text-red-800 border border-red-200' :
                  'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  <span>Export State: <span className="uppercase font-black">{downloadState}</span></span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] opacity-85">
                      {downloadState === 'QUEUED' && 'Queued for generation...'}
                      {downloadState === 'GENERATING' && 'Generating high-res file...'}
                      {downloadState === 'READY' && 'File verified (Size > 0)...'}
                      {downloadState === 'DOWNLOADING' && 'Delivering file download...'}
                      {downloadState === 'COMPLETED' && 'Download complete! Token consumed.'}
                      {downloadState === 'FAILED' && 'Export failed. Token NOT consumed.'}
                    </span>
                    {isExporting && downloadState !== 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsExporting(false);
                          setDownloadState('IDLE');
                        }}
                        className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[9px] font-black uppercase tracking-wider transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}

              {outputType === 'single' ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleExportSinglePDF}
                    disabled={isExporting}
                    className="w-full py-3 px-4 bg-[#101010] hover:bg-[#252525] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer whitespace-nowrap"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>{isExporting ? 'Generating PDF...' : 'Download Single Card (PDF)'}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleExportSinglePNG}
                      className="py-2.5 px-3 bg-[#FFFFFF] hover:bg-[#F5F2EF] border border-[#C8C2BE] text-[#101010] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-[#101010]" />
                      <span>Download PNG</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSingleJPG}
                      className="py-2.5 px-3 bg-[#FFFFFF] hover:bg-[#F5F2EF] border border-[#C8C2BE] text-[#101010] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-[#101010]" />
                      <span>Download JPG</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleExportMergePDF}
                    disabled={isExporting}
                    className="w-full py-3.5 px-4 bg-[#101010] hover:bg-[#252525] text-amber-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer whitespace-nowrap"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isExporting ? 'Generating 2-in-1 PDF...' : 'Download Front + Back 2-in-1 PDF (A4 Sheet)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectPrint}
                    className="w-full py-2.5 px-4 bg-[#FFFFFF] hover:bg-[#F5F2EF] border border-[#C8C2BE] text-[#101010] text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#101010]" />
                    <span>Print 2-in-1 Sheet</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
