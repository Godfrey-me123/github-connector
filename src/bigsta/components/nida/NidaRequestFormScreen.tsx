// @ts-nocheck -- imported legacy BIGsta code
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useTemplateStore } from '../../store/useTemplateStore';
import { FloatingInput } from './FloatingInput';
import { ArrowLeft, Download } from 'lucide-react';

const BUCKET = 'nida_responses';

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
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadMine = async () => {
    if (!currentAuthKey) return;
    const { data } = await supabase.from('nida_requests').select('*')
      .eq('requester_key', currentAuthKey).order('created_at', { ascending: false });
    setMyRequests(data || []);
  };
  useEffect(() => { loadMine(); }, [currentAuthKey]);

  const handleBack = () => {
    const store = useTemplateStore.getState();
    if (typeof store.goBack === 'function') store.goBack();
    else store.setActiveScreen('home');
  };

  const fillFrom = (r: any) => {
    setEditingId(r.id);
    setNidaNo(r.nida_no || ''); setWhatsapp(r.whatsapp_number || '');
    setMotherName(r.mother_name || ''); setWard(r.ward_of_residence || '');
    setDistrict(r.district_of_birth || ''); setPlace(r.street_village || '');
    setType(r.request_type || 'picture');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nidaNo.trim()) return alert('Please enter your NIDA number.');
    if (whatsapp.replace(/\D/g, '').length < 9) return alert('Please enter a valid WhatsApp number.');
    setLoading(true);
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
    setLoading(false);
    if (error) return alert('Error submitting request: ' + error.message);
    alert(editingId ? 'Corrected details sent!' : 'Request submitted successfully!');
    setEditingId(null);
    setNidaNo(''); setWhatsapp(''); setMotherName(''); setWard(''); setDistrict(''); setPlace('');
    loadMine();
  };

  const downloadSingleFile = async (filePath: string, fileName?: string) => {
    if (!filePath) return;
    const { data, error } = await supabase.storage.from(BUCKET).download(filePath);
    if (error || !data) throw error || new Error('File not found');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(data);
    a.download = fileName || 'nida-response';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const downloadResponse = async (r: any) => {
    setDownloading(r.id);
    try {
      const pathsToRemove: string[] = [];
      if (r.response_file_path) {
        await downloadSingleFile(r.response_file_path, r.response_file_name || 'File-1');
        pathsToRemove.push(r.response_file_path);
      }
      if (r.response_file_path_2) {
        await downloadSingleFile(r.response_file_path_2, r.response_file_name_2 || 'File-2');
        pathsToRemove.push(r.response_file_path_2);
      }

      if (pathsToRemove.length > 0) {
        await supabase.storage.from(BUCKET).remove(pathsToRemove);
      }

      await supabase.from('nida_requests').update({
        status: 'DELIVERED',
        response_file_path: null,
        response_file_path_2: null,
        updated_at: new Date().toISOString(),
      }).eq('id', r.id);

      loadMine();
    } catch (e: any) {
      alert('Download failed: ' + (e?.message || e));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white min-h-screen">
      <button type="button" onClick={handleBack} className="mb-6 flex items-center gap-2 text-gray-500">
        <ArrowLeft size={20} /> Back
      </button>
      <h2 className="text-2xl font-bold mb-6">{editingId ? 'Correct your NIDA request' : 'Request NIDA Info'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FloatingInput label="NIDA No." inputMode="numeric" value={nidaNo} onChange={(e) => setNidaNo((e.target as HTMLInputElement).value)} />
        <FloatingInput label="Your WhatsApp Number (Make sure the number is on WhatsApp)" type="tel" inputMode="tel" required value={whatsapp} onChange={(e) => setWhatsapp((e.target as HTMLInputElement).value)} />
        <FloatingInput label="Mother's Name" value={motherName} onChange={(e) => setMotherName((e.target as HTMLInputElement).value)} />
        <FloatingInput label="Ward of Residence" value={ward} onChange={(e) => setWard((e.target as HTMLInputElement).value)} />
        <FloatingInput label="District of Birth" value={district} onChange={(e) => setDistrict((e.target as HTMLInputElement).value)} />
        <FloatingInput label="Street/Village of NIDA Registration" value={place} onChange={(e) => setPlace((e.target as HTMLInputElement).value)} />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Choose what you need</label>
          <div className="flex flex-wrap gap-3 sm:gap-4 text-xs font-semibold text-gray-800">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" value="picture" checked={type === 'picture'} onChange={() => setType('picture')} /> Picture
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" value="signature" checked={type === 'signature'} onChange={() => setType('signature')} /> Signature
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" value="both" checked={type === 'both'} onChange={() => setType('both')} /> Both
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-blue-700 font-bold">
              <input type="radio" value="soft_copy" checked={type === 'soft_copy'} onChange={() => setType('soft_copy')} /> NIDA Card Soft Copy (PDF / Photo)
            </label>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold">
          {loading ? 'Submitting...' : editingId ? 'Send Corrected Details' : 'Submit Request'}
        </button>
      </form>

      {myRequests.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold mb-3">My requests</h3>
          <div className="space-y-3">
            {myRequests.map((r) => (
              <div key={r.id} className="border rounded-xl p-3 text-sm">
                <div className="flex justify-between"><span className="font-bold">NIDA {r.nida_no}</span><span className="text-xs font-bold">{r.status}</span></div>
                <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()} · {r.request_type}</p>
                {r.admin_message && <p className="mt-2 text-xs bg-amber-50 p-2 rounded">Admin: {r.admin_message}</p>}
                {r.status === 'INFO_REQUESTED' && (
                  <button onClick={() => fillFrom(r)} className="mt-2 w-full bg-amber-500 text-white rounded-lg p-2 text-xs font-bold">Correct & resubmit</button>
                )}
                {(r.response_file_path || r.response_file_path_2) && (
                  <button disabled={downloading === r.id} onClick={() => downloadResponse(r)} className="mt-2 w-full flex items-center justify-center gap-1 bg-emerald-600 text-white rounded-lg p-2 text-xs font-bold">
                    <Download className="w-4 h-4" /> {downloading === r.id ? 'Downloading…' : `Download Response File${r.response_file_path_2 ? 's (2 files)' : ''}`}
                  </button>
                )}
                {r.status === 'DELIVERED' && <p className="mt-2 text-xs text-emerald-700">Downloaded — file removed from our servers.</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
