// src/pages/Leads.jsx
import React, { useState, useMemo, useEffect } from "react";
import useUserProfile from "../hooks/useUserProfile";
import useLeads from "../hooks/useLeads";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import "./Leads.css";

/* ================= Helpers ================= */

const toMsFromPossibleTimestamp = (v) => {
  if (!v) return null;
  if (v.seconds)
    return (
      v.seconds * 1000 +
      (v.nanoseconds ? Math.floor(v.nanoseconds / 1000000) : 0)
    );
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  const parsed = Date.parse(String(v));
  return Number.isNaN(parsed) ? null : parsed;
};

const fmtIso = (ts) => {
  if (!ts) return "";
  if (ts.seconds) return new Date(ts.seconds * 1000).toISOString();
  if (typeof ts === "number")
    return new Date(ts > 1e12 ? ts : ts * 1000).toISOString();
  if (ts instanceof Date) return ts.toISOString();
  const parsed = Date.parse(String(ts));
  return Number.isNaN(parsed) ? String(ts) : new Date(parsed).toISOString();
};

const fmtLocal = (ts) => {
  if (!ts) return "";
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  if (typeof ts === "number")
    return new Date(ts > 1e12 ? ts : ts * 1000).toLocaleString();
  if (ts instanceof Date) return ts.toLocaleString();
  const parsed = Date.parse(String(ts));
  return Number.isNaN(parsed) ? String(ts) : new Date(parsed).toLocaleString();
};

const fmtDateOnly = (ts) => {
  if (!ts) return "";
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString();
  if (typeof ts === "number")
    return new Date(ts > 1e12 ? ts : ts * 1000).toLocaleDateString();
  if (ts instanceof Date) return ts.toLocaleDateString();
  const parsed = Date.parse(String(ts));
  return Number.isNaN(parsed)
    ? String(ts)
    : new Date(parsed).toLocaleDateString();
};

