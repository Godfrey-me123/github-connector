// @ts-nocheck -- imported legacy BIGsta code
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useTemplateStore } from '../../store/useTemplateStore';
import { FloatingInput } from './FloatingInput';
import { ArrowLeft, Download, Loader2, CheckCircle2, AlertCircle, X, FileText } from 'lucide-react';

const BUCKET = 'nida_responses';

interface ResponseFileItem {
  fileNum: 1 | 2;
  path: string;
  name: string;
}

const getUniqueAttachedFiles = (r: any): ResponseFileItem[] => {
  const files: ResponseFileItem[] = [];
  const p1 = r?.response_file_path && String(r.response_file_path).trim() !== '' && String(r.response_file_path) !== 'null'
    ? String(r.response_file_path).trim()
    : null;
  const p2 = r?.response_file_path_2 && String(r.response_file_path_2).trim() !== '' && String(r.response_file_path_2) !== 'null'
    ? String(r.response_file_path_2).trim()
    : null;

  if (p1) {
    files.push({
      fileNum: 1,
      path: p1,
      name: r.response_file_name || 'NIDA File 1',
    });
  }

  // Only add p2 if it exists and is distinct from p1
  if (p2 && p2 !== p1) {
    files.push({
      fileNum: 2,
      path: p2,
      name: r.response_file_name_2 || 'NIDA File 2',
    });
  }

  return files;
};

