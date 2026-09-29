import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  ArrowLeft,
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Printer,
  Edit3,
  CheckCircle2,
  FileCheck,
  CreditCard,
  RefreshCw,
  Eye,
  ShieldCheck,
  ChevronRight,
  Layers,
  Home,
  FileCode,
} from 'lucide-react';
import { useTemplateStore } from '../store/useTemplateStore';
import { UserUsageBadge } from './auth/UserUsageBadge';
import { renderTemplateToCanvas, downloadPDF, downloadPNG, download2In1PDF } from '../utils/export';
import { HorizontalActionRow } from './common/HorizontalActionRow';
import { AppFooter } from './common/AppFooter';
import { SAMPLE_TEMPLATES } from '../utils/sampleTemplates';
import { applyTemplateMapping, isBackSideTemplate, matchLayerToBinding, SupportedBinding, formatDrivingLicenceCategoriesFront } from '../utils/templateMappingEngine';
import { UniversalBackButton } from './common/UniversalBackButton';
import { CardTemplate } from '../types';
import { FieldMappingInspectorModal } from './nida/FieldMappingInspectorModal';

export const CardPreviewScreen: React.FC = () => {
  const {
    currentTemplate,
    setCurrentTemplate,
    setActiveScreen,
    goBack,
    setExportModalOpen,
    frontPopulatedTemplate,
    backPopulatedTemplate,
    lastNidaFormData,
    lastDrivingLicenseFormData,
    lastNhifFormData,
    setPopulatedCardPair,
    authRole,
    activeServiceId,
  } = useTemplateStore();

  const targetFormScreen = activeServiceId === 'driving_license' ? 'driving_license' : activeServiceId === 'nhif' ? 'nhif' : 'nida';

  // Output selection: Single Card vs Front + Back (Merge 2-in-1)
  const [outputMode, setOutputMode] = useState<'single' | 'merge'>('single');

  const [activeSide, setActiveSide] = useState<'front' | 'back'>(
    isBackSideTemplate(currentTemplate) ? 'back' : 'front'
  );

  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [mergeFrontUrl, setMergeFrontUrl] = useState<string>('');
  const [mergeBackUrl, setMergeBackUrl] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  // Field Mapping Inspector (Development Only)
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [selectedFieldId, setSelectedFieldId] = useState<SupportedBinding | null>(null);

  const isDevMode = typeof window !== 'undefined' && (
    (import.meta as any).env?.DEV ||
    window.location.search.includes('debug') ||
    window.location.search.includes('inspect') ||
    window.location.search.includes('dev')
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartDistRef = useRef<number | null>(null);

  // Keyboard shortcut Ctrl+Shift+D or Cmd+Shift+D for Dev Inspector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsInspectorOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Active template based on selected side
  const activeTemplate: CardTemplate = React.useMemo(() => {
    if (activeSide === 'back' && backPopulatedTemplate) {
      return backPopulatedTemplate;
    }
    if (activeSide === 'front' && frontPopulatedTemplate) {
      return frontPopulatedTemplate;
    }
    return currentTemplate;
  }, [activeSide, frontPopulatedTemplate, backPopulatedTemplate, currentTemplate]);

  // Determine service and templates
  const isDL = activeServiceId === 'driving_license' || currentTemplate.cardType === 'Driving License';
  const isNHIF = activeServiceId === 'nhif' || (currentTemplate.cardType as string) === 'NHIF Card' || currentTemplate.cardType === 'NHIF Membership Card' || currentTemplate.serviceId === 'nhif';
  const activeFormData = (isDL ? lastDrivingLicenseFormData : isNHIF ? lastNhifFormData : lastNidaFormData) || {};

  // Ensure current template in store is synchronized when side changes
  const handleSideSwitch = (side: 'front' | 'back') => {
    setActiveSide(side);
    if (side === 'front' && frontPopulatedTemplate) {
      setCurrentTemplate(frontPopulatedTemplate);
    } else if (side === 'back' && backPopulatedTemplate) {
      setCurrentTemplate(backPopulatedTemplate);
    } else if (side === 'back' && !backPopulatedTemplate && (lastDrivingLicenseFormData || lastNidaFormData || lastNhifFormData)) {
      const { getUniversalBackTemplate } = useTemplateStore.getState();
      const resolvedBack = getUniversalBackTemplate(activeServiceId);
      const activeData = (isDL ? lastDrivingLicenseFormData : isNHIF ? lastNhifFormData : lastNidaFormData) as any;
      if (resolvedBack && activeData) {
        const result = applyTemplateMapping(resolvedBack, activeData);
        setPopulatedCardPair(frontPopulatedTemplate || currentTemplate, result.populatedTemplate, activeData);
        setCurrentTemplate(result.populatedTemplate);
      }
    }
  };

  const fTpl = React.useMemo(() => {
    return frontPopulatedTemplate || currentTemplate;
  }, [frontPopulatedTemplate, currentTemplate]);

  const bTpl = React.useMemo(() => {
    if (backPopulatedTemplate) return backPopulatedTemplate;
    const { getUniversalBackTemplate } = useTemplateStore.getState();
    return getUniversalBackTemplate(activeServiceId);
  }, [backPopulatedTemplate, activeServiceId]);

  // Render high-res card canvas to data URL for smooth interactive display
  useEffect(() => {
    let isCancelled = false;
    setIsRendering(true);

    if (outputMode === 'single') {
      renderTemplateToCanvas(activeTemplate, activeFormData, 300)
        .then((canvas) => {
          if (!isCancelled) {
            setPreviewDataUrl(canvas.toDataURL('image/png'));
            setIsRendering(false);
          }
        })
        .catch((err) => {
          console.error('Failed to render preview canvas:', err);
          if (!isCancelled) setIsRendering(false);
        });
    } else {
      Promise.all([
        renderTemplateToCanvas(fTpl, activeFormData, 250),
        renderTemplateToCanvas(bTpl, activeFormData, 250),
      ])
        .then(([frontCanvas, backCanvas]) => {
          if (!isCancelled) {
            setMergeFrontUrl(frontCanvas.toDataURL('image/png'));
            setMergeBackUrl(backCanvas.toDataURL('image/png'));
            setIsRendering(false);
          }
        })
        .catch((err) => {
          console.error('Failed to render merge canvas:', err);
          if (!isCancelled) setIsRendering(false);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [activeTemplate, outputMode, fTpl, bTpl, activeFormData]);

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.0, +(prev + 0.15).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.65, +(prev - 0.15).toFixed(2)));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
  };

  // Direct single card PDF download
  const handleDownloadSinglePDF = async () => {
    const store = useTemplateStore.getState();
    const val = store.validateExportAccess('pdf');
    if (!val.allowed) return;
    setIsDownloadingPdf(true);
    try {
      await downloadPDF(activeTemplate, activeFormData, `${activeTemplate.templateName || 'card'}.pdf`);
      store.consumeUsage('Single Card PDF Download', undefined, 1);
    } catch (e) {
      console.error('Download failed', e);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Direct 2-in-1 merge PDF download
  const handleDownload2In1PDF = async () => {
    const store = useTemplateStore.getState();
    const val = store.validateExportAccess('pdf_merge');
    if (!val.allowed) return;
    setIsDownloadingPdf(true);
    try {
      await download2In1PDF(fTpl, bTpl, activeFormData);
      store.consumeUsage('2-in-1 Sheet PDF Download', undefined, 1);
    } catch (e) {
      console.error('2-in-1 download failed', e);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Direct quick print action
  const handleQuickPrint = async () => {
    const store = useTemplateStore.getState();
    const val = store.validateExportAccess('quick_print');
    if (!val.allowed) return;

    try {
      setIsPrinting(true);
      if (outputMode === 'merge') {
        await download2In1PDF(fTpl, bTpl, activeFormData);
      } else {
        await downloadPDF(activeTemplate, activeFormData, `${activeTemplate.templateName || 'card'}.pdf`);
      }
      store.consumeUsage(`${activeTemplate.templateName || 'Card'} Quick Print`, undefined, 1);
    } catch (e) {
      console.error('Print failed', e);
    } finally {
      setIsPrinting(false);
    }
  };

  // Mobile pinch to zoom handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = (dist - touchStartDistRef.current) / 200;
      setZoomLevel((prev) => Math.min(2.0, Math.max(0.65, +(prev + diff).toFixed(2))));
      touchStartDistRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
  };

  // Extract meta details for display
  const holderName = lastNidaFormData
    ? `${lastNidaFormData.firstName || ''} ${lastNidaFormData.middleName || ''} ${lastNidaFormData.lastName || ''}`.trim()
    : 'Identity Document';
  const nidaNumber = lastNidaFormData?.nidaNumber || '';
  const gender = lastNidaFormData?.gender ? (lastNidaFormData.gender.toUpperCase().startsWith('M') ? 'M' : 'F') : 'M';

  const dlName = lastDrivingLicenseFormData
    ? [lastDrivingLicenseFormData.firstName, lastDrivingLicenseFormData.secondName, lastDrivingLicenseFormData.thirdName].filter(Boolean).join(' ')
    : '';
  const dlLicenceNo = lastDrivingLicenseFormData?.licenceNumber || '';
  const dlPin = lastDrivingLicenseFormData?.pinNumber || '';
  const dlCategories = lastDrivingLicenseFormData?.classes
    ? formatDrivingLicenceCategoriesFront(lastDrivingLicenseFormData.classes)
    : '';

  const nhifMemberName = lastNhifFormData?.fullName || lastNhifFormData?.full_name || '';
  const nhifCardNo = lastNhifFormData?.cardNumber || lastNhifFormData?.card_no || '';
  const nhifStatus = lastNhifFormData?.cardStatus || lastNhifFormData?.card_status || 'Active';
  const nhifDob = lastNhifFormData?.dob || '';

  const hasBackCounterpart = Boolean(
    backPopulatedTemplate || SAMPLE_TEMPLATES.some((t) => t.id === 'sample_tanzania_nida_back' || t.id === 'sample_driving_license_back' || t.id === 'sample_nhif_back')
  );

  return (
    <div className="w-full min-h-screen bg-[#08090B] text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full bg-[#0F1115]/95 backdrop-blur-md border-b border-[#4C5055]/50 px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <UniversalBackButton />
            <button
              type="button"
              onClick={() => setActiveScreen('home')}
              className="p-2 sm:p-2.5 rounded-xl bg-[#1C1F26] hover:bg-[#282C37] text-slate-300 hover:text-white border border-[#4C5055]/50 transition-colors flex items-center justify-center cursor-pointer"
              title="Return to Home Portal"
              aria-label="Return to Home Portal"
            >
              <Home className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                {isDL ? 'DRIVING LICENCE PREVIEW' : isNHIF ? 'NHIF CARD PREVIEW' : 'NIDA CARD PREVIEW'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <UserUsageBadge />

            {isDevMode && authRole === 'admin' && (
              <button
                id="dev-mapping-inspector-btn"
                type="button"
                onClick={() => setIsInspectorOpen(true)}
                className="hidden sm:flex px-2.5 py-1.5 rounded-xl bg-[#FF8F00]/15 hover:bg-[#FF8F00]/25 text-[#FF8F00] border border-[#FF8F00]/40 text-xs font-bold items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                title="Inspector"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Inspector</span>
              </button>
            )}

            <button
              id="header-edit-studio-btn"
              type="button"
              onClick={() => setActiveScreen(targetFormScreen as any)}
              className="hidden sm:flex px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-[#4C5055]/60 text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              title="Edit Form"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#47A5FF]" />
              <span>Edit Form</span>
            </button>

            {authRole === 'admin' && (
              <button
                id="header-studio-btn"
                type="button"
                onClick={() => {
                  const { activeServiceId, setCurrentTemplate, getUniversalFrontTemplate, getUniversalBackTemplate } = useTemplateStore.getState();
                  const serviceTemplates = {
                    front: getUniversalFrontTemplate(activeServiceId),
                    back: getUniversalBackTemplate(activeServiceId)
                  };
                  
                  const rawTemplate = activeSide === 'front' ? serviceTemplates.front : serviceTemplates.back;
                  if (rawTemplate) {
                    setCurrentTemplate(rawTemplate);
                  }
                  useTemplateStore.getState().navigateSafely('editor', undefined, true);
                }}
                className="hidden sm:flex px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                title="Open Studio"
              >
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                <span>Studio</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 sm:pb-12 flex flex-col items-center">
        {/* Output Mode Selector: Single Card vs Front + Back Merge 2-in-1 */}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
          <div className="p-1 rounded-2xl bg-[#14171D] border border-[#4C5055]/60 flex items-center gap-1 shadow-inner">
            <button
              id="preview-mode-single-btn"
              type="button"
              onClick={() => setOutputMode('single')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                outputMode === 'single'
                  ? 'bg-gradient-to-r from-[#47A5FF] to-[#2563eb] text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Single Card</span>
            </button>

            <button
              id="preview-mode-merge-btn"
              type="button"
              onClick={() => setOutputMode('merge')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                outputMode === 'merge'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Front + Back (Merge 2-in-1)</span>
            </button>
          </div>

          {/* Front / Back Side Switcher (Only in Single mode) */}
          {outputMode === 'single' && hasBackCounterpart && (
            <div className="p-1 rounded-2xl bg-[#14171D] border border-[#4C5055]/60 flex items-center gap-1 shadow-inner">
              <button
                id="preview-side-front-btn"
                type="button"
                onClick={() => handleSideSwitch('front')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSide === 'front'
                    ? 'bg-white/20 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Front Side</span>
              </button>

              <button
                id="preview-side-back-btn"
                type="button"
                onClick={() => handleSideSwitch('back')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeSide === 'back'
                    ? 'bg-white/20 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Back Side</span>
              </button>
            </div>
          )}
        </div>

        {/* Card Stage / Viewer */}
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full relative flex flex-col items-center justify-center p-3 sm:p-6 bg-[#0E1015] border border-[#4C5055]/60 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden"
        >
          {/* Card Viewer Canvas Box */}
          <div className="w-full flex items-center justify-center min-h-[240px] sm:min-h-[380px] relative overflow-hidden">
            {isRendering && (!previewDataUrl && !mergeFrontUrl) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0E1015]/80 z-10 gap-2">
                <RefreshCw className="w-7 h-7 text-[#47A5FF] animate-spin" />
                <span className="text-xs text-slate-400 font-medium">Rendering card preview...</span>
              </div>
            )}

            {outputMode === 'single' ? (
              previewDataUrl ? (
                <div
                  className="transition-transform duration-150 ease-out origin-center select-none flex items-center justify-center relative"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    maxWidth: '100%',
                  }}
                >
                  <div className="relative rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.6)] border border-slate-700/50 overflow-hidden bg-white">
                    <img
                      src={previewDataUrl}
                      alt={`${activeTemplate.templateName} Preview`}
                      className="max-w-full h-auto max-h-[55vh] object-contain rounded-2xl pointer-events-none"
                      draggable={false}
                    />

                    {/* Dev Visual Highlight Overlay for Inspected Element */}
                    {selectedFieldId && (() => {
                      const matchedLayer = activeTemplate.layers.find((l) =>
                        matchLayerToBinding(l, selectedFieldId, activeTemplate.layers)
                      );
                      if (!matchedLayer) return null;

                      const tWidth = activeTemplate.cardWidth || 85.6;
                      const tHeight = activeTemplate.cardHeight || 53.98;

                      const leftPct = (matchedLayer.x / tWidth) * 100;
                      const topPct = (matchedLayer.y / tHeight) * 100;
                      const widthPct = (matchedLayer.width / tWidth) * 100;
                      const heightPct = (matchedLayer.height / tHeight) * 100;

                      return (
                        <div
                          className="absolute border-2 border-[#47A5FF] bg-[#47A5FF]/20 rounded shadow-[0_0_15px_#47A5FF] pointer-events-none z-20 animate-pulse"
                          style={{
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            width: `${widthPct}%`,
                            height: `${heightPct}%`,
                          }}
                        >
                          <div className="absolute -top-6 left-0 px-2 py-0.5 bg-[#47A5FF] text-white text-[9px] font-mono font-bold rounded shadow whitespace-nowrap">
                            {selectedFieldId}: {matchedLayer.name} ({matchedLayer.width}×{matchedLayer.height}mm)
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="text-center text-xs text-slate-500 py-12">
                  Generating card display...
                </div>
              )
            ) : (
              /* Front + Back Merge 2-in-1 Preview */
              <div
                className="transition-transform duration-150 ease-out origin-center select-none flex items-center justify-center relative w-full py-2"
                style={{
                  transform: `scale(${zoomLevel})`,
                  maxWidth: '100%',
                }}
              >
                <div className="w-full max-w-sm bg-[#14171E] border border-[#4C5055]/70 rounded-2xl p-4 flex flex-col items-center gap-3 shadow-xl">
                  <div className="w-full flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Front Side Card
                    </span>
                    {mergeFrontUrl ? (
                      <img
                        src={mergeFrontUrl}
                        alt="Front Side Preview"
                        className="w-full max-h-40 object-contain rounded-xl border border-slate-700 shadow-md bg-white pointer-events-none"
                        draggable={false}
                      />
                    ) : (
                      <div className="h-28 flex items-center justify-center text-slate-500 text-xs">
                        Rendering front...
                      </div>
                    )}
                  </div>

                  <div className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1.5">
                    <span>↕ 12mm Standard Print Separation Gap ↕</span>
                  </div>

                  <div className="w-full flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Back Side Card
                    </span>
                    {mergeBackUrl ? (
                      <img
                        src={mergeBackUrl}
                        alt="Back Side Preview"
                        className="w-full max-h-40 object-contain rounded-xl border border-slate-700 shadow-md bg-white pointer-events-none"
                        draggable={false}
                      />
                    ) : (
                      <div className="h-28 flex items-center justify-center text-slate-500 text-xs">
                        Rendering back...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="mt-4 pt-3 border-t border-[#4C5055]/40 w-full flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="font-semibold text-white">
                {outputMode === 'single'
                  ? (activeSide === 'front' ? 'Front Side Card' : 'Back Side Card')
                  : 'Front + Back 2-in-1 Sheet'}
              </span>
              <span>•</span>
              <span>{outputMode === 'single' ? 'CR80 (85.6 × 54.0 mm)' : 'A4 Print Sheet Layout'}</span>
            </div>

            <div className="flex items-center gap-1 bg-[#14171E] border border-[#4C5055]/60 rounded-xl p-1">
              <button
                id="zoom-out-btn"
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.65}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                id="zoom-reset-btn"
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 rounded-lg hover:bg-white/10 text-[11px] font-mono font-semibold text-slate-200 transition-colors cursor-pointer"
                title="Reset Zoom (100%)"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              <button
                id="zoom-in-btn"
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 2.0}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Center */}
        <div className="w-full mt-6 space-y-4">
          {/* Primary Action Button */}
          {outputMode === 'single' ? (
            <button
              id="primary-download-single-btn"
              type="button"
              onClick={handleDownloadSinglePDF}
              disabled={isDownloadingPdf}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#2563eb] hover:from-emerald-500 hover:to-blue-600 text-white font-bold text-sm sm:text-base shadow-[0_10px_35px_rgba(16,185,129,0.35)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Single Card (PDF)'}</span>
            </button>
          ) : (
            <button
              id="primary-download-merge-btn"
              type="button"
              onClick={handleDownload2In1PDF}
              disabled={isDownloadingPdf}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white font-bold text-sm sm:text-base shadow-[0_10px_35px_rgba(245,158,11,0.35)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <Printer className="w-5 h-5" />
              <span>{isDownloadingPdf ? 'Generating 2-in-1 Sheet...' : 'Download Front + Back (Merge 2-in-1 PDF)'}</span>
            </button>
          )}

          {/* Secondary Actions (Horizontal row with smooth swipe) */}
          <HorizontalActionRow className="justify-center gap-2 pt-1">
            <button
              id="action-edit-form-btn"
              type="button"
              onClick={() => setActiveScreen(targetFormScreen as any)}
              className="px-4 py-2.5 rounded-xl bg-[#14171E] hover:bg-[#1E222A] text-slate-200 hover:text-white border border-[#4C5055]/70 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Edit Form</span>
            </button>

            <button
              id="action-export-options-btn"
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#14171E] hover:bg-[#1E222A] text-slate-200 hover:text-white border border-[#4C5055]/70 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#47A5FF]" />
              <span>More Formats</span>
            </button>

            <button
              id="action-quick-print-btn"
              type="button"
              onClick={handleQuickPrint}
              disabled={isPrinting}
              className="px-4 py-2.5 rounded-xl bg-[#14171E] hover:bg-[#1E222A] text-slate-200 hover:text-white border border-[#4C5055]/70 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 disabled:opacity-50 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-[#FF8F00]" />
              <span>{isPrinting ? 'Printing' : 'Print'}</span>
            </button>

            {isDevMode && authRole === 'admin' && (
              <button
                id="action-edit-studio-btn"
                type="button"
                onClick={() => {
                  const { activeServiceId, setCurrentTemplate, getUniversalFrontTemplate, getUniversalBackTemplate } = useTemplateStore.getState();
                  const serviceTemplates = {
                    front: getUniversalFrontTemplate(activeServiceId),
                    back: getUniversalBackTemplate(activeServiceId)
                  };
                  
                  const rawTemplate = activeSide === 'front' ? serviceTemplates.front : serviceTemplates.back;
                  if (rawTemplate) {
                    setCurrentTemplate(rawTemplate);
                  }
                  useTemplateStore.getState().navigateSafely('editor', undefined, true);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#14171E] hover:bg-[#1E222A] text-slate-200 hover:text-white border border-[#4C5055]/70 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                <span>Studio Editor</span>
              </button>
            )}
          </HorizontalActionRow>
        </div>

        {/* Identity Summary Card (Compact specifications for Driving Licence, NHIF & NIDA) */}
        {(nidaNumber || dlLicenceNo || nhifCardNo) && (
          <div className="w-full mt-6 p-4 rounded-2xl bg-[#0F1115]/70 border border-[#4C5055]/40 text-xs text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] uppercase text-[#A0A4A8] font-bold block">
                  {isDL ? 'Driver Name' : isNHIF ? 'Member Name' : 'Cardholder'}
                </span>
                <span className="font-semibold text-white truncate block">
                  {isDL ? dlName : isNHIF ? (nhifMemberName || 'NHIF Member') : holderName}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#A0A4A8] font-bold block">
                  {isDL ? 'Licence Number' : isNHIF ? 'Card Number' : 'NIDA Number'}
                </span>
                <span className="font-mono font-semibold text-[#47A5FF] block">
                  {isDL ? dlLicenceNo : isNHIF ? nhifCardNo : nidaNumber}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#A0A4A8] font-bold block">
                  {isDL ? 'Categories / PIN' : isNHIF ? 'Status / Details' : 'Gender / Sex'}
                </span>
                <span className="font-semibold text-white block">
                  {isDL ? `${dlCategories || 'None'}${dlPin ? ` (PIN: ${dlPin})` : ''}` : isNHIF ? `${nhifStatus}${nhifDob ? ` • DOB: ${nhifDob}` : ''}` : gender}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <AppFooter />

      {/* Field Mapping & Data Inspector Modal (Dev Only) */}
      <FieldMappingInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        frontTemplate={frontPopulatedTemplate || currentTemplate}
        backTemplate={backPopulatedTemplate || null}
        formData={activeFormData}
        selectedFieldId={selectedFieldId}
        onSelectField={(fieldId) => setSelectedFieldId(fieldId)}
      />
    </div>
  );
};
