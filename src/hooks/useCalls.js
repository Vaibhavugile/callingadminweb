// src/hooks/useCalls.js
import { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import {
  collectionGroup,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
} from "firebase/firestore";

/**
 * useCalls({ pageSize = 200 })
 * - Returns: { calls: Array, loading, error, refetch }
 *
 * Each returned call object will include:
 * {
 *   id, data..., // call doc fields
 *   leadId, tenantId,
 *   lead: { id, ...leadDocData } // may be null if not loaded
 * }
 *
 * IMPORTANT:
 * - Uses collectionGroup('calls') to listen for calls across all tenants
 * - Merges lead doc fields by fetching parent lead doc for each unique lead
 * - Caches lead docs in memory while the hook is mounted to avoid repeated reads
 */
export default function useCalls({ pageSize = 300 } = {}) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // simple in-memory cache for lead docs for duration of hook mount
  const leadCacheRef = useRef(new Map());
  const unsubRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    leadCacheRef.current.clear();

    // query across all calls subcollections sorted by createdAt (descending)
    // NOTE: replace 'createdAt' with your timestamp field name if different (e.g., 'ts')
    const callsGroup = collectionGroup(db, "calls");
    const q = query(callsGroup, orderBy("createdAt", "desc"), limit(pageSize));

    unsubRef.current = onSnapshot(
      q,
      async (snap) => {
        try {
          // build basic call objects and collect unique lead doc refs (path)
          const callItems = [];
          const leadDocRefsToFetch = new Map(); // key -> { leadPath, leadId, tenantId }

          snap.docs.forEach((d) => {
            const callData = d.data() || {};
            // derive leadId and tenantId from doc.ref
            // path is tenants/{tenantId}/leads/{leadId}/calls/{callId}
            const callRef = d.ref;
            const callsColRef = callRef.parent; // calls collection
            const leadDocRef = callsColRef.parent; // lead doc
            const leadsColRef = leadDocRef.parent; // leads collection
            const tenantDocRef = leadsColRef.parent; // tenant doc

            const leadId = leadDocRef.id;
            const tenantId = tenantDocRef ? tenantDocRef.id : null;

            // store for later fetch
            const leadKey = `${tenantId}||${leadId}`;
            if (!leadCacheRef.current.has(leadKey) && !leadDocRefsToFetch.has(leadKey)) {
              leadDocRefsToFetch.set(leadKey, { leadDocRef, leadKey, leadId, tenantId });
            }

            // normalize timestamp fields (support Firestore Timestamp or epoch ms or 'ts')
            let createdAtDate = null;
            if (callData.createdAt) {
              if (callData.createdAt.seconds) createdAtDate = callData.createdAt.toDate();
              else if (typeof callData.createdAt === "number") createdAtDate = new Date(callData.createdAt);
            } else if (callData.ts) {
              if (callData.ts.seconds) createdAtDate = callData.ts.toDate();
              else if (typeof callData.ts === "number") createdAtDate = new Date(callData.ts);
            }

            callItems.push({
              id: d.id,
              _ref: d.ref,
              data: callData,
              createdAt: createdAtDate,
              leadId,
              tenantId,
              lead: null, // to be filled after fetching lead docs
            });
          });

          // fetch all missing lead docs in parallel (but only once per unique lead)
          const leadFetches = [];
          for (const [leadKey, info] of leadDocRefsToFetch.entries()) {
            // getDoc(info.leadDocRef) -> returns a Promise
            leadFetches.push(
              (async () => {
                try {
                  const snap = await getDoc(info.leadDocRef);
                  if (snap.exists()) {
                    const data = snap.data();
                    // normalize epoch ms fields if mobile stores them as numbers
                    const normalized = { id: snap.id, ...data };
                    // convert lastInteraction if numeric epoch ms
                    if (normalized.lastInteraction && typeof normalized.lastInteraction === "number") {
                      normalized.lastInteractionDate = new Date(normalized.lastInteraction);
                    } else if (normalized.lastInteraction && normalized.lastInteraction.seconds) {
                      normalized.lastInteractionDate = normalized.lastInteraction.toDate();
                    } else {
                      normalized.lastInteractionDate = null;
                    }

                    leadCacheRef.current.set(leadKey, normalized);
                  } else {
                    // store a placeholder so we don't refetch repeatedly
                    leadCacheRef.current.set(leadKey, { id: info.leadId, _missing: true });
                  }
                } catch (err) {
                  // record placeholder to avoid infinite retries
                  leadCacheRef.current.set(leadKey, { id: info.leadId, _error: true });
                  console.error("Error fetching lead doc", info.leadId, err);
                }
              })()
            );
          }

          // wait for all lead fetches
          await Promise.all(leadFetches);

          // now attach lead docs to call items
          const callsWithLead = callItems.map((c) => {
            const leadKey = `${c.tenantId}||${c.leadId}`;
            const leadDoc = leadCacheRef.current.get(leadKey) || null;
            return { ...c, lead: leadDoc };
          });

          setCalls(callsWithLead);
          setLoading(false);
        } catch (err) {
          console.error("useCalls snapshot handling error:", err);
          setError(err);
          setLoading(false);
        }
      },
      (err) => {
        console.error("useCalls onSnapshot error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [pageSize]);

  const refetch = () => {
    // simple refetch: cancel, clear cache and re-run effect by toggling state is more work.
    // For now we just clear cache and leave the snapshot to update automatically.
    leadCacheRef.current.clear();
  };

  return { calls, loading, error, refetch };
}
