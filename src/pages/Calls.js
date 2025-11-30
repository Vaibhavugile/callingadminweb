// src/pages/Calls.jsx
import React, { useState, useMemo, useEffect } from "react";
import useUserProfile from "../hooks/useUserProfile";
import useCalls from "../hooks/useCalls";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import "./Calls.css";

/* ---------------- Helpers ---------------- */
const fmtTimestamp = (ts) => {
  if (!ts) return "—";
  if (ts.seconds) return new Date(ts.seconds * 1000).toISOString();
  if (typeof ts === "number") return new Date(ts).toISOString();
  if (ts instanceof Date) return ts.toISOString();
  // fallback: try parse
  const parsed = Date.parse(String(ts));
  return Number.isNaN(parsed) ? String(ts) : new Date(parsed).toISOString();
};

const fmtDisplayTimestamp = (ts) => {
  if (!ts) return "—";
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  if (typeof ts === "number") return new Date(ts).toLocaleString();
  if (ts instanceof Date) return ts.toLocaleString();
  const parsed = Date.parse(String(ts));
  return Number.isNaN(parsed) ? String(ts) : new Date(parsed).toLocaleString();
};

const fmtDuration = (sec) => {
  const s = Number(sec) || 0;
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${m}m ${r}s`;
  return `${m}m ${r}s`;
};

const compactDirection = (raw) => {
  if (!raw) return "";
  const d = String(raw).toLowerCase();
  if (d.includes("in")) return "IN";
  if (d.includes("out")) return "OUT";
  return raw;
};

const deriveStatus = (dir, durationSeconds) => {
  const d = String(dir || "").toLowerCase();
  const dur = Number(durationSeconds) || 0;
  if (d.includes("in")) return dur === 0 ? "Missed" : "Answered";
  if (d.includes("out")) return dur === 0 ? "Rejected" : "Answered";
  return "";
};

// normalize created timestamp (ms) for date-range filter & CSV
const createdMs = (call) => {
  const data = call.data || {};
  const c = call.createdAt || data.createdAt || data.ts || data.timestamp || null;
  if (!c) return null;
  if (c.seconds) return c.seconds * 1000 + (c.nanoseconds ? Math.floor(c.nanoseconds / 1000000) : 0);
  if (typeof c === "number") return c;
  if (c instanceof Date) return c.getTime();
  const parsed = Date.parse(String(c));
  return Number.isNaN(parsed) ? null : parsed;
};

/* ---------------- Inline Arrow Icons ---------------- */
function ArrowInIcon() {
  return (
    <svg className="arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <path d="M20 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 16L6 12L10 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowOutIcon() {
  return (
    <svg className="arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <path d="M4 12H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8L18 12L14 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------- CSV helpers ---------------- */
function escapeCsvCell(value) {
  if (value === null || typeof value === "undefined") return "";
  const s = String(value);
  // If contains " or , or newline, wrap in quotes and escape quotes
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function callsToCsvRows(callsArray) {
  // header
  const header = [
    "tenantId",
    "leadId",
    "callId",
    "createdAt_ISO",
    "createdAt_local",
    "phoneNumber",
    "direction",
    "durationSeconds",
    "durationDisplay",
    "status",
    "leadName",
    "leadAddress",
    "nextFollowUp_ISO",
    "nextFollowUp_local",
    "notes",
  ];
  const rows = [header.join(",")];

  for (const c of callsArray) {
    const data = c.data || {};
    const lead = c.lead || {};
    const tenantId = c.tenantId || data.tenantId || lead.tenantId || "";
    const leadId = c.leadId || "";
    const callId = c.id || data.id || "";
    const createdRaw = c.createdAt || data.createdAt || null;
    const createdIso = fmtTimestamp(createdRaw);
    const createdLocal = fmtDisplayTimestamp(createdRaw);
    const phone = data.phoneNumber || data.from || lead.phone || "";
    const direction = compactDirection(data.direction || data.dir || "");
    const durationSeconds = Number(data.durationInSeconds || data.duration || 0);
    const durationDisplay = fmtDuration(durationSeconds);
    const status = deriveStatus(data.direction || data.dir || "", durationSeconds);
    const leadName = lead.name || "";
    const leadAddress = lead.address || "";
    const nextFollowUpRaw = lead.nextFollowUp ?? data.nextFollowUp ?? null;
    const nextFollowUpIso = nextFollowUpRaw ? fmtTimestamp(nextFollowUpRaw) : "";
    const nextFollowUpLocal = nextFollowUpRaw ? fmtDisplayTimestamp(nextFollowUpRaw) : "";
    const notes = (lead.notes && lead.notes.length) ? lead.notes.map(n => n.text).join(" • ") : (data.notes || "");

    const cells = [
      tenantId,
      leadId,
      callId,
      createdIso,
      createdLocal,
      phone,
      direction,
      String(durationSeconds),
      durationDisplay,
      status,
      leadName,
      leadAddress,
      nextFollowUpIso,
      nextFollowUpLocal,
      notes,
    ].map(escapeCsvCell);

    rows.push(cells.join(","));
  }
  return rows.join("\r\n");
}

/* Trigger download */
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

/* ---------------- Main Page ---------------- */
export default function CallsPage() {
  // hooks at top
  const { profile } = useUserProfile();
  const { calls = [], loading, error } = useCalls({ pageSize: 1200 });

  // tenants live list (for tenant filter)
  const [tenants, setTenants] = useState([]);
  useEffect(() => {
    const colRef = collection(db, "tenants");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() })); // doc id used as tenantId
        setTenants(arr);
      },
      (err) => {
        console.error("tenants onSnapshot error", err);
      }
    );
    return () => unsub();
  }, []);

  // UI state
  const [qText, setQText] = useState("");
  const [filter, setFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedCallId, setExpandedCallId] = useState(null);

  // parsed range in ms
  const range = useMemo(() => {
    const s = startDate ? Date.parse(startDate + "T00:00:00") : null;
    const e = endDate ? Date.parse(endDate + "T23:59:59.999") : null;
    return { startMs: Number.isNaN(s) ? null : s, endMs: Number.isNaN(e) ? null : e };
  }, [startDate, endDate]);

  // filtered list
  const filtered = useMemo(() => {
    if (!calls) return [];
    const s = (qText || "").trim().toLowerCase();
    return calls.filter((c) => {
      const data = c.data || {};
      const lead = c.lead || {};
      const dirRaw = data.direction || data.dir || "";
      const dir = String(dirRaw).toLowerCase();
      const dur = Number(data.durationInSeconds || data.duration || 0);

      // tenant filter
      const tenantId = c.tenantId || data.tenantId || lead.tenantId || null;
      if (tenantFilter !== "all" && tenantId !== tenantFilter) return false;

      // direction/status
      if (filter === "inbound" && !dir.includes("in")) return false;
      if (filter === "outbound" && !dir.includes("out")) return false;
      if (filter === "missed" && !(dir.includes("in") && dur === 0)) return false;
      if (filter === "rejected" && !(dir.includes("out") && dur === 0)) return false;

      // date range filter by created timestamp
      const cMs = createdMs(c);
      if (range.startMs !== null && (cMs === null || cMs < range.startMs)) return false;
      if (range.endMs !== null && (cMs === null || cMs > range.endMs)) return false;

      if (!s) return true;
      const hay = [
        tenantId,
        lead.name,
        lead.phone,
        data.phoneNumber,
        data.from,
        data.to,
        c.leadId,
        c.id,
        lead.address,
        ...(Array.isArray(lead.notes) ? lead.notes.map((n) => n.text) : []),
        data.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [calls, qText, filter, tenantFilter, range]);

  // security
  if (!profile) return <div className="p-6">Loading profile…</div>;
  if (profile.role !== "admin") return <div className="p-6">Access denied</div>;

  const toggleExpand = (id) => setExpandedCallId((cur) => (cur === id ? null : id));
  const resetFilters = () => {
    setQText("");
    setFilter("all");
    setTenantFilter("all");
    setStartDate("");
    setEndDate("");
  };

  // CSV export: builds CSV from the currently filtered rows and downloads
  const exportCsv = () => {
    try {
      const csvText = callsToCsvRows(filtered);
      const now = new Date();
      const fnTimestamp = now.toISOString().replace(/[:.]/g, "-");
      const filename = `calls-export-${fnTimestamp}.csv`;
      downloadCsv(filename, csvText);
    } catch (err) {
      console.error("CSV export error", err);
      alert("Failed to export CSV — see console for details.");
    }
  };

  return (
    <div className="calls-page">
      <div className="calls-inner">
        <header className="calls-top">
          <div>
            <h1 className="calls-title">All Calls</h1>
            <p className="calls-sub">Realtime — newest first. Filter and export visible rows as CSV.</p>
          </div>

          <div className="calls-controls">
            <div className="search-wrap">
              <input
                className="search-input"
                placeholder="Search tenant, name, phone, address, notes..."
                value={qText}
                onChange={(e) => setQText(e.target.value)}
              />
              {qText && <button className="clear-btn" onClick={() => setQText("")}>✕</button>}
            </div>

            <select className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
              <option value="missed">Missed</option>
              <option value="rejected">Rejected</option>
            </select>

            <select className="filter-select" value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}>
              <option value="all">All tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id}
                </option>
              ))}
            </select>

            <div className="date-pickers">
              <input className="date-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <span className="date-sep">—</span>
              <input className="date-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <button className="reset-btn" onClick={resetFilters} title="Reset filters">Reset</button>

            <button className="export-btn" onClick={exportCsv} title="Export visible rows to CSV">
              Export CSV
            </button>

            <div className="meta-pill">{loading ? "Loading…" : `${filtered.length} items`}</div>
          </div>
        </header>

        {error && <div className="calls-error">Error loading calls: {String(error)}</div>}

        <main className="calls-list" aria-live="polite">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <CallSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <div className="calls-empty">No calls found.</div>
          ) : (
            filtered.map((c) => {
              const data = c.data || {};
              const lead = c.lead || {};
              const created =
                c.createdAt ||
                (data.createdAt ? (data.createdAt.seconds ? new Date(data.createdAt.seconds * 1000) : new Date(data.createdAt)) : null);
              const tenant = c.tenantId || data.tenantId || lead.tenantId || "—";
              const phone = data.phoneNumber || data.from || lead.phone || "—";
              const direction = compactDirection(data.direction || data.dir);
              const durationSec = Number(data.durationInSeconds || data.duration || 0);
              const status = deriveStatus(data.direction || data.dir, durationSec);

              const nextFollowUpRaw = lead.nextFollowUp ?? data.nextFollowUp ?? null;
              const nextFollowUpDisplay = nextFollowUpRaw ? fmtDisplayTimestamp(nextFollowUpRaw) : "—";

              return (
                <article
                  key={`${tenant}-${c.leadId}-${c.id}`}
                  className={`call-row ${status === "Missed" || status === "Rejected" ? "problem" : ""}`}
                  onClick={() => toggleExpand(c.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") toggleExpand(c.id); }}
                >
                  <div className="call-left">
                    <div className="call-avatar">{(lead.name || data.callerName || phone || "?").toString().charAt(0).toUpperCase()}</div>
                    <div className="call-info">
                      <div className="call-name">{lead.name || data.callerName || phone || "Unknown"}</div>
                      <div className="call-phone">{phone}</div>
                      <div className="call-when">{fmtDisplayTimestamp(created)}</div>
                    </div>
                  </div>

                  <div className="call-mid">
                    <div className="call-outcome-compact">
                      <span className={`dir-pill ${direction === "IN" ? "in" : direction === "OUT" ? "out" : ""}`}>
                        {direction === "IN" ? <ArrowInIcon/> : direction === "OUT" ? <ArrowOutIcon/> : null}
                        <span className="dir-text" style={{ marginLeft: 8 }}>{direction}</span>
                      </span>

                      <span className="dur-pill">{fmtDuration(durationSec)}</span>

                      {(status === "Missed" || status === "Rejected") && (
                        <span className="status-pill">{status}</span>
                      )}
                    </div>

                    <div className="call-notes">
                      {lead.notes && lead.notes.length ? lead.notes[0].text : (data.notes || "—")}
                    </div>
                  </div>

                  <div className="call-right">
                    <div className="call-tenant">Tenant: <span className="muted-strong">{tenant}</span></div>
                    <div className="call-lead">Lead: <span className="muted-strong">{c.leadId}</span></div>
                    <div className="call-meta">ID: {c.id}</div>
                  </div>

                  {/* expanded area */}
                  {expandedCallId === c.id ? (
                    <div className="call-expanded">
                      <div className="expanded-grid">
                        <div>
                          <div className="expanded-label">Address</div>
                          <div className="expanded-value">{lead.address || "—"}</div>
                        </div>

                        <div>
                          <div className="expanded-label">Event date</div>
                          <div className="expanded-value">{lead.eventDate ? (lead.eventDate.seconds ? new Date(lead.eventDate.seconds * 1000).toLocaleDateString() : (new Date(lead.eventDate)).toLocaleDateString()) : "—"}</div>
                        </div>

                        <div>
                          <div className="expanded-label">Created at</div>
                          <div className="expanded-value">{fmtDisplayTimestamp(data.createdAt || created)}</div>
                        </div>

                        <div>
                          <div className="expanded-label">Phone</div>
                          <div className="expanded-value">{phone}</div>
                        </div>

                        <div>
                          <div className="expanded-label">Next follow-up</div>
                          <div className="expanded-value">{nextFollowUpDisplay}</div>
                        </div>

                        <div style={{ gridColumn: "1 / -1" }}>
                          <div className="expanded-label">Notes</div>
                          <div className="expanded-value">{(lead.notes && lead.notes.length) ? lead.notes.map(n => n.text).join(" • ") : (data.notes || "—")}</div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------------- Skeleton ---------------- */
function CallSkeleton() {
  return (
    <div className="call-row skeleton" aria-hidden>
      <div className="call-left">
        <div className="call-avatar shimmer" />
        <div className="call-info">
          <div className="shimmer-line" style={{ width: 160 }} />
          <div className="shimmer-line" style={{ width: 110 }} />
          <div className="shimmer-line" style={{ width: 90 }} />
        </div>
      </div>

      <div className="call-mid">
        <div className="shimmer-line" style={{ width: "40%" }} />
        <div className="shimmer-line" style={{ width: "60%", marginTop: 8 }} />
      </div>

      <div className="call-right">
        <div className="shimmer-line" style={{ width: 120 }} />
        <div className="shimmer-line" style={{ width: 90, marginTop: 8 }} />
        <div className="shimmer-line" style={{ width: 60, marginTop: 8 }} />
      </div>
    </div>
  );
}
