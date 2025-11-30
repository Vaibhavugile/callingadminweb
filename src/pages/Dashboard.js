// src/pages/Dashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import useUserProfile from "../hooks/useUserProfile";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
} from "firebase/firestore";
import "./Dashboard.css";

// Recharts for lightweight, premium charts. Install with `npm install recharts` if you haven't.
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export default function Dashboard() {
  const { profile } = useUserProfile();

  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState("all");

  const [stats, setStats] = useState({
    leadsCount: 0,
    callsCount: 0,
    inboundCount: 0,
    outboundCount: 0,
    missedCount: 0,
    rejectedCount: 0,
    totalDurationSeconds: 0,
  });

  const [loading, setLoading] = useState(false);
  const [fastPath, setFastPath] = useState(null); // true = using counters, false = fallback, null = unknown

  // -----------------------
  // Helpers
  // -----------------------
  const toNum = (v) => (Number(v) || 0);
  const safe = (n) => Math.max(0, Number(n) || 0);

  // optional: format seconds to H:MM:SS or just show seconds
  const fmtDuration = (s) => {
    const sec = Math.max(0, Number(s) || 0);
    if (sec < 60) return `${sec}s`;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const sRem = sec % 60;
    return h > 0 ? `${h}h ${m}m ${sRem}s` : `${m}m ${sRem}s`;
  };

  // -----------------------
  // Real-time list of tenants
  // -----------------------
  useEffect(() => {
    const q = query(collection(db, "tenants"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTenants(arr);
      },
      (err) => {
        console.error("tenants onSnapshot error:", err);
      }
    );
    return () => unsub();
  }, []);

  // -----------------------
  // Load stats when tenant changes OR when tenants list changes (recompute aggregate)
  // -----------------------
  useEffect(() => {
    if (!profile || profile.role !== "admin") return;

    let unsub;
    if (selectedTenant === "all") {
      computeAggregate();
    } else {
      unsub = subscribeSingleTenant(selectedTenant);
    }

    return () => {
      if (typeof unsub === "function") unsub();
    };
    // include tenants so aggregate recomputes when tenants array updates (e.g. after backfill)
  }, [selectedTenant, profile, tenants]);

  // -----------------------
  // SINGLE TENANT FAST MODE
  // -----------------------
  function subscribeSingleTenant(tenantId) {
    if (!tenantId) {
      // reset to empty stats if no tenant selected
      setStats({
        leadsCount: 0,
        callsCount: 0,
        inboundCount: 0,
        outboundCount: 0,
        missedCount: 0,
        rejectedCount: 0,
        totalDurationSeconds: 0,
      });
      setFastPath(false);
      return () => {};
    }

    const ref = doc(db, "tenants", tenantId);
    setLoading(true);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? snap.data() : null;

        if (!data) {
          setStats({
            leadsCount: 0,
            callsCount: 0,
            inboundCount: 0,
            outboundCount: 0,
            missedCount: 0,
            rejectedCount: 0,
            totalDurationSeconds: 0,
          });
          setFastPath(false);
          setLoading(false);
          return;
        }

        // If any counter exists, treat it as fast path.
        const hasCounters =
          typeof data.leadsCount !== "undefined" ||
          typeof data.callsCount !== "undefined" ||
          typeof data.inboundCount !== "undefined" ||
          typeof data.outboundCount !== "undefined" ||
          typeof data.missedCount !== "undefined" ||
          typeof data.rejectedCount !== "undefined" ||
          typeof data.totalDurationSeconds !== "undefined";

        setFastPath(hasCounters);

        setStats({
          leadsCount: toNum(data.leadsCount),
          callsCount: toNum(data.callsCount),
          inboundCount: toNum(data.inboundCount),
          outboundCount: toNum(data.outboundCount),
          missedCount: toNum(data.missedCount),
          rejectedCount: toNum(data.rejectedCount),
          totalDurationSeconds: toNum(data.totalDurationSeconds),
        });

        setLoading(false);
      },
      (err) => {
        console.error("subscribeSingleTenant onSnapshot error:", err);
        setLoading(false);
        setFastPath(false);
      }
    );

    return unsub;
  }

  // -----------------------
  // ALL TENANTS AGGREGATE
  // -----------------------
  function computeAggregate() {
    setLoading(true);

    let total = {
      leadsCount: 0,
      callsCount: 0,
      inboundCount: 0,
      outboundCount: 0,
      missedCount: 0,
      rejectedCount: 0,
      totalDurationSeconds: 0,
    };

    for (const t of tenants) {
      total.leadsCount += toNum(t.leadsCount);
      total.callsCount += toNum(t.callsCount);
      total.inboundCount += toNum(t.inboundCount);
      total.outboundCount += toNum(t.outboundCount);
      total.missedCount += toNum(t.missedCount);
      total.rejectedCount += toNum(t.rejectedCount);
      total.totalDurationSeconds += toNum(t.totalDurationSeconds);
    }

    const anyHasCounters = tenants.some((t) =>
      ["leadsCount", "callsCount", "inboundCount", "outboundCount", "missedCount", "rejectedCount", "totalDurationSeconds"].some(
        (k) => typeof t[k] !== "undefined"
      )
    );

    setFastPath(anyHasCounters);
    setStats(total);
    setLoading(false);
  }

  // optional: show lastRecalcAt (most recent across tenants) to indicate freshness
  const lastRecalcAt = useMemo(() => {
    if (!tenants || tenants.length === 0) return null;
    let latest = null;
    for (const t of tenants) {
      if (t.lastRecalcAt && t.lastRecalcAt.seconds) {
        const ts = new Date(t.lastRecalcAt.seconds * 1000);
        if (!latest || ts > latest) latest = ts;
      } else if (t.lastRecalcAt && t.lastRecalcAt.toDate) {
        // sometimes Firestore client returns Timestamp-like object client-side
        const ts = t.lastRecalcAt.toDate();
        if (!latest || ts > latest) latest = ts;
      }
    }
    return latest;
  }, [tenants]);

  // -----------------------
  // Chart data (single pie for calls, bar for tenant comparison)
  // -----------------------
  const CHART_COLORS = ["#6C5CE7", "#00B894", "#FF7675", "#FFD166", "#74B9FF", "#A29BFE"];

  // Pie slices: Inbound Answered, Inbound Missed, Outbound Answered, Outbound Rejected
  const inboundAnswered = safe(stats.inboundCount - stats.missedCount);
  const outboundAnswered = safe(stats.outboundCount - stats.rejectedCount);
  const pieData = useMemo(() => {
    const total = inboundAnswered + safe(stats.missedCount) + outboundAnswered + safe(stats.rejectedCount);
    if (total === 0) return [{ name: "No activity", value: 1 }];
    return [
      { name: "Inbound Answered", value: inboundAnswered },
      { name: "Inbound Missed", value: safe(stats.missedCount) },
      { name: "Outbound Answered", value: outboundAnswered },
      { name: "Outbound Rejected", value: safe(stats.rejectedCount) },
    ];
  }, [stats, inboundAnswered, outboundAnswered]);

  // Tenant comparison: top 8 by calls
  const tenantComparison = useMemo(() => {
    const arr = tenants.map((t) => ({ id: t.id, calls: toNum(t.callsCount) }));
    arr.sort((a, b) => b.calls - a.calls);
    return arr.slice(0, 8);
  }, [tenants]);

  const barData = useMemo(() => {
    if (tenantComparison.length === 0) return [{ name: "No tenants", calls: 1 }];
    return tenantComparison.map((t) => ({ name: t.id, calls: t.calls }));
  }, [tenantComparison]);

  // Helper
  const fmt = (v) => (loading ? "…" : v);

  if (!profile) return <div className="p-6">Loading profile…</div>;
  if (profile.role !== "admin") return <div className="p-6">Access denied</div>;

  return (
    <div className="dashboard-root">
      <div className="dashboard-inner">
        {/* HEADER */}
        <div className="dashboard-header">
          <div>
            <div className="dashboard-title">Admin — Quick Overview</div>
            <div className="dashboard-sub">Lead & call statistics</div>
          </div>

          {/* Badge */}
          <div>
            <span className="path-badge">
              <span
                className={
                  "path-indicator " +
                  (fastPath === null ? "path-unknown" : fastPath ? "path-fast" : "path-fallback")
                }
              />
              {fastPath === null ? "Detecting…" : fastPath ? "Fast Path" : "Fallback"}
            </span>
          </div>

          {/* Tenant selector */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ color: "var(--muted)", fontSize: 13 }}>Tenant</label>
            <select className="select-tenant" value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)}>
              <option value="all">All tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-title">Leads</div>
            <div className="kpi-value">{fmt(stats.leadsCount)}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">Calls</div>
            <div className="kpi-value">{fmt(stats.callsCount)}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">Inbound</div>
            <div className="kpi-value">{fmt(stats.inboundCount)}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">Outbound</div>
            <div className="kpi-value">{fmt(stats.outboundCount)}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">Missed</div>
            <div className="kpi-value">{fmt(stats.missedCount)}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">Rejected</div>
            <div className="kpi-value">{fmt(stats.rejectedCount)}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">Total Duration</div>
            <div className="kpi-value">{loading ? "…" : fmtDuration(stats.totalDurationSeconds)}</div>
          </div>
        </div>

        {/* Charts row: Pie (calls breakdown) + Bar (tenant comparison) */}
        <div className="charts-row" style={{ display: "flex", gap: 16, marginTop: 18 }}>
          <div style={{ flex: 1, minWidth: 300 }} className="card">
            <div style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Calls breakdown</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Inbound/Outbound answered vs missed/rejected</div>
              </div>

              <div style={{ height: 260, marginTop: 10 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={96}
                      paddingAngle={4}
                      isAnimationActive={true}
                      animationDuration={800}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip formatter={(v) => (Number(v) ? v : v)} />
                    <Legend verticalAlign="bottom" height={28} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{ flex: 1.2, minWidth: 380 }} className="card">
            <div style={{ padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Top tenants (by calls)</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Compare tenant call volume</div>
              </div>

              <div style={{ height: 260, marginTop: 10 }}>
                <ResponsiveContainer>
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} />
                    <YAxis />
                    <ReTooltip />
                    <Bar dataKey="calls" radius={[6, 6, 6, 6]} isAnimationActive={true} animationDuration={900}>
                      {barData.map((entry, idx) => (
                        <Cell key={`bar-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, color: "var(--muted)", fontSize: 12 }}>
          Stats computed using server-side counters.
          {lastRecalcAt ? <span> Last full recompute: {lastRecalcAt.toLocaleString()}</span> : null}
        </div>
      </div>
    </div>
  );
}
