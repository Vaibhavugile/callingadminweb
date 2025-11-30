// src/pages/ReportsPage.jsx
import React, { useEffect, useState } from 'react';
import useUserProfile from '../hooks/useUserProfile';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useSearchParams } from 'react-router-dom';

export default function ReportsPage(){
  const { profile } = useUserProfile();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant') || 'all';
  const [report, setReport] = useState(null);

  useEffect(()=>{
    async function load() {
      try {
        if (tenantId === 'all') {
          // naive: collect top-level metrics; adapt to your schema
          const callsSnap = await getDocs(collection(db, 'calls'));
          setReport({ calls: callsSnap.size });
        } else {
          // tenant scoped: read collection tenants/{tenantId}/calls
          const q = collection(db, `tenants/${tenantId}/calls`);
          const snap = await getDocs(q);
          setReport({ calls: snap.size });
        }
      } catch (e) { console.error(e); }
    }
    if (profile?.role === 'admin') load();
  }, [profile, tenantId]);

  if (!profile) return <div>Loading…</div>;
  if (profile.role !== 'admin') return <div className="p-6">Access denied</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-4">Reports — {tenantId}</h1>
      {report ? (
        <div>
          <div>Calls: {report.calls}</div>
        </div>
      ) : <div>Loading report...</div>}
    </div>
  );
}
