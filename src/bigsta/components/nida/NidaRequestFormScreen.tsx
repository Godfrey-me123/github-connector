import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { FloatingInput } from './FloatingInput';
import { FloatingSelect } from './FloatingSelect';
import { ArrowLeft } from 'lucide-react';

export const NidaRequestFormScreen: React.FC = () => {
  const [motherName, setMotherName] = useState('');
  const [ward, setWard] = useState('');
  const [district, setDistrict] = useState('');
  const [place, setPlace] = useState('');
  const [type, setType] = useState<'picture' | 'signature' | 'both'>('picture');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('nida_requests').insert({
      user_id: user?.id,
      mother_name: motherName,
      ward_of_residence: ward,
      district_of_birth: district,
      nida_registration_place: place,
      request_type: type
    });

    setLoading(false);
    if (error) {
      alert('Error submitting request: ' + error.message);
    } else {
      alert('Request submitted successfully!');
      navigate('/');
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white min-h-screen">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-500">
        <ArrowLeft size={20} /> Back
      </button>
      <h2 className="text-2xl font-bold mb-6">Request NIDA Info</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FloatingInput label="Mother's Name" value={motherName} onChange={(e) => setMotherName((e.target as HTMLInputElement).value)} />
        <FloatingInput label="Ward of Residence" value={ward} onChange={(e) => setWard((e.target as HTMLInputElement).value)} />
        <FloatingInput label="District of Birth" value={district} onChange={(e) => setDistrict((e.target as HTMLInputElement).value)} />
        <FloatingInput label="Street/Village of NIDA Registration" value={place} onChange={(e) => setPlace((e.target as HTMLInputElement).value)} />
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Choose what you need</label>
          <div className="flex gap-4">
            <label><input type="radio" value="picture" checked={type === 'picture'} onChange={() => setType('picture')} /> Picture</label>
            <label><input type="radio" value="signature" checked={type === 'signature'} onChange={() => setType('signature')} /> Signature</label>
            <label><input type="radio" value="both" checked={type === 'both'} onChange={() => setType('both')} /> Both</label>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold">
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
};
