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
 * Helper: consistent logic for "missed" / "rejected" filters
 *
 * Usage:
 *   import useCalls, { matchCallFilter } from "../hooks/useCalls";
 *   ...
 *   const filtered = calls.filter(c => matchCallFilter(c.data, activeFilter));
 */
export function matchCallFilter(callData = {}, filter) {
  if (!filter || filter.toLowerCase() === "all") return true;

  const dir = (callData.direction || "").toLowerCase();
  const dur = Number(callData.durationInSeconds || 0);
  const finalOutcome = (callData.finalOutcome || "").toLowerCase();

  // MISSED: inbound + 0 sec OR finalOutcome === "missed"
  if (
    filter.toLowerCase() === "missed" &&
    !((dir.includes("in") && dur === 0) || finalOutcome === "missed")
  ) {
    return false;
  }

  // REJECTED: outbound + 0 sec OR finalOutcome === "rejected"
  if (
    filter.toLowerCase() === "rejected" &&
    !((dir.includes("out") && dur === 0) || finalOutcome === "rejected")
  ) {
    return false;
  }

  return true;
}

/**
 * useCalls({ pageSize = 300, allowedTenantIds })
 * - Returns: { calls, loading, error, refetch }
 *
 * Each returned call object:
 * {
 *   id,
 *   data,        // call doc fields
 *   createdAt,   // JS Date (normalized from createdAt/ts)
 *   leadId,
 *   tenantId,
 *   lead,        // { id, ...leadDocData } or null
 * }
 *
 * IMPORTANT:
 * - Uses collectionGroup('calls') across all tenants.
 * - If allowedTenantIds is a non-empty array, only calls whose parent
 *   tenantId is in that list are kept.
 */
export default function useCalls({ pageSize = 300, allowedTenantIds = null } = {}) {
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
    // path: tenants/{tenantId}/leads/{leadId}/calls/{callId}
    const callsGroup = collectionGroup(db, "calls");
    const q = query(callsGroup, orderBy("createdAt", "desc"), limit(pageSize));

    unsubRef.current = onSnapshot(
      q,
      async (snap) => {
        try {
          // build basic call objects and collect unique lead doc refs (path)
          const callItems = [];
          const leadDocRefsToFetch = new Map(); // key -> { leadDocRef, leadKey, leadId, tenantId }

          snap.docs.forEach((d) => {
            const callData = d.data() || {};

            // derive leadId and tenantId from doc.ref
            // tenants/{tenantId}/leads/{leadId}/calls/{callId}
            const callRef = d.ref;
            const callsColRef = callRef.parent; // calls collection
            const leadDocRef = callsColRef.parent; // lead doc
            const leadsColRef = leadDocRef.parent; // leads collection
            const tenantDocRef = leadsColRef.parent; // tenant doc

            const leadId = leadDocRef.id;
            const tenantId = tenantDocRef ? tenantDocRef.id : null;

            // 🔒 Restrict by allowedTenantIds if provided
            if (Array.isArray(allowedTenantIds) && allowedTenantIds.length > 0) {
              if (!tenantId || !allowedTenantIds.includes(tenantId)) {
                return; // skip this call
              }
            }

            // store for later fetch
            const leadKey = `${tenantId}||${leadId}`;
            if (
              !leadCacheRef.current.has(leadKey) &&
              !leadDocRefsToFetch.has(leadKey)
            ) {
              leadDocRefsToFetch.set(leadKey, {
                leadDocRef,
                leadKey,
                leadId,
                tenantId,
              });
            }

            // normalize timestamp fields (support Firestore Timestamp or epoch ms or 'ts')
            let createdAtDate = null;
            if (callData.createdAt) {
              if (callData.createdAt.seconds)
                createdAtDate = callData.createdAt.toDate();
              else if (typeof callData.createdAt === "number")
                createdAtDate = new Date(callData.createdAt);
            } else if (callData.ts) {
              if (callData.ts.seconds) createdAtDate = callData.ts.toDate();
              else if (typeof callData.ts === "number")
                createdAtDate = new Date(callData.ts);
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
            leadFetches.push(
              (async () => {
                try {
                  const snap = await getDoc(info.leadDocRef);
                  if (snap.exists()) {
                    const data = snap.data();
                    const normalized = { id: snap.id, ...data };

                    // normalize lastInteraction -> lastInteractionDate
                    if (
                      normalized.lastInteraction &&
                      typeof normalized.lastInteraction === "number"
                    ) {
                      normalized.lastInteractionDate = new Date(
                        normalized.lastInteraction
                      );
                    } else if (
                      normalized.lastInteraction &&
                      normalized.lastInteraction.seconds
                    ) {
                      normalized.lastInteractionDate =
                        normalized.lastInteraction.toDate();
                    } else {
                      normalized.lastInteractionDate = null;
                    }

                    leadCacheRef.current.set(leadKey, normalized);
                  } else {
                    // placeholder to avoid re-fetch loops
                    leadCacheRef.current.set(leadKey, {
                      id: info.leadId,
                      _missing: true,
                    });
                  }
                } catch (err) {
                  leadCacheRef.current.set(leadKey, {
                    id: info.leadId,
                    _error: true,
                  });
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
  }, [pageSize, allowedTenantIds]);

  const refetch = () => {
    // For now we just clear cache; live snapshot will bring new data
    leadCacheRef.current.clear();
  };

  return { calls, loading, error, refetch };
}
