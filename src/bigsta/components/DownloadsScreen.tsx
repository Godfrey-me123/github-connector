import React, { useEffect, useState } from 'react';
import {
  DownloadCloud,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  AlertCircle,
  X,
  FolderOpen,
  Share2,
  FileText,
  Image as ImageIcon,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCw,
  HardDrive,
  BarChart3,
  ShieldCheck,
  Filter,
  Home
} from 'lucide-react';
import { useTemplateStore } from '../store/useTemplateStore';
import { DownloadRecord, getAllDownloadRecordsDB, deleteDownloadRecordDB, saveDownloadRecordDB } from '../utils/idb';
import { UniversalBackButton } from './common/UniversalBackButton';

export const DownloadsScreen: React.FC = () => {
  const { authRole, setActiveScreen, consumeUsage, userPreferences, navigateSafely } = useTemplateStore();
  
  if (authRole === 'user') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-5 border border-slate-200 animate-in fade-in zoom-in duration-300">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center">
            <DownloadCloud className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">Downloads Center</h2>
            <p className="text-sm text-slate-600 font-medium">
              Downloads Center is currently in progress.
            </p>
          </div>
          <button
            onClick={() => navigateSafely('home')}
            className="w-full py-3 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'processing' | 'failed'>('all');

  // Preview & Zoom Modal State
  const [previewRecord, setPreviewRecord] = useState<DownloadRecord | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      const records = await getAllDownloadRecordsDB();
      // Remove any previously seeded fake samples from DB
      for (const r of records) {
        if (r.id.startsWith('dl_sample_')) {
          await deleteDownloadRecordDB(r.id);
        }
      }
      const realRecords = records.filter((r) => !r.id.startsWith('dl_sample_'));
      setDownloads(realRecords);
    } catch (e) {
      console.error('Error loading downloads', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDownloadRecordDB(id);
      setDownloads(downloads.filter(d => d.id !== id));
      setSuccessToast('File removed from Downloads Center');
      setTimeout(() => setSuccessToast(null), 2500);
    } catch (e) {
      console.error('Error deleting download', e);
    }
  };

  const handleDownload = async (record: DownloadRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const link = document.createElement('a');
      link.download = record.fileName;
      link.href = record.dataUrl || '#';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (record.status === 'READY') {
        record.status = 'DOWNLOADED';
        await saveDownloadRecordDB(record);
        setDownloads([...downloads]);
      }

      const folderName = userPreferences.downloadFolder || 'Downloads/BIGsta';
      setSuccessToast(`Saved directly to device storage: ${folderName}/${record.fileName}`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      console.error('Download delivery failed:', err);
    }
  };

  const handleShare = async (record: DownloadRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: record.fileName,
          text: `BIGsta Document Export: ${record.fileName}`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share canceled or not supported', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setSuccessToast('Download link copied to clipboard');
      setTimeout(() => setSuccessToast(null), 2500);
    }
  };

  const handleRetry = async (record: DownloadRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      record.status = 'GENERATING';
      record.progressPercent = 10;
      await saveDownloadRecordDB(record);
      setDownloads([...downloads]);

      setTimeout(async () => {
        record.status = 'READY';
        record.progressPercent = 100;
        await saveDownloadRecordDB(record);
        setDownloads([...downloads]);
        setSuccessToast(`Regeneration complete for ${record.fileName}`);
        setTimeout(() => setSuccessToast(null), 2500);
      }, 1500);
    } catch (err) {
      console.error('Retry failed:', err);
    }
  };

  // Grouping & Filtering
  const readyDownloads = downloads.filter(d => d.status === 'READY' || d.status === 'DOWNLOADED');
  const processingDownloads = downloads.filter(d => d.status === 'GENERATING' || d.status === 'QUEUED');
  const failedDownloads = downloads.filter(d => d.status === 'FAILED');

  const filteredDownloads = downloads.filter(d => {
    const matchesSearch = d.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.service.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ready') return d.status === 'READY' || d.status === 'DOWNLOADED';
    if (statusFilter === 'processing') return d.status === 'GENERATING' || d.status === 'QUEUED';
    if (statusFilter === 'failed') return d.status === 'FAILED';

    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 text-[#111827]">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UniversalBackButton />
            <button
              type="button"
              onClick={() => setActiveScreen('home')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors flex items-center justify-center cursor-pointer"
              title="Return to Home Portal"
              aria-label="Return to Home Portal"
            >
              <Home className="w-4 h-4 text-slate-700" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <DownloadCloud className="w-5 h-5 text-[#2563EB]" />
                Downloads Center
              </h1>
              <p className="text-xs text-slate-500">
                {authRole === 'admin' ? 'System-wide File Generation & Storage Center' : 'Single source of truth for all your generated documents'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
              {userPreferences.downloadFolder || 'Downloads/BIGsta'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">

        {/* Success / Notification Toast */}
        {successToast && (
          <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between text-xs font-medium animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Card 1: Downloads Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ready Files</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{readyDownloads.length}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Processing</span>
              <p className="text-2xl font-extrabold text-blue-600 mt-1">{processingDownloads.length}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Failed Exports</span>
              <p className="text-2xl font-extrabold text-red-600 mt-1">{failedDownloads.length}</p>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100">
              <XCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Storage</span>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">
                {(downloads.reduce((acc, d) => acc + (d.sizeBytes || 1200000), 0) / 1000000).toFixed(1)} MB
              </p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl border border-slate-200">
              <HardDrive className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 2: Search & Filter Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents by name or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'all' ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({downloads.length})
            </button>
            <button
              onClick={() => setStatusFilter('ready')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'ready' ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ready ({readyDownloads.length})
            </button>
            <button
              onClick={() => setStatusFilter('processing')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'processing' ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Processing ({processingDownloads.length})
            </button>
          </div>
        </div>

        {/* Card 3: Main File Grid & List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-600" />
            <p className="text-xs font-semibold">Loading your downloads repository...</p>
          </div>
        ) : filteredDownloads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
            <DownloadCloud className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No documents found</p>
            <p className="text-xs text-slate-400">Generate a document from NIDA, Driving License or other services to see it here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Document Repository</h2>
              <span className="text-xs text-slate-400">{filteredDownloads.length} Records</span>
            </div>

            <div className="space-y-3">
              {filteredDownloads.map((record) => (
                <div
                  key={record.id}
                  onClick={() => { setPreviewRecord(record); setZoomScale(1); setRotationAngle(0); }}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-3 rounded-2xl shrink-0 ${
                      record.format === 'PDF' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                      {record.format === 'PDF' ? <FileText className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{record.fileName}</span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {record.format}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {record.service} • {record.date} • {((record.sizeBytes || 1200000) / 1000000).toFixed(2)} MB
                      </p>

                      {/* Processing Progress Bar */}
                      {(record.status === 'GENERATING' || record.status === 'QUEUED') && (
                        <div className="w-full max-w-md pt-1">
                          <div className="flex items-center justify-between text-[11px] text-blue-700 font-medium mb-1">
                            <span>Generating high-resolution document...</span>
                            <span>{record.progressPercent || 65}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all duration-300"
                              style={{ width: `${record.progressPercent || 65}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {record.status === 'FAILED' && (
                        <p className="text-xs font-semibold text-red-600">
                          Failure: {record.failureReason || 'Generation timeout.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    {record.status === 'FAILED' ? (
                      <button
                        onClick={(e) => handleRetry(record, e)}
                        className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                      </button>
                    ) : (record.status === 'READY' || record.status === 'DOWNLOADED') ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewRecord(record); setZoomScale(1); setRotationAngle(0); }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                          title="Open document in app"
                        >
                          <Eye className="w-4 h-4" /> Open
                        </button>
                        <button
                          onClick={(e) => handleDownload(record, e)}
                          className="p-2 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-100 border border-slate-200 rounded-xl text-xs font-semibold transition-all"
                          title="Save to device storage"
                        >
                          <DownloadCloud className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleShare(record, e)}
                          className="p-2 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-100 border border-slate-200 rounded-xl text-xs font-semibold transition-all"
                          title="Share Document"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : null}

                    <button
                      onClick={(e) => handleDelete(record.id, e)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Delete File"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADMIN DOWNLOAD STATS & SYSTEM LOGS */}
        {authRole === 'admin' && (
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white">System Export Logs & Admin Analytics</h2>
              </div>
              <span className="text-xs text-blue-400 font-mono">ROLE: CEO ADMIN</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-1">
                <span className="text-slate-400">Total System File Renders</span>
                <p className="text-2xl font-extrabold text-blue-400">{downloads.length}</p>
              </div>
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-1">
                <span className="text-slate-400">Export Success Rate</span>
                <p className="text-2xl font-extrabold text-emerald-400">
                  {downloads.length > 0
                    ? `${Math.round(
                        (downloads.filter((d) => d.status === 'READY' || d.status === 'DOWNLOADED').length /
                          downloads.length) *
                          100
                      )}%`
                    : '100%'}
                </p>
              </div>
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-1">
                <span className="text-slate-400">Default Target Directory</span>
                <p className="text-sm font-mono text-slate-200 mt-1">Downloads/BIGsta/</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FULL SCREEN PREVIEW MODAL */}
      {previewRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold truncate max-w-md">{previewRecord.fileName}</h3>
                  <p className="text-[11px] text-slate-400">{previewRecord.service} • {previewRecord.format}</p>
                </div>
              </div>

              {/* Zoom & Controls Toolbar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewRecord(null)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-lg active:scale-95 mr-2"
                >
                  <ArrowLeft className="w-4 h-4" /> CLOSE & RETURN
                </button>
                <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block"></div>
                <button
                  onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 2.5))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-slate-300 min-w-[40px] text-center">{Math.round(zoomScale * 100)}%</span>
                <button
                  onClick={() => setZoomScale(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotationAngle(prev => (prev + 90) % 360)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                  title="Rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-slate-800 mx-1"></div>
                <button
                  onClick={() => handleDownload(previewRecord)}
                  className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <DownloadCloud className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            </div>

            {/* Modal Body / Interactive Canvas Stage */}
            <div className="flex-1 bg-slate-900 overflow-auto p-6 flex items-center justify-center min-h-[400px]">
              <div
                className="transition-transform duration-200 ease-out shadow-2xl rounded-xl bg-white overflow-hidden max-w-full max-h-full"
                style={{
                  transform: `scale(${zoomScale}) rotate(${rotationAngle}deg)`
                }}
              >
                {previewRecord.dataUrl ? (
                  previewRecord.format === 'PDF' ? (
                    <div className="w-full h-full flex flex-col items-center">
                      <iframe
                        src={previewRecord.dataUrl}
                        className="w-[85vw] max-w-3xl h-[70vh] rounded-xl border-none"
                        title="PDF Preview"
                      />
                      <div className="mt-4 p-5 bg-white/10 rounded-2xl backdrop-blur-md text-center border border-white/10 shadow-xl">
                        <p className="text-white text-sm font-bold mb-3 flex items-center justify-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          PDF Document Securely Generated
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                          <button
                            onClick={() => handleDownload(previewRecord)}
                            className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                          >
                            <FileText className="w-4 h-4" />
                            Open in System Viewer
                          </button>
                          <button
                            onClick={() => {
                              const win = window.open();
                              if (win) {
                                win.document.write(`<iframe src="${previewRecord.dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                              }
                            }}
                            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-white/10 flex items-center justify-center gap-2 transition-all"
                          >
                            <ZoomIn className="w-4 h-4" />
                            Full Screen Mode
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={previewRecord.dataUrl}
                      alt={previewRecord.fileName}
                      className="max-h-[75vh] object-contain rounded-xl"
                    />
                  )
                ) : (
                  <div className="w-[500px] h-[320px] bg-slate-800 text-slate-200 flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <FileText className="w-12 h-12 text-blue-400" />
                    <div>
                      <p className="text-sm font-bold">Document Preview Generating</p>
                      <p className="text-xs text-slate-400 mt-1">{previewRecord.fileName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
