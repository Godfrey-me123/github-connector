import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

export const NidaRequestsAdminPanel: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data } = await supabase.from('nida_requests').select('*');
    if (data) setRequests(data);
  };

  const handleUpload = async (id: string, file: File, type: 'picture' | 'signature') => {
    const { data } = await supabase.storage.from('nida_files').upload(`${id}/${type}`, file);
    if (data) {
      await supabase.from('nida_requests').update({ [`${type}_url`]: data.path }).eq('id', id);
      fetchRequests();
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">NIDA Requests</h2>
      <table className="w-full">
        <thead>
          <tr>
            <th>User</th>
            <th>Type</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(req => (
            <tr key={req.id}>
              <td>{req.user_id}</td>
              <td>{req.request_type}</td>
              <td>{req.status}</td>
              <td>
                <input type="file" onChange={(e) => e.target.files && handleUpload(req.id, e.target.files[0], 'picture')} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
