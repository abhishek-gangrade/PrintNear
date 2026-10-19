import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function QueueTrackerBadge({ orderId }) {
  const [queueData, setQueueData] = useState(null);
  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/orders/${orderId}/queue-status`, { headers: { Authorization: `Bearer ${token}` } });
        if (mounted) setQueueData(res.data);
      } catch {}
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 15000);
    return () => { mounted = false; clearInterval(timer); };
  }, [orderId]);

  if (!queueData || !['Pending', 'Printing'].includes(queueData.status)) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between text-xs my-2">
      <div>
        <p className="font-bold text-amber-900">Queue Position: #{queueData.queuePosition} of {queueData.totalActiveInQueue}</p>
        <p className="text-[10px] text-amber-700">{queueData.totalPagesAhead} pages ahead</p>
      </div>
      <div className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-center font-bold">
        <p className="text-[9px] uppercase">Est. Pickup</p><p>~{queueData.estimatedMinutes} mins</p>
      </div>
    </div>
  );
}