export const NidaRequestFormScreen: React.FC = () => {
  const currentAuthKey = useTemplateStore((s) => s.currentAuthKey);
  const activePasskeys = useTemplateStore((s) => s.activePasskeys) || [];

  const [nidaNo, setNidaNo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [motherName, setMotherName] = useState('');
  const [ward, setWard] = useState('');
  const [district, setDistrict] = useState('');
  const [place, setPlace] = useState('');
  const [type, setType] = useState<'picture' | 'signature' | 'both' | 'soft_copy'>('picture');

  const [loading, setLoading] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    if (type !== 'info') {
      setTimeout(() => {
        setToast((prev) => (prev?.message === message ? null : prev));
      }, 5000);
    }
  };

  const loadMine = async () => {
    if (!currentAuthKey) return;
    try {
      const { data } = await supabase
        .from('nida_requests')
        .select('*')
        .eq('requester_key', currentAuthKey)
        .order('created_at', { ascending: false });
      setMyRequests(data || []);
    } catch {
      // Ignore network errors on background fetch
    }
  };

  useEffect(() => {
    loadMine();
  }, [currentAuthKey]);

  const handleBack = () => {
    const store = useTemplateStore.getState();
    if (typeof store.goBack === 'function') store.goBack();
    else store.setActiveScreen('home');
  };

  const fillFrom = (r: any) => {
    setEditingId(r.id);
    setNidaNo(r.nida_no || '');
    setWhatsapp(r.whatsapp_number || '');
    setMotherName(r.mother_name || '');
    setWard(r.ward_of_residence || '');
    setDistrict(r.district_of_birth || '');
    setPlace(r.street_village || '');
    setType(r.request_type || 'picture');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!nidaNo.trim()) {
      showToast('error', 'Please enter your NIDA number.');
      return;
    }
    if (whatsapp.replace(/\D/g, '').length < 9) {
      showToast('error', 'Please enter a valid WhatsApp number.');
      return;
    }

    setLoading(true);
    setSendingStatus('Sending request to database...');
    showToast('info', 'Sending request to database...');

    try {
      const pk = activePasskeys.find((p) => p.key === currentAuthKey);
      const payload = {
        nida_no: nidaNo.trim(),
        whatsapp_number: whatsapp.trim(),
        mother_name: motherName.trim(),
        ward_of_residence: ward.trim(),
        district_of_birth: district.trim(),
        street_village: place.trim(),
        request_type: type,
        requester_key: currentAuthKey || null,
        requester_name: pk?.description || null,
        status: 'PENDING',
        updated_at: new Date().toISOString(),
      };

      const { error } = editingId
        ? await supabase.from('nida_requests').update(payload).eq('id', editingId)
        : await supabase.from('nida_requests').insert(payload);

      if (error) throw error;

      const successMsg = editingId ? 'Corrected details sent.' : 'Request submitted successfully.';
      setSendingStatus(null);
      showToast('success', successMsg);

      setEditingId(null);
      setNidaNo('');
      setWhatsapp('');
      setMotherName('');
      setWard('');
      setDistrict('');
      setPlace('');
      await loadMine();
    } catch (err: any) {
      setSendingStatus(null);
      showToast('error', 'Submission error: ' + (err?.message || 'Database error'));
    } finally {
      setLoading(false);
    }
  };

  const downloadIndividualFile = async (r: any, fileNum: 1 | 2) => {
    const downloadKey = `${r.id}_${fileNum}`;
    const filePath = fileNum === 1 ? r.response_file_path : r.response_file_path_2;
    const fileName =
      fileNum === 1
        ? r.response_file_name || 'NIDA-Response-File-1'
        : r.response_file_name_2 || 'NIDA-Response-File-2';

    if (!filePath || String(filePath).trim() === '' || String(filePath) === 'null') return;

    setDownloading(downloadKey);
    showToast('info', 'Preparing file download...');

    try {
      const { data, error } = await supabase.storage.from(BUCKET).download(filePath);
      if (error || !data) throw error || new Error('File not found in storage');

      const a = document.createElement('a');
      a.href = URL.createObjectURL(data);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);

      // Clean up downloaded file from storage bucket
      await supabase.storage.from(BUCKET).remove([filePath]);

      const remainingPath = fileNum === 1 ? r.response_file_path_2 : r.response_file_path;
      const isOtherEmpty =
        !remainingPath ||
        String(remainingPath).trim() === '' ||
        String(remainingPath) === 'null' ||
        remainingPath === filePath;

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      if (fileNum === 1) updateData.response_file_path = null;
      if (fileNum === 2) updateData.response_file_path_2 = null;

      if (isOtherEmpty) {
        updateData.response_file_path = null;
        updateData.response_file_path_2 = null;
        updateData.status = 'DELIVERED';
      }

      await supabase.from('nida_requests').update(updateData).eq('id', r.id);
      showToast('success', 'File downloaded and saved.');
      await loadMine();
    } catch (e: any) {
      showToast('error', 'Download failed: ' + (e?.message || e));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white min-h-screen">
      <button type="button" onClick={handleBack} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft size={20} /> Back
      </button>

      {/* Floating Status / Toast Notification Banner */}
      {toast && (
        <div
          className={`mb-4 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : toast.type === 'info'
              ? 'bg-blue-50 text-blue-800 border border-blue-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'info' ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Title - Max 2 words */}
      <h2 className="text-2xl font-bold mb-6 text-slate-900">
        {editingId ? 'Correct Request' : 'NIDA Request'}
      </h2>

      {/* Sending Progress Indicator */}
      {sendingStatus && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3 text-blue-800 text-xs font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>{sendingStatus}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FloatingInput
          label="NIDA No."
          inputMode="numeric"
          disabled={loading}
          value={nidaNo}
          onChange={(e) => setNidaNo((e.target as HTMLInputElement).value)}
        />
        <FloatingInput
          label="Your WhatsApp Number (Make sure the number is on WhatsApp)"
          type="tel"
          inputMode="tel"
          required
          disabled={loading}
          value={whatsapp}
          onChange={(e) => setWhatsapp((e.target as HTMLInputElement).value)}
        />
        <FloatingInput
          label="Mother's Name"
          disabled={loading}
          value={motherName}
          onChange={(e) => setMotherName((e.target as HTMLInputElement).value)}
        />
        <FloatingInput
          label="Ward of Residence"
          disabled={loading}
          value={ward}
          onChange={(e) => setWard((e.target as HTMLInputElement).value)}
        />
        <FloatingInput
          label="District of Birth"
          disabled={loading}
          value={district}
          onChange={(e) => setDistrict((e.target as HTMLInputElement).value)}
        />
        <FloatingInput
          label="Street/Village of NIDA Registration"
          disabled={loading}
          value={place}
          onChange={(e) => setPlace((e.target as HTMLInputElement).value)}
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Choose requirement</label>
          <div className="flex flex-wrap gap-3 sm:gap-4 text-xs font-semibold text-gray-800">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                disabled={loading}
                value="picture"
                checked={type === 'picture'}
                onChange={() => setType('picture')}
              />{' '}
              Picture
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                disabled={loading}
                value="signature"
                checked={type === 'signature'}
                onChange={() => setType('signature')}
              />{' '}
              Signature
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                disabled={loading}
                value="both"
                checked={type === 'both'}
                onChange={() => setType('both')}
              />{' '}
              Both
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-blue-700 font-bold">
              <input
                type="radio"
                disabled={loading}
                value="soft_copy"
                checked={type === 'soft_copy'}
                onChange={() => setType('soft_copy')}
              />{' '}
              NIDA Card Soft Copy
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Transmitting data...</span>
            </>
          ) : editingId ? (
            'Send Details'
          ) : (
            'Submit Request'
          )}
        </button>
      </form>

      {/* Requests List */}
      {myRequests.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold mb-3 text-slate-900">My Requests</h3>
          <div className="space-y-3">
            {myRequests.map((r) => {
              const attachedFiles = getUniqueAttachedFiles(r);

              return (
                <div key={r.id} className="border border-slate-200 rounded-xl p-3 text-sm bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">NIDA {r.nida_no}</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'RESPONDED'
                          ? 'bg-blue-100 text-blue-800'
                          : r.status === 'INFO_REQUESTED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(r.created_at).toLocaleString()} · {r.request_type}
                  </p>

                  {r.admin_message && (
                    <p className="mt-2 text-xs bg-amber-50 border border-amber-100 p-2 rounded-lg text-amber-900">
                      Admin: {r.admin_message}
                    </p>
                  )}

                  {r.status === 'INFO_REQUESTED' && (
                    <button
                      onClick={() => fillFrom(r)}
                      className="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white rounded-lg p-2 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Correct details
                    </button>
                  )}

                  {/* Render Deduplicated Attached Response Files */}
                  {attachedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Response Files</span>
                      </div>
                      {attachedFiles.map((file) => {
                        const downloadKey = `${r.id}_${file.fileNum}`;
                        const isDownloadingThis = downloading === downloadKey;

                        return (
                          <button
                            key={downloadKey}
                            disabled={isDownloadingThis}
                            onClick={() => downloadIndividualFile(r, file.fileNum)}
                            className={`w-full flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold transition-colors cursor-pointer ${
                              file.fileNum === 1
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {isDownloadingThis ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            <span>
                              {isDownloadingThis
                                ? 'Downloading file...'
                                : `Download ${file.name}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {r.status === 'DELIVERED' && (
                    <p className="mt-2 text-xs text-emerald-700 font-medium">
                      Downloaded — file removed from servers.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
