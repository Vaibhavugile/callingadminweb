// src/hooks/useLeads.js
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collectionGroup, onSnapshot, query } from "firebase/firestore";

/**
 * useLeads - subscribes to collectionGroup("leads") and collectionGroup("calls")
 * Returns: { leads, loading, error }
 *
 * Each lead object includes .latestCall if any:
 * latestCall: { id, createdAt, createdMs, direction, durationInSeconds, phoneNumber, _raw, _path }
 *
 * Implementation notes:
 * - We keep a latestCallsMap keyed by **tenantId + "__" + leadId**.
 * - This avoids mixing calls for the same leadId across different tenants,
 *   which can happen because lead IDs are deterministic from phone only.
 */

function toMsFromPossibleTimestamp(v) {
  if (!v) return null;
  if (v.seconds) {
    return (
      v.seconds * 1000 +
      (v.nanoseconds ? Math.floor(v.nanoseconds / 1000000) : 0)
    );
  }
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

    // map: tenantId__leadId -> latest call object
    const latestCallsMap = new Map();

    // ---------------- SUBSCRIBE TO CALLS ----------------
    const callsQ = query(collectionGroup(db, "calls"));
    const unsubCalls = onSnapshot(
      callsQ,
      (snap) => {
        try {
          // For stability we process entire snapshot and rebuild map
          latestCallsMap.clear();

          for (const doc of snap.docs) {
            const data = doc.data() || {};

            // Extract tenantId and leadId from the path:
            // "tenants/{tenantId}/leads/{leadId}/calls/{callId}"
            const parts = doc.ref.path.split("/");
            let tenantIdFromPath = null;
            let leadIdFromPath = null;

            for (let i = 0; i < parts.length - 1; i++) {
              if (parts[i] === "tenants") {
                tenantIdFromPath = parts[i + 1];
              }
              if (parts[i] === "leads") {
                leadIdFromPath = parts[i + 1];
              }
            }

            // Prefer explicit leadId field but still keep tenantId in key
            let leadId = data.leadId || leadIdFromPath || null;
            const tenantId = tenantIdFromPath || data.tenantId || null;

            if (!leadId) {
              // As a last resort, skip: we cannot safely map this call
              // to a lead across tenants.
              continue;
            }

            // 🔑 tenant-scoped key (fixes cross-tenant mixing)
            const leadKey = tenantId ? `${tenantId}__${leadId}` : leadId;

            const createdRaw = data.createdAt ?? data.created_at ?? null;
            const createdMs = toMsFromPossibleTimestamp(createdRaw) ?? 0;

            const callObj = {
              id: doc.id,
              createdAt: createdRaw,
              createdMs,
              direction: data.direction ?? data.dir ?? null,
              durationInSeconds: Number(
                data.durationInSeconds ?? data.duration ?? 0
              ),
              phoneNumber: data.phoneNumber ?? data.from ?? null,
              tenantId,
              leadId,
              // keep raw data reference if needed
              _raw: data,
              _path: doc.ref.path,
            };

            const prev = latestCallsMap.get(leadKey);
            if (!prev || (callObj.createdMs || 0) > (prev.createdMs || 0)) {
              latestCallsMap.set(leadKey, callObj);
            }
          }
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

    // ---------------- SUBSCRIBE TO LEADS ----------------
    const leadsQ = query(collectionGroup(db, "leads"));
    const unsubLeads = onSnapshot(
      leadsQ,
      (snap) => {
        try {
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

            // 👇 key must match what we used in the calls snapshot
            const leadId = d.id;
            const leadKey = tenantId ? `${tenantId}__${leadId}` : leadId;

            const latestCall = latestCallsMap.get(leadKey) ?? null;

            return {
              id: leadId,
              tenantId,
              data: docData,
              ...docData,
              latestCall,
              _path: d.ref.path,
            };
          });

          // sort by lastSeen-ish fields (same as before)
          function pickLastSeenMs(leadObj) {
            const dVal =
              leadObj.lastSeen ??
              leadObj.last_seen ??
              leadObj.lastSeenAt ??
              null;
            const li = leadObj.lastInteraction ?? leadObj.last_interaction ?? null;
            const lu = leadObj.lastUpdated ?? leadObj.last_updated ?? null;
            const ca = leadObj.createdAt ?? leadObj.created_at ?? null;
            const candidates = [dVal, li, lu, ca]
              .map(toMsFromPossibleTimestamp)
              .filter(Boolean);
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
