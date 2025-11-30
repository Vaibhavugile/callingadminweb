// src/pages/DebugAuth.jsx
import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  getCountFromServer
} from 'firebase/firestore';

/**
 * DebugAuth.jsx
 * - Logs auth.currentUser, env projectId, and attempts tenant/leads reads
 * - Use this even if you haven't got profile; it will show detailed errors
 */

export default function DebugAuth() {
  const [logs, setLogs] = useState([]);
  function push(msg, obj) {
    const out = typeof obj === 'undefined' ? msg : `${msg} ${JSON.stringify(obj)}`;
    setLogs(l => [...l, out]);
    // also console.log for immediate visibility
    if (obj !== undefined) console.log(msg, obj);
    else console.log(msg);
  }

  useEffect(() => {
    (async () => {
      try {
        push('--- DebugAuth start ---');

        // 1) Environment / config check
        try {
          const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '(env missing)';
          push('ENV projectId:', projectId);
        } catch (e) {
          push('ENV read failed', String(e));
        }

        // 2) Auth: current user
        try {
          const user = auth.currentUser;
          push('auth.currentUser (may be null):', user ? { uid: user.uid, email: user.email } : null);
          if (!user) {
            push('No signed-in user found. Please sign in via /login in the app and reload this page.');
            return;
          }
        } catch (e) {
          push('Error reading auth.currentUser', String(e));
        }

        const user = auth.currentUser;
        // 3) Read userProfiles/{uid}
        try {
          push(`Attempting to read userProfiles/${user.uid} ...`);
          const profRef = doc(db, 'userProfiles', user.uid);
          const profSnap = await getDoc(profRef);
          push('userProfiles.exists:', profSnap.exists());
          push('userProfiles.data:', profSnap.exists() ? profSnap.data() : null);
        } catch (e) {
          push('ERROR reading userProfiles', String(e));
        }

        // 4) Read tenants collection
        try {
          push('Attempting to read tenants collection ...');
          const tenantsSnap = await getDocs(collection(db, 'tenants'));
          push('tenants.size:', tenantsSnap.size);
          const ids = tenantsSnap.docs.map(d => d.id);
          push('tenants.ids:', ids);
          if (tenantsSnap.size === 0) {
            push('No tenants found. Is this the correct Firebase project?');
            return;
          }

          // pick first tenant id and read its leads subcollection
          const firstTenantId = tenantsSnap.docs[0].id;
          push('Using first tenant id:', firstTenantId);

          try {
            push(`Attempting to count leads for tenants/${firstTenantId}/leads with getCountFromServer ...`);
            const countSnap = await getCountFromServer(collection(db, `tenants/${firstTenantId}/leads`));
            push('getCountFromServer result:', countSnap?.data());
          } catch (e) {
            push('ERROR getCountFromServer for leads:', String(e));
          }

          try {
            push(`Attempting to list up to 10 documents in tenants/${firstTenantId}/leads ...`);
            const leadsSnap = await getDocs(collection(db, `tenants/${firstTenantId}/leads`));
            push('leads.size:', leadsSnap.size);
            push('leads.ids:', leadsSnap.docs.map(d => d.id));
            if (leadsSnap.size > 0) {
              push('sample lead data (first doc):', leadsSnap.docs[0].data());
            }
          } catch (e) {
            push('ERROR listing leads documents:', String(e));
          }
        } catch (e) {
          push('ERROR reading tenants collection overall:', String(e));
        }

        push('--- DebugAuth finished ---');
      } catch (outer) {
        push('Unexpected debug error', String(outer));
      }
    })();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>DebugAuth — check console and page logs</h2>
      <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', marginTop: 12 }}>
        {logs.map((l, i) => (
          <div key={i} style={{ marginBottom: 8 }}>{l}</div>
        ))}
      </div>
      <div style={{ marginTop: 18, color: '#999' }}>
        - If you see "No signed-in user" sign in with /login and reload.<br/>
        - If you see "permission-denied" in any ERROR lines, Firestore rules are blocking reads.
      </div>
    </div>
  );
}
