// src/pages/Landing.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Landing.css";

/**
 * Landing.jsx — Hero + Features (⚡ 🔒 📁 🧰) + Pack + Detailed Footer
 * - Drop-in (replace existing Landing.jsx)
 * - No external libs
 * - Minimal text, premium UI
 */

function AnimatedCounter({ value, label }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const dur = 1200;
    const from = 0;
    const to = Number(value || 0);
    const tick = (t) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <div className="stat">
      <div className="stat-num">{v.toLocaleString()}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Landing() {
  // sample numbers — replace by passing props or hooking Firestore
  const sample = useMemo(() => ({ leads: 12430, calls: 89234, missed: 320, tenants: 82 }), []);
  const s = sample;

  return (
    <main className="lp-root-compact">
      {/* NAV */}
      <header className="lp-nav-compact">
        <div className="brand-left">
          <div className="logo-mark" />
          <div className="brand-name">CallLeads</div>
        </div>
        <nav className="nav-right">
          <a href="/dashboard">Dashboard</a>
          <a href="/login" className="btn-cta">Start free</a>
        </nav>
      </header>

      {/* HERO */}
      <section className="hero-section">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-eyebrow">Multi-tenant · Realtime · Secure</div>
            <h1 className="hero-title">Call intelligence & lead management</h1>
            <p className="hero-sub">Aggregate calls, convert leads, and monitor performance across all tenants — realtime and effortless.</p>

            <div className="hero-actions">
              <a className="cta-primary" href="/signup">Get started — Free</a>
              <a className="cta-ghost" href="/demo">Request demo</a>
            </div>

            <div className="hero-stats">
              <AnimatedCounter value={s.leads} label="Leads" />
              <AnimatedCounter value={s.calls} label="Calls" />
              <AnimatedCounter value={s.missed} label="Missed" />
              <AnimatedCounter value={s.tenants} label="Tenants" />
            </div>
          </div>

          <div className="hero-right">
            <div className="blob" />
            <div className="mock-panel">
              <div className="panel-top">
                <div className="panel-row">
                  <div className="dot live" />
                  <div className="panel-title">Recent calls</div>
                </div>
                <div className="panel-lines">
                  <div className="line s" />
                  <div className="line m" />
                  <div className="line s" />
                </div>
              </div>

              <div className="panel-bottom">
                <div className="panel-row">
                  <div className="dot lead" />
                  <div className="panel-title">Leads synced</div>
                </div>
                <div className="panel-grid">
                  <div className="tile">New <span>12</span></div>
                  <div className="tile">Missed <span>3</span></div>
                  <div className="tile">Reassign <span>1</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES ROW (⚡ 🔒 📁 🧰) */}
      <section className="features-row">
        <div className="feature">
          <div className="feat-ico">⚡</div>
          <div className="feat-title">Realtime</div>
          <div className="feat-sub">Live counters & alerts</div>
        </div>

        <div className="feature">
          <div className="feat-ico">🔒</div>
          <div className="feat-title">Secure</div>
          <div className="feat-sub">Per-tenant isolation</div>
        </div>

        <div className="feature">
          <div className="feat-ico">📁</div>
          <div className="feat-title">Export</div>
          <div className="feat-sub">CSV / XLSX</div>
        </div>

        <div className="feature">
          <div className="feat-ico">🧰</div>
          <div className="feat-title">Integrations</div>
          <div className="feat-sub">Twilio, Zapier</div>
        </div>
      </section>

      {/* PACK (pricing pack) */}
      <section className="pack-section">
        <div className="pack-inner">
          <div className="pack-title">Pick a pack</div>
          <div className="pack-sub">Simple, predictable pricing — scale as you grow.</div>

          <div className="pack-grid">
            <div className="pack-card">
              <div className="pack-tag">Starter</div>
              <div className="pack-price">Free</div>
              <ul className="pack-features">
                <li>1 tenant</li>
                <li>5k leads</li>
                <li>CSV export</li>
              </ul>
              <a className="pack-cta ghost" href="/signup">Start Free</a>
            </div>

            <div className="pack-card popular">
              <div className="ribbon">Popular</div>
              <div className="pack-tag">Pro</div>
              <div className="pack-price">₹1,499 / mo</div>
              <ul className="pack-features">
                <li>Unlimited tenants</li>
                <li>Realtime analytics</li>
                <li>Priority support</li>
              </ul>
              <a className="pack-cta primary" href="/signup">Get Pro</a>
            </div>

            <div className="pack-card">
              <div className="pack-tag">Enterprise</div>
              <div className="pack-price">Custom</div>
              <ul className="pack-features">
                <li>Dedicated instance</li>
                <li>Onboarding & SLA</li>
                <li>Custom integrations</li>
              </ul>
              <a className="pack-cta ghost" href="/contact">Contact Sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* DETAILED FOOTER */}
      <footer className="footer-detailed">
        <div className="footer-inner">
          <div className="f-col brand">
            <div className="logo-mark-sm" />
            <div className="brand-name">CallLeads</div>
            <div className="brand-desc">Call intelligence & lead ops for multi-tenant businesses.</div>
          </div>

          <div className="f-col">
            <div className="f-title">Product</div>
            <a href="/dashboard">Dashboard</a>
            <a href="/calls">Calls</a>
            <a href="/leads">Leads</a>
            <a href="/tenants">Tenants</a>
          </div>

          <div className="f-col">
            <div className="f-title">Company</div>
            <a href="/about">About</a>
            <a href="/careers">Careers</a>
            <a href="/contact">Contact</a>
          </div>

          <div className="f-col">
            <div className="f-title">Resources</div>
            <a href="/docs">Docs</a>
            <a href="/blog">Blog</a>
            <a href="/support">Support</a>
          </div>

          <div className="f-col">
            <div className="f-title">Legal</div>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/security">Security</a>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="fb-left">© {new Date().getFullYear()} CallLeads — All rights reserved</div>
          <div className="fb-right">
            <a className="social">Twitter</a>
            <a className="social">LinkedIn</a>
            <a className="social">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