const fmtDuration = (sec) => {
  const s = Number(sec) || 0;
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}h ${m}m ${r}s` : `${m}m ${r}s`;
};

const compactDirection = (raw) => {
  if (!raw) return "";
  const d = String(raw).toLowerCase();
  if (d.includes("in")) return "IN";
  if (d.includes("out")) return "OUT";
  return String(raw).toUpperCase();
};
const latestCallStatus = (direction, durationSeconds) => {
  const d = String(direction || "").toLowerCase();
  const dur = Number(durationSeconds || 0);
  if (d.includes("in") && dur === 0) return "missed";
  if (d.includes("out") && dur === 0) return "rejected";
  if (d) return "answered";
  return "none";
};

/* CSV helpers */
function escapeCsvCell(value) {
  if (value === null || typeof value === "undefined") return "";
  const s = String(value);
  if (
    s.includes('"') ||
    s.includes(",") ||
    s.includes("\n") ||
    s.includes("\r")
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function leadsToCsvRows(preparedArray) {
  const header = [
    "tenantId",
    "leadId",
    "name",
    "phoneNumber",
    "status",
    "address",
    "eventDate_ISO",
    "eventDate_local",
    "lastSeen_ISO",
    "lastSeen_local",
    "nextFollowUp_ISO",
    "nextFollowUp_local",
    "requirements",
    "notes_preview",
    "lastHandledByUserId",
    "lastHandledByUserName",
    // latest call fields
    "latestCallId",
    "latestCallCreatedAt_ISO",
    "latestCallCreatedAt_local",
    "latestCallDirection",
    "latestCallDurationSeconds",
    "latestCallDurationDisplay",
    "latestCallStatus",
  ];
  const rows = [header.join(",")];

  for (const p of preparedArray) {
    const flat = p.flat;
    const latest = p.latestCallDerived;

    const row = [
      flat.tenantId || "",
      flat.id || "",
      flat.name || "",
      flat.phoneNumber || "",
      flat.status || "",
      flat.address || "",
      flat.eventDate ? fmtIso(flat.eventDate) : "",
      flat.eventDate ? fmtLocal(flat.eventDate) : "",
      flat.lastSeen ? fmtIso(flat.lastSeen) : "",
      flat.lastSeen ? fmtLocal(flat.lastSeen) : "",
      flat.nextFollowUp ? fmtIso(flat.nextFollowUp) : "",
      flat.nextFollowUp ? fmtLocal(flat.nextFollowUp) : "",
      flat.requirements || "",
      flat.notesText
        ? flat.notesText.length > 200
          ? flat.notesText.slice(0, 200) + "…"
          : flat.notesText
        : "",
      flat.lastHandledByUserId || "",
      flat.lastHandledByUserName || "",
      latest ? latest.id || "" : "",
      latest ? fmtIso(latest.createdAt) || "" : "",
      latest ? fmtLocal(latest.createdAt) || "" : "",
      latest ? latest.direction || "" : "",
      latest ? String(latest.durationInSeconds || 0) : "",
      latest ? fmtDuration(latest.durationInSeconds || 0) || "" : "",
      latest ? latest.status || "" : "",
    ].map(escapeCsvCell);

    rows.push(row.join(","));
  }

  return rows.join("\r\n");
}

function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ================ Arrow icons (reused) ================ */
function ArrowInIcon() {
  return (
    <svg
      className="arrow-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
    >
      <path
        d="M20 12H6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 16L6 12L10 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ArrowOutIcon() {
  return (
    <svg
      className="arrow-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
    >
      <path
        d="M4 12H18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 8L18 12L14 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ================= Main Component ================= */

export default function LeadsPage() {
  // top-level hooks
  const { profile } = useUserProfile();

  // ---------------------------
  // Single-tenant + legacy multi-tenant
  // ---------------------------
  const connectedTenantIds = useMemo(() => {
    // ✅ New mode: single tenant on profile
    if (profile?.tenantId) {
      return [profile.tenantId];
    }

    // 🔁 Legacy fallback: connectedTenants array
    if (!profile || !Array.isArray(profile.connectedTenants)) return [];

    const ids = profile.connectedTenants
      .map((t) => {
        if (typeof t === "string") return t;
        if (t && typeof t === "object") {
          return t.id || t.tenantId || t.tenant || null;
        }
        return null;
      })
      .filter(Boolean);
    return ids;
  }, [profile]);

  const hasConnectedTenants =
    Array.isArray(connectedTenantIds) && connectedTenantIds.length > 0;

  // useLeads restricted to allowed tenant(s).
  const { leads, loading, error } = useLeads({
    allowedTenantIds: hasConnectedTenants ? connectedTenantIds : [],
  });

  // tenants for dropdown (for label; still filtered by connectedTenantIds)
  const [tenants, setTenants] = useState([]);
  useEffect(() => {
    const colRef = collection(db, "tenants");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTenants(arr);
      },
      (err) => {
        console.error("tenants onSnapshot error", err);
      }
    );
    return () => unsub();
  }, []);

  // UI state
  const [q, setQ] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [callStatusFilter, setCallStatusFilter] = useState("all");
  const [handlerFilter, setHandlerFilter] = useState("all"); // 🔹 NEW: filter by user
  const [expandedId, setExpandedId] = useState(null);
  const [showOnlyWithCall, setShowOnlyWithCall] = useState("any");
  const [dateField, setDateField] = useState("none");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // prepared leads (haystack + derived latest call)
  const prepared = useMemo(() => {
    return leads.map((l) => {
      const flat = {
        tenantId: l.tenantId ?? l.data?.tenantId ?? "",
        id: l.id ?? "",
        name: l.name ?? l.data?.name ?? "",
        phoneNumber:
          l.phoneNumber ?? l.phone ?? l.data?.phoneNumber ?? "",
        address: l.address ?? l.data?.address ?? "",
        notesText: Array.isArray(l.notes)
          ? l.notes
              .map((n) => n.text || n.note || "")
              .join(" ")
          : typeof l.notes === "string"
          ? l.notes
          : l.data?.notes
          ? JSON.stringify(l.data.notes)
          : "",
        status: l.status ?? l.data?.status ?? "",
        eventDate: l.eventDate ?? l.data?.eventDate ?? null,
        nextFollowUp: l.nextFollowUp ?? l.data?.nextFollowUp ?? null,
        requirements: l.requirements ?? l.data?.requirements ?? "",
        lastSeen: l.lastSeen ?? l.data?.lastSeen ?? null,
        lastInteraction:
          l.lastInteraction ?? l.data?.lastInteraction ?? null,
        latestCall: l.latestCall ?? null,
        lastHandledByUserId:
          l.lastHandledByUserId ?? l.data?.lastHandledByUserId ?? "",
        lastHandledByUserName:
          l.lastHandledByUserName ??
          l.data?.lastHandledByUserName ??
          "",
      };

      const haystack = [
        flat.tenantId,
        flat.id,
        flat.name,
        flat.phoneNumber,
        flat.address,
        flat.notesText,
        flat.status,
        flat.requirements,
        flat.lastHandledByUserId,
        flat.lastHandledByUserName,
        flat.lastSeen ? String(flat.lastSeen) : "",
        flat.lastInteraction ? String(flat.lastInteraction) : "",
        flat.latestCall
          ? `${flat.latestCall.direction || ""} ${
              flat.latestCall.durationInSeconds || ""
            } ${flat.latestCall.phoneNumber || ""} ${
              flat.latestCall.id || ""
            }`
          : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      let latestCallDerived = null;
      if (flat.latestCall) {
        const lc = flat.latestCall;
        latestCallDerived = {
          id: lc.id || "",
          createdAt: lc.createdAt ?? lc._raw?.createdAt ?? null,
          createdMs: lc.createdMs ?? null,
          direction:
            lc.direction ?? lc._raw?.direction ?? lc._raw?.dir ?? "",
          durationInSeconds: Number(
            lc.durationInSeconds ??
              lc._raw?.durationInSeconds ??
              lc._raw?.duration ??
              0
          ),
          phoneNumber:
            lc.phoneNumber ??
            lc._raw?.phoneNumber ??
            lc._raw?.from ??
            "",
        };
        latestCallDerived.status = latestCallStatus(
          latestCallDerived.direction,
          latestCallDerived.durationInSeconds
        );
      }

      return { raw: l, flat, haystack, latestCallDerived };
    });
  }, [leads]);

  // 🔹 NEW: list of unique handler names for dropdown
  const handlerOptions = useMemo(() => {
    const s = new Set();
    prepared.forEach((p) => {
      const n = (p.flat.lastHandledByUserName || "").trim();
      if (n) s.add(n);
    });
    return Array.from(s).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [prepared]);

  // date range parsing
  const dateRangeMs = useMemo(() => {
    const s = startDate ? Date.parse(startDate + "T00:00:00") : null;
    const e = endDate
      ? Date.parse(endDate + "T23:59:59.999")
      : null;
    return {
      startMs: Number.isNaN(s) ? null : s,
      endMs: Number.isNaN(e) ? null : e,
    };
  }, [startDate, endDate]);

  // filtered
  const filtered = useMemo(() => {
    const s = (q || "").trim().toLowerCase();
    return prepared.filter((p) => {
      const flat = p.flat;
      const latest = p.latestCallDerived;

      // tenant filter (UI)
      if (tenantFilter !== "all" && flat.tenantId !== tenantFilter)
        return false;

      // safe: only show leads from connected tenants
      if (
        Array.isArray(connectedTenantIds) &&
        connectedTenantIds.length > 0 &&
        !connectedTenantIds.includes(flat.tenantId)
      ) {
        return false;
      }

      // 🔹 filter by user (Handled by)
      if (
        handlerFilter !== "all" &&
        (flat.lastHandledByUserName || "").trim() !== handlerFilter
      ) {
        return false;
      }

      if (showOnlyWithCall === "withCall" && !latest) return false;
      if (showOnlyWithCall === "withoutCall" && latest) return false;

      if (callStatusFilter !== "all") {
        const st = latest ? latest.status : "none";
        if (st !== callStatusFilter) return false;
      }

      if (
        dateField !== "none" &&
        (dateRangeMs.startMs !== null ||
          dateRangeMs.endMs !== null)
      ) {
        let rawVal = null;
        if (dateField === "lastSeen") rawVal = flat.lastSeen;
        else if (dateField === "eventDate") rawVal = flat.eventDate;
        else if (dateField === "nextFollowUp")
          rawVal = flat.nextFollowUp;

        const ms = toMsFromPossibleTimestamp(rawVal);
        if (
          dateRangeMs.startMs !== null &&
          (ms === null || ms < dateRangeMs.startMs)
        )
          return false;
        if (
          dateRangeMs.endMs !== null &&
          (ms === null || ms > dateRangeMs.endMs)
        )
          return false;
      }

      if (!s) return true;
      return p.haystack.includes(s);
    });
  }, [
    prepared,
    q,
    tenantFilter,
    callStatusFilter,
    handlerFilter,
    showOnlyWithCall,
    dateField,
    dateRangeMs,
    connectedTenantIds,
  ]);

  // security
  if (!profile) return <div className="p-6">Loading profile…</div>;
  if (profile.role !== "admin")
    return <div className="p-6">Access denied</div>;

  // ⛔ If admin has NO connected tenants, show message & nothing else
  if (!hasConnectedTenants) {
    return (
      <div className="p-6">
        <h2 className="leads-title">Leads — with latest call</h2>
        <p style={{ marginTop: 8 }}>
          No tenants connected to your admin profile. Connect one or more
          tenants (or set <code>tenantId</code>) to see leads here.
        </p>
      </div>
    );
  }

  const toggle = (id) =>
    setExpandedId((cur) => (cur === id ? null : id));
  const resetFilters = () => {
    setQ("");
    setTenantFilter("all");
    setCallStatusFilter("all");
    setHandlerFilter("all");
    setShowOnlyWithCall("any");
    setDateField("none");
    setStartDate("");
    setEndDate("");
  };

  // --------------- CSV Export ---------------
  const exportCsv = () => {
    try {
      const csvText = leadsToCsvRows(filtered);
      const now = new Date();
      const fnTimestamp = now.toISOString().replace(/[:.]/g, "-");
      const filename = `leads-export-${fnTimestamp}.csv`;
      downloadCsv(filename, csvText);
    } catch (err) {
      console.error("Leads CSV export failed", err);
      alert("Failed to export CSV — check console for details.");
    }
  };

  return (
    <div className="leads-page">
      <div className="leads-inner">
        <div className="leads-header">
          <div>
            <div className="leads-title">Leads — with latest call</div>
            <div className="leads-sub">
              You can export the visible rows to CSV (includes latest call +
              handled-by fields).
            </div>
            {error && (
              <div className="leads-error">
                Error loading leads: {String(error)}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div className="search-wrap" style={{ minWidth: 320 }}>
              <input
                className="search-input"
                placeholder="Search name, tenantId, id, phone, address, notes, handled by, latest call..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
            >
              <option value="all">All tenants</option>
              {tenants
                .filter((t) => {
                  if (
                    !Array.isArray(connectedTenantIds) ||
                    connectedTenantIds.length === 0
                  ) {
                    return true;
                  }
                  return connectedTenantIds.includes(t.id);
                })
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id}
                  </option>
                ))}
            </select>

            <select
              className="filter-select"
              value={callStatusFilter}
              onChange={(e) => setCallStatusFilter(e.target.value)}
            >
              <option value="all">All calls</option>
              <option value="missed">Missed</option>
              <option value="rejected">Rejected</option>
              <option value="answered">Answered</option>
              <option value="none">No call</option>
            </select>

            {/* 🔹 NEW: filter by handled-by user */}
            <select
              className="filter-select"
              value={handlerFilter}
              onChange={(e) => setHandlerFilter(e.target.value)}
            >
              <option value="all">All users</option>
              {handlerOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={showOnlyWithCall}
              onChange={(e) => setShowOnlyWithCall(e.target.value)}
            >
              <option value="any">Any</option>
              <option value="withCall">With call</option>
              <option value="withoutCall">Without call</option>
            </select>

            <select
              className="filter-select"
              value={dateField}
              onChange={(e) => setDateField(e.target.value)}
            >
              <option value="none">No date filter</option>
              <option value="lastSeen">Filter by Last seen</option>
              <option value="eventDate">Filter by Event date</option>
              <option value="nextFollowUp">
                Filter by Next follow-up
              </option>
            </select>

            {dateField !== "none" && (
              <div
                className="date-pickers"
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <input
                  className="date-input"
                  type="date"
                  value={startDate}
                  onChange={(e) =>
                    setStartDate(e.target.value)
                  }
                />
                <span className="date-sep">—</span>
                <input
                  className="date-input"
                  type="date"
                  value={endDate}
                  onChange={(e) =>
                    setEndDate(e.target.value)
                  }
                />
              </div>
            )}

            <button
              className="reset-btn"
              onClick={resetFilters}
            >
              Reset
            </button>

            <button
              className="export-btn"
              onClick={exportCsv}
              title="Export visible leads to CSV"
            >
              Export CSV
            </button>

            <div className="meta-pill">
              {loading ? "Loading…" : `${filtered.length} leads`}
            </div>
          </div>
        </div>

        <div className="leads-list">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div className="lead-card skeleton" key={i}>
                <div className="lead-left">
                  <div className="lead-avatar shimmer" />
                  <div style={{ width: "220px" }}>
                    <div
                      className="shimmer-line"
                      style={{ width: 160 }}
                    />
                    <div
                      className="shimmer-line"
                      style={{ width: 120 }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="leads-empty">No leads found.</div>
          ) : (
            filtered.map((p) => {
              const l = p.raw;
              const flat = p.flat;
              const latest = p.latestCallDerived;

              const name = flat.name || "—";
              const phone = flat.phoneNumber || "—";
              const tenantId = flat.tenantId || "—";
              const leadId = flat.id || "—";
              const lastSeen = flat.lastSeen;
              const address = flat.address || "—";
              const notesPreview = flat.notesText
                ? flat.notesText.length > 160
                  ? `${flat.notesText.slice(0, 160)}…`
                  : flat.notesText
                : "—";

              const handlerName = flat.lastHandledByUserName || "—";

              const lcStatus = latest ? latest.status : "none";
              const lcDirCompact = latest
                ? compactDirection(latest.direction)
                : "—";
              const lcDur = latest ? latest.durationInSeconds : 0;
              const lcCreated = latest ? latest.createdAt : null;

              return (
                <article
                  key={`${tenantId}-${leadId}`}
                  className="lead-card"
                  onClick={() => toggle(l.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") toggle(l.id);
                  }}
                >
                  <div className="lead-left">
                    <div className="lead-avatar">
                      {String(name || phone || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="lead-info-compact">
                      <div className="lead-row-top">
                        <div className="lead-name">{name}</div>
                        <div className="lead-phone muted-small">
                          {phone}
                        </div>
                      </div>

                      <div className="lead-row-sub">
                        <div className="lead-lastseen">
                          Last seen:{" "}
                          <span className="muted-strong">
                            {lastSeen
                              ? fmtLocal(lastSeen)
                              : "—"}
                          </span>
                        </div>
                        <div className="lead-id-small">
                          ID:{" "}
                          <span className="muted-strong mono">
                            {leadId}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lead-mid-grid">
                    <div className="mid-item">
                      <div className="mid-label">Status</div>
                      <div className="mid-value">
                        <span
                          className={`status-pill ${String(
                            flat.status || ""
                          ).toLowerCase()}`}
                        >
                          {(
                            flat.status || "—"
                          ).toString().toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="mid-item">
                      <div className="mid-label">Tenant</div>
                      <div className="mid-value muted-strong">
                        {tenantId}
                      </div>
                    </div>

                    <div className="mid-item">
                      <div className="mid-label">Address</div>
                      <div className="mid-value">{address}</div>
                    </div>

                    <div className="mid-item">
                      <div className="mid-label">Event Date</div>
                      <div className="mid-value">
                        {fmtDateOnly(flat.eventDate)}
                      </div>
                    </div>

                    <div className="mid-item">
                      <div className="mid-label">
                        Next follow-up
                      </div>
                      <div className="mid-value">
                        {fmtDateOnly(flat.nextFollowUp)}
                      </div>
                    </div>

                    <div className="mid-item">
                      <div className="mid-label">Handled by</div>
                      <div className="mid-value">
                        {handlerName}
                      </div>
                    </div>

                    <div className="mid-item">
                      <div className="mid-label">Requirements</div>
                      <div className="mid-value">
                        {flat.requirements || "—"}
                      </div>
                    </div>

                    <div
                      className="mid-item notes-item"
                      style={{ gridColumn: "1 / -1" }}
                    >
                      <div className="mid-label">Notes</div>
                      <div className="mid-value notes-preview">
                        {notesPreview}
                      </div>
                    </div>
                  </div>

                  <div className="lead-right">
                    <div>
                      <div
                        className="mid-label"
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                        }}
                      >
                        Last call
                      </div>

                      {latest ? (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            justifyContent: "flex-end",
                          }}
                        >
                          <span
                            className={`dir-pill ${
                              lcDirCompact === "IN"
                                ? "in"
                                : lcDirCompact === "OUT"
                                ? "out"
                                : ""
                            }`}
                            style={{
                              padding: "6px 10px",
                            }}
                          >
                            {lcDirCompact === "IN" ? (
                              <ArrowInIcon />
                            ) : lcDirCompact === "OUT" ? (
                              <ArrowOutIcon />
                            ) : null}
                            <span
                              style={{
                                marginLeft: 8,
                                fontWeight: 800,
                              }}
                            >
                              {lcDirCompact}
                            </span>
                          </span>

                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 700 }}>
                              {fmtDuration(lcDur)}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--muted)",
                              }}
                            >
                              {lcCreated
                                ? fmtLocal(lcCreated)
                                : "—"}
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <span
                                className={`call-status-pill ${lcStatus}`}
                              >
                                {lcStatus === "missed"
                                  ? "Missed"
                                  : lcStatus === "rejected"
                                  ? "Rejected"
                                  : lcStatus === "answered"
                                  ? "Answered"
                                  : "No call"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: "var(--muted)" }}>
                          No calls
                        </div>
                      )}
                    </div>

                    <div>
                      Handled by:{" "}
                      <span className="muted-strong">
                        {handlerName}
                      </span>
                    </div>
                    <div>
                      Tenant:{" "}
                      <span className="muted-strong">{tenantId}</span>
                    </div>
                    <div>
                      ID:{" "}
                      <span className="muted-strong mono">
                        {leadId}
                      </span>
                    </div>
                  </div>

                  {expandedId === l.id ? (
                    <div className="lead-expanded">
                      <div className="expanded-grid">
                        <div>
                          <div className="expanded-label">Name</div>
                          <div className="expanded-value">
                            {name}
                          </div>
                        </div>
                        <div>
                          <div className="expanded-label">
                            Phone
                          </div>
                          <div className="expanded-value">
                            {phone}
                          </div>
                        </div>

                        <div>
                          <div className="expanded-label">
                            Last seen (full)
                          </div>
                          <div className="expanded-value">
                            {flat.lastSeen
                              ? fmtLocal(flat.lastSeen)
                              : "—"}
                          </div>
                        </div>

                        <div>
                          <div className="expanded-label">
                            Event date
                          </div>
                          <div className="expanded-value">
                            {flat.eventDate
                              ? fmtLocal(flat.eventDate)
                              : "—"}
                          </div>
                        </div>

                        <div>
                          <div className="expanded-label">
                            Next follow-up
                          </div>
                          <div className="expanded-value">
                            {flat.nextFollowUp
                              ? fmtLocal(flat.nextFollowUp)
                              : "—"}
                          </div>
                        </div>

                        <div>
                          <div className="expanded-label">
                            Requirements
                          </div>
                          <div className="expanded-value">
                            {flat.requirements || "—"}
                          </div>
                        </div>

                        <div>
                          <div className="expanded-label">
                            Last handled by
                          </div>
                          <div className="expanded-value">
                            {flat.lastHandledByUserName || "—"}{" "}
                            {flat.lastHandledByUserId
                              ? `(${flat.lastHandledByUserId})`
                              : ""}
                          </div>
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <div className="expanded-label">
                            Notes (full)
                          </div>
                          <div className="expanded-value">
                            {flat.notesText || "—"}
                          </div>
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <div className="expanded-label">
                            Latest Call (raw)
                          </div>
                          <div className="expanded-value">
                            {latest
                              ? `${latest.id} — ${
                                  latest.direction || "—"
                                } — ${
                                  latest.durationInSeconds
                                }s — ${fmtLocal(
                                  latest.createdAt
                                )}`
                              : "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
