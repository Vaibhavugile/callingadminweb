// src/hooks/useLeads.js
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collectionGroup, onSnapshot, query } from "firebase/firestore";

/**
 * useLeads - subscribes to collectionGroup("leads") and collectionGroup("calls")
 * Returns: { leads, loading, error }
 *
 * Each lead object includes .latestCall if any:
 * latestCall: { id, createdAt, createdMs, direction, durationInSeconds, phoneNumber }
 *
 * Implementation notes:
 * - We keep a latestCallsMap keyed by leadId (or lead path fallback) populated from
 *   collectionGroup("calls"). We always pick the call with highest createdMs.
 * - We merge latestCall into the lead objects before returning them.
 */

function toMsFromPossibleTimestamp(v) {
  if (!v) return null;
  if (v.seconds) return v.seconds * 1000 + (v.nanoseconds ? Math.floor(v.nanoseconds / 1000000) : 0);
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  const parsed = Date.parse(String(v));
  return Number.isNaN(parsed) ? null : parsed;
}

export default function useLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // map: leadKey -> latest call object
    // leadKey will be leadId if present, otherwise leadDocPath (parent path)
    const latestCallsMap = new Map();

    // subscribe to calls collectionGroup and track latest per lead
    const callsQ = query(collectionGroup(db, "calls"));
    const unsubCalls = onSnapshot(
      callsQ,
      (snap) => {
        try {
          for (const d of snap.docChanges()) {
            // docChanges may include added/modified/removed
            // We'll recompute map using full snapshot for simplicity
          }

          // For stability we process entire snapshot and rebuild map
          latestCallsMap.clear();
          for (const doc of snap.docs) {
            const data = doc.data() || {};
            // determine leadKey: prefer data.leadId, else extract from path
            let leadKey = data.leadId ?? null;
            if (!leadKey) {
              // path like "tenants/{tenantId}/leads/{leadId}/calls/{callId}"
              const parts = doc.ref.path.split("/");
              // try to find "leads" then next segment is leadId
              for (let i = 0; i < parts.length - 1; i++) {
                if (parts[i] === "leads") {
                  leadKey = parts[i + 1];
                  break;
                }
              }
            }
            if (!leadKey) {
              // fallback to call doc path (unique but leads cannot be keyed)
              leadKey = doc.ref.path;
            }

            const createdRaw = data.createdAt ?? data.created_at ?? null;
            const createdMs = toMsFromPossibleTimestamp(createdRaw) ?? 0;

            // pick fields we need
            const callObj = {
              id: doc.id,
              createdAt: createdRaw,
              createdMs,
              direction: data.direction ?? data.dir ?? null,
              durationInSeconds: Number(data.durationInSeconds ?? data.duration ?? 0),
              phoneNumber: data.phoneNumber ?? data.from ?? null,
              // keep raw data reference if needed
              _raw: data,
              _path: doc.ref.path,
            };

            const prev = latestCallsMap.get(leadKey);
            if (!prev || (callObj.createdMs || 0) > (prev.createdMs || 0)) {
              latestCallsMap.set(leadKey, callObj);
            }
          }

          // After rebuilding latestCallsMap, get current leads snapshot and merge if already loaded
          // But since leads subscription below will set leads and merge again, we just keep map here.
        } catch (e) {
          console.error("useLeads calls snapshot processing error", e);
          setError(e);
        }
      },
      (err) => {
        console.error("useLeads calls onSnapshot error", err);
        setError(err);
      }
    );

    // subscribe to leads collectionGroup
    const leadsQ = query(collectionGroup(db, "leads"));
    const unsubLeads = onSnapshot(
      leadsQ,
      (snap) => {
        try {
          // Build leads array with tenantId extraction and merge latestCall from map
          const arr = snap.docs.map((d) => {
            const docData = d.data() || {};
            // extract tenantId from path
            const pathParts = d.ref.path.split("/");
            let tenantId = null;
            for (let i = 0; i < pathParts.length - 1; i++) {
              if (pathParts[i] === "tenants") {
                tenantId = pathParts[i + 1];
                break;
              }
            }

            // leadKey same logic as calls: leadId (d.id)
            const leadKey = d.id;

            const latestCall = latestCallsMap.get(leadKey) ?? null;

            return {
              id: d.id,
              tenantId,
              data: docData,
              ...docData,
              latestCall,
              _path: d.ref.path,
            };
          });

          // sort by lastSeen fallback (we keep same behavior as before)
          function pickLastSeenMs(leadObj) {
            const d = leadObj.lastSeen ?? leadObj.last_seen ?? leadObj.lastSeenAt ?? null;
            const li = leadObj.lastInteraction ?? leadObj.last_interaction ?? null;
            const lu = leadObj.lastUpdated ?? leadObj.last_updated ?? null;
            const ca = leadObj.createdAt ?? leadObj.created_at ?? null;
            const candidates = [d, li, lu, ca].map(toMsFromPossibleTimestamp).filter(Boolean);
            return candidates.length ? Math.max(...candidates) : 0;
          }

          arr.sort((a, b) => pickLastSeenMs(b) - pickLastSeenMs(a));

          setLeads(arr);
          setLoading(false);
        } catch (e) {
          console.error("useLeads leads snapshot processing error", e);
          setError(e);
          setLoading(false);
        }
      },
      (err) => {
        console.error("useLeads leads onSnapshot error", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubCalls();
      unsubLeads();
    };
  }, []);

  return { leads, loading, error };
}
