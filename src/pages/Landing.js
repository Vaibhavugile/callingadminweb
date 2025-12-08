import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Landing.jsx — Full replacement
 * - Single-file premium landing page (no external libs)
 * - Scoped CSS injected at runtime (so drop-in works)
 * - Accessible, responsive, subtle animations, clear section bands
 *
 * Drop this file in place of your existing Landing.jsx and import it where needed.
 */

function useScopedStyles(id, css) {
  useEffect(() => {
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.type = "text/css";
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, [id, css]);
}

function AnimatedCounter({ value = 0, label }) {
  const [v, setV] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let start = null;
    const to = Number(value || 0);
    const dur = Math.min(1600, 800 + Math.abs(to) * 0.02);
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(to * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return (
    <div className="lp-stat">
      <div className="lp-stat-num">{v.toLocaleString()}</div>
      <div className="lp-stat-label">{label}</div>
    </div>
  );
}

export default function Landing() {
  const stats = useMemo(
    () => ({ leads: 27340, calls: 182900, conversions: 4230, tenants: 136 }),
    []
  );

  const css = `
:root{
  --bg-1: #0b1220;
  --bg-2: #051027;
  --muted: #9fb0c4;
  --accent: #6c5ce7;
  --accent2: #00d4ff;
  --glass: rgba(255,255,255,0.02);
  --radius: 14px;
  --page-pad-vertical: 64px;
  --section-gap: 40px;
  --card-pad: 22px;
}

.lp-root{ min-height:100vh; background: linear-gradient(180deg,var(--bg-1),var(--bg-2)); color:#eaf2ff; padding:var(--page-pad-vertical) 20px; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
.lp-inner{ max-width:1200px; margin:0 auto; }

/* NAV */
.lp-topnav{ display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:48px; }
.lp-brand{ display:flex; align-items:center; gap:14px; }
.lp-logo{ width:56px; height:56px; border-radius:14px; background: linear-gradient(135deg,var(--accent),var(--accent2)); display:flex; align-items:center; justify-content:center; font-weight:900; font-size:18px; box-shadow: 0 14px 40px rgba(76,64,170,0.16); }
.lp-name{ font-weight:900; font-size:18px; }
.lp-nav a{ margin-left:16px; color:var(--muted); text-decoration:none; font-weight:800; }
.btn-primary{ background: linear-gradient(90deg,var(--accent),var(--accent2)); padding:12px 18px; border-radius:14px; text-decoration:none; color:#041527; font-weight:900; box-shadow: 0 14px 40px rgba(108,92,231,0.18); }
.btn-ghost{ padding:10px 16px; border-radius:14px; border:1px solid rgba(255,255,255,0.04); color:var(--muted); text-decoration:none; font-weight:800; }

/* HERO */
.lp-hero{ display:grid; grid-template-columns: 1fr 520px; gap:48px; align-items:center; margin-bottom:var(--section-gap); padding:20px; }
.lp-eyebrow{ display:inline-block; padding:8px 12px; border-radius:999px; background: linear-gradient(90deg, rgba(108,92,231,0.08), rgba(0,212,255,0.05)); color: var(--muted); font-weight:800; font-size:13px; margin-bottom:18px; }
.lp-title{ font-size:48px; line-height:1.02; margin:0 0 16px 0; background: linear-gradient(90deg,var(--accent),var(--accent2)); -webkit-background-clip:text; color:transparent; font-weight:900; }
.lp-sub{ color:var(--muted); max-width:64ch; margin-bottom:24px; font-size:16px; line-height:1.5; }
.lp-cta-row{ display:flex; gap:14px; margin-bottom:24px; }

.lp-stats{ display:flex; gap:16px; margin-top:12px; }
.lp-stat{ padding:14px 18px; border-radius:14px; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); box-shadow: 0 12px 36px rgba(2,6,23,0.48); min-width:140px; text-align:left; }
.lp-stat-num{ font-weight:900; font-size:20px; color:#fff; }
.lp-stat-label{ color:var(--muted); font-size:13px; margin-top:6px; }

/* mock panel */
.lp-mock{ border-radius:18px; padding:18px; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.04); box-shadow: 0 30px 70px rgba(2,6,23,0.65); min-width:420px; }
.mock-item{ display:flex; justify-content:space-between; gap:12px; padding:12px; border-radius:12px; background: linear-gradient(90deg, rgba(108,92,231,0.04), rgba(0,212,255,0.02)); }

/* FEATURES */
.lp-features{ display:grid; grid-template-columns: repeat(4,1fr); gap:20px; margin:48px 0; }
.feat{ background: linear-gradient(180deg, rgba(255,255,255,0.01), transparent); padding:18px; border-radius:14px; display:flex; gap:16px; align-items:center; border:1px solid rgba(255,255,255,0.03); min-height:100px; }
.feat-ico{ width:72px; height:72px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:900; background:linear-gradient(90deg,var(--accent),var(--accent2)); color:#041527; box-shadow: 0 14px 40px rgba(76,64,170,0.14); }
.feat-desc{ display:flex; flex-direction:column; }
.feat-title{ font-weight:900; font-size:16px; }
.feat-sub{ color:var(--muted); font-size:14px; margin-top:6px; }

/* PACKS */
.lp-packs{ display:grid; grid-template-columns: repeat(3,1fr); gap:20px; margin-bottom:48px; }
.pack{ padding:22px; border-radius:16px; background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.008)); border:1px solid rgba(255,255,255,0.03); text-align:center; min-height:220px; }
.pack-pop::before{ content:'Popular'; position:absolute; top:-14px; left:50%; transform:translateX(-50%); background: linear-gradient(90deg,var(--accent),var(--accent2)); color:#041527; padding:8px 12px; font-weight:900; border-radius:12px; font-size:13px; }
.pack-price{ font-size:20px; font-weight:900; margin-top:10px; }
.pack-features{ color:var(--muted); margin-top:12px; text-align:left; }

/* SECTION BANDS (clear separation) */
.lp-section-band{ border-radius:16px; padding:28px; }
.lp-band-1{ background: linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0.03)); }
.lp-band-2{ background: linear-gradient(180deg, rgba(0,212,255,0.03), rgba(108,92,231,0.035)); }
.lp-band-3{ background: linear-gradient(180deg, rgba(108,92,231,0.06), rgba(0,212,255,0.04)); }
.lp-band-4{ background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.008)); }

/* Testimonials */
.lp-test-grid{ display:grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap:18px; }
.test-card{ padding:20px; border-radius:14px; background: linear-gradient(180deg, rgba(255,255,255,0.01), transparent); border:1px solid rgba(255,255,255,0.02); min-height:160px; }
.test-avatar{ width:56px; height:56px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:18px; }

/* FAQ */
details{ border-radius:12px; padding:16px; background: linear-gradient(180deg, rgba(255,255,255,0.008), transparent); }
summary{ font-weight:900; cursor:pointer; outline:none; }

/* CTA */
.lp-cta-big{ padding:26px; border-radius:14px; display:flex; justify-content:space-between; align-items:center; gap:18px; }
.lp-cta-input{ padding:12px 14px; border-radius:12px; border:1px solid rgba(255,255,255,0.04); background:transparent; color:#eaf2ff; }

/* Reveal animation */
section.reveal{ opacity:0; transform: translateY(24px); transition: opacity .7s cubic-bezier(.2,.9,.2,1), transform .7s cubic-bezier(.2,.9,.2,1); will-change: opacity, transform; }
section.reveal.inview{ opacity:1; transform:none; }

/* Responsive adjustments */
@media (max-width:1100px){ .lp-hero{ grid-template-columns:1fr 360px; } .lp-features{ grid-template-columns:repeat(2,1fr); } }
@media (max-width:800px){ .lp-hero{ grid-template-columns:1fr; } .lp-mock{ order:-1; margin-bottom:18px; min-width:100%; } .lp-features{ grid-template-columns:1fr; } .lp-packs{ grid-template-columns:1fr; } .feat-ico{ width:64px; height:64px; font-size:24px; }
}
`;

  useScopedStyles('landing-scoped-styles', css);

  // IntersectionObserver to add `inview` on sections and stagger
  useEffect(() => {
    const root = document.querySelector('.lp-root');
    if (!root) return;
    const sections = Array.from(root.querySelectorAll('section'));
    if (sections.length === 0) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('inview');
      });
    }, { threshold: 0.14 });

    sections.forEach((s, i) => {
      s.classList.add('reveal');
      s.style.transitionDelay = `${i * 90}ms`;
      obs.observe(s);
    });

    return () => obs.disconnect();
  }, []);

  return (
    <main className="lp-root" aria-labelledby="hero-title">
      <div className="lp-inner">
        {/* NAV */}
        <header className="lp-topnav" role="banner">
          <div className="lp-brand">
            <div className="lp-logo">MC</div>
            <div>
              <div className="lp-name">MyCalls</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>Lead & Call Management</div>
            </div>
          </div>

          <nav className="lp-nav" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="/login" className="btn-ghost">Sign in</a>
            <a href="/signup" className="btn-primary">Get started</a>
          </nav>
        </header>

        {/* HERO */}
        <section className="lp-hero lp-section-band lp-band-1" aria-labelledby="hero-title">
          <div>
            <div className="lp-eyebrow">For multi-tenant teams • realtime insights</div>
            <h1 id="hero-title" className="lp-title">Turn every call into growth — centrally.</h1>
            <p className="lp-sub">MyCalls gives businesses a single place to capture, qualify and act on leads coming from phone calls — secure tenancy, routing and analytics to lift conversions.</p>

            <div className="lp-cta-row">
              <a href="/signup" className="btn-primary">Start free</a>
              <a href="/demo" className="btn-ghost">Request demo</a>
            </div>

            <div className="lp-stats" role="status" aria-live="polite">
              <AnimatedCounter value={stats.leads} label="Leads captured" />
              <AnimatedCounter value={stats.calls} label="Calls processed" />
              <AnimatedCounter value={stats.conversions} label="Conversions" />
              <AnimatedCounter value={stats.tenants} label="Tenants" />
            </div>
          </div>

          <aside>
            <div className="lp-mock" aria-hidden>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:13, color:'var(--muted)' }}>Live queue</div>
                <div style={{ fontWeight:800 }}>12</div>
              </div>

              <div style={{ marginTop:12, display:'grid', gap:10 }}>
                <div className="mock-item"><div style={{fontWeight:700}}>+91 • 98765 43210</div><div style={{color:'#ffd27b', fontWeight:800}}>Missed</div></div>
                <div className="mock-item"><div style={{fontWeight:700}}>+1 • (415) 555-0132</div><div style={{color:'#8ef2c1', fontWeight:800}}>Converted</div></div>
                <div className="mock-item"><div style={{fontWeight:700}}>+44 • 20 7946 0958</div><div style={{color:'var(--muted)'}}>New</div></div>
              </div>
            </div>
          </aside>
        </section>

        {/* FEATURES */}
        <section id="features" className="lp-features lp-section-band lp-band-4" aria-label="Key features">
          <div className="feat"><div className="feat-ico">⚡</div><div><div style={{fontWeight:800}}>Realtime Routing</div><div style={{color:'var(--muted)'}}>Connect calls to the right rep instantly.</div></div></div>
          <div className="feat"><div className="feat-ico">🔒</div><div><div style={{fontWeight:800}}>Tenant-isolated</div><div style={{color:'var(--muted)'}}>Per-tenant data separation & audit logs.</div></div></div>
          <div className="feat"><div className="feat-ico">📊</div><div><div style={{fontWeight:800}}>Insights</div><div style={{color:'var(--muted)'}}>Conversion funnels, quality scoring, SLA alerts.</div></div></div>
          <div className="feat"><div className="feat-ico">🔗</div><div><div style={{fontWeight:800}}>Integrations</div><div style={{color:'var(--muted)'}}>Twilio, Zapier, CRMs & webhooks.</div></div></div>
        </section>

        {/* HOW IT WORKS */}
        <section className="lp-how lp-section-band lp-band-1" aria-label="How MyCalls works">
          <div style={{display:'flex', gap:18, flexWrap:'wrap', alignItems:'flex-start'}}>
            <div style={{flex:1, minWidth:260}}>
              <h2 style={{fontSize:28, fontWeight:800, margin:0}}>How MyCalls turns calls into customers</h2>
              <p style={{color:'var(--muted)', marginTop:10}}>A concise three-step flow designed to remove friction: capture incoming calls, qualify with context, and close more leads using automation and analytics.</p>

              <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:16}}>
                <div className="pack" style={{textAlign:'left'}}>
                  <div style={{display:'flex', gap:10, alignItems:'center'}}>
                    <div className="feat-ico" style={{width:44, height:44}}>📥</div>
                    <div><div style={{fontWeight:900}}>Capture</div><div style={{color:'var(--muted)', fontSize:13}}>Auto-log calls, capture caller data, source tag.</div></div>
                  </div>
                </div>

                <div className="pack" style={{textAlign:'left'}}>
                  <div style={{display:'flex', gap:10, alignItems:'center'}}>
                    <div className="feat-ico" style={{width:44, height:44}}>🧠</div>
                    <div><div style={{fontWeight:900}}>Qualify</div><div style={{color:'var(--muted)', fontSize:13}}>Call scoring, history, and dynamic routing.</div></div>
                  </div>
                </div>

                <div className="pack" style={{textAlign:'left'}}>
                  <div style={{display:'flex', gap:10, alignItems:'center'}}>
                    <div className="feat-ico" style={{width:44, height:44}}>🏁</div>
                    <div><div style={{fontWeight:900}}>Convert</div><div style={{color:'var(--muted)', fontSize:13}}>Follow-ups, reminders, agent sequences & SLA alerts.</div></div>
                  </div>
                </div>
              </div>
            </div>

            <aside style={{width:340, minWidth:260}}>
              <div className="lp-mock" aria-hidden>
                <div style={{display:'flex', justifyContent:'space-between'}}><div style={{fontSize:13, color:'var(--muted)'}}>Live preview</div><div style={{fontWeight:800}}>Queue 12</div></div>
                <div style={{marginTop:12, display:'grid', gap:10}}>
                  <div className="mock-item"><div style={{fontWeight:700}}>+91 • 98765 43210</div><div style={{color:'#ffd27b', fontWeight:800}}>Missed</div></div>
                  <div className="mock-item"><div style={{fontWeight:700}}>+1 • (415) 555-0132</div><div style={{color:'#8ef2c1', fontWeight:800}}>Converted</div></div>
                  <div className="mock-item"><div style={{fontWeight:700}}>+44 • 20 7946 0958</div><div style={{color:'var(--muted)'}}>New</div></div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* INTEGRATIONS */}
        <section className="lp-integrations lp-section-band lp-band-2" aria-label="Integrations">
          <div style={{textAlign:'center'}}>
            <h2 style={{fontSize:26, fontWeight:800, margin:0}}>Integrations</h2>
            <p style={{color:'var(--muted)', marginTop:8}}>Plug into the tools you already use — quick setup, secure sync.</p>
          </div>

          <div style={{display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', marginTop:14}}>
            <div className="feat-ico" style={{width:96, height:56, borderRadius:12}}>Twilio</div>
            <div className="feat-ico" style={{width:96, height:56, borderRadius:12}}>Zapier</div>
            <div className="feat-ico" style={{width:96, height:56, borderRadius:12}}>Salesforce</div>
            <div className="feat-ico" style={{width:96, height:56, borderRadius:12}}>HubSpot</div>
            <div className="feat-ico" style={{width:96, height:56, borderRadius:12}}>Webhook</div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="lp-testimonials lp-section-band lp-band-3" aria-label="Customer stories">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
            <h2 style={{fontSize:26, fontWeight:800, margin:0}}>Loved by fast-growing teams</h2>
            <a href="/case-studies" className="btn-ghost">See case studies</a>
          </div>

          <div className="lp-test-grid" style={{marginTop:12}}>
            <div className="test-card">
              <div style={{display:'flex', gap:12, alignItems:'center'}}>
                <div style={{width:48, height:48, borderRadius:10, background:'linear-gradient(135deg,var(--accent),var(--accent2))', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800}}>RK</div>
                <div><div style={{fontWeight:800}}>Retail Group</div><div style={{color:'var(--muted)', fontSize:13}}>Head of Ops</div></div>
              </div>
              <p style={{marginTop:12}}>“MyCalls helped us drop missed leads by 62% — consolidated view + SLA alerts made the difference.”</p>
              <div style={{marginTop:8, color:'var(--muted)'}}>⭐⭐⭐⭐⭐</div>
            </div>

            <div className="test-card">
              <div style={{display:'flex', gap:12, alignItems:'center'}}>
                <div style={{width:48, height:48, borderRadius:10, background:'linear-gradient(135deg,#4dd0e1,#6c5ce7)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800}}>MG</div>
                <div><div style={{fontWeight:800}}>Property Co.</div><div style={{color:'var(--muted)', fontSize:13}}>CTO</div></div>
              </div>
              <p style={{marginTop:12}}>“Unified calls across 120 locations — reporting is now trusted across teams.”</p>
              <div style={{marginTop:8, color:'var(--muted)'}}>⭐⭐⭐⭐⭐</div>
            </div>

            <div className="test-card">
              <div style={{display:'flex', gap:12, alignItems:'center'}}>
                <div style={{width:48, height:48, borderRadius:10, background:'linear-gradient(135deg,#ffd27b,#ff9a7a)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800}}>AS</div>
                <div><div style={{fontWeight:800}}>Motor Sales</div><div style={{color:'var(--muted)', fontSize:13}}>Sales Lead</div></div>
              </div>
              <p style={{marginTop:12}}>“Agents respond 3× faster with unified call history and quick notes.”</p>
              <div style={{marginTop:8, color:'var(--muted)'}}>⭐⭐⭐⭐⭐</div>
            </div>

            <div className="test-card">
              <div style={{display:'flex', gap:12, alignItems:'center'}}>
                <div style={{width:48, height:48, borderRadius:10, background:'linear-gradient(135deg,#8ef2c1,#6effc2)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800}}>LM</div>
                <div><div style={{fontWeight:800}}>Services</div><div style={{color:'var(--muted)', fontSize:13}}>COO</div></div>
              </div>
              <p style={{marginTop:12}}>“Analytics helped us cut first-response time; dashboard is intuitive and fast.”</p>
              <div style={{marginTop:8, color:'var(--muted)'}}>⭐⭐⭐⭐⭐</div>
            </div>
          </div>
        </section>

        {/* PRICING / COMPARE */}
        <section id="pricing" className="lp-packs lp-section-band lp-band-1" aria-label="Pricing options">
          <div className="pack" style={{position:'relative'}}>
            <div style={{fontWeight:900}}>Starter</div>
            <div style={{fontSize:18, fontWeight:900}}>Free</div>
            <div style={{color:'var(--muted)', marginTop:8}}>• 1 tenant • 5k leads/mo • CSV export</div>
            <a className="pack-cta btn-ghost" href="/signup" style={{marginTop:12, display:'inline-block'}}>Start free</a>
          </div>

          <div className="pack pack-pop" style={{position:'relative'}}>
            <div style={{fontWeight:900}}>Pro</div>
            <div style={{fontSize:18, fontWeight:900}}>₹1,499 / mo</div>
            <div style={{color:'var(--muted)', marginTop:8}}>• Unlimited tenants • Realtime analytics • Priority support</div>
            <a className="pack-cta btn-primary" href="/signup" style={{marginTop:12, display:'inline-block'}}>Get Pro</a>
          </div>

          <div className="pack" style={{position:'relative'}}>
            <div style={{fontWeight:900}}>Enterprise</div>
            <div style={{fontSize:18, fontWeight:900}}>Custom</div>
            <div style={{color:'var(--muted)', marginTop:8}}>• Dedicated instance • Onboarding & SLA • Custom integrations</div>
            <a className="pack-cta btn-ghost" href="/contact" style={{marginTop:12, display:'inline-block'}}>Contact sales</a>
          </div>
        </section>

        {/* RESOURCES */}
        <section id="resources" className="lp-section-band lp-band-4" aria-label="Resources">
          <h2 style={{fontSize:26, fontWeight:800, margin:0}}>Resources</h2>
          <p style={{color:'var(--muted)', marginTop:8}}>Guides, docs and quick-starts for integrating MyCalls into your stack.</p>

          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:12, marginTop:12}}>
            <div className="pack"><div style={{fontWeight:800}}>Quick start</div><div style={{color:'var(--muted)', marginTop:6}}>3-minute guide to get your first tenant live.</div></div>
            <div className="pack"><div style={{fontWeight:800}}>API docs</div><div style={{color:'var(--muted)', marginTop:6}}>Everything you need to push & pull lead events.</div></div>
            <div className="pack"><div style={{fontWeight:800}}>Case studies</div><div style={{color:'var(--muted)', marginTop:6}}>Real ROI stories from customers using MyCalls at scale.</div></div>
          </div>
        </section>

        {/* CTA / Newsletter */}
        <section className="lp-cta-big lp-section-band lp-band-2" aria-label="Start trial">
          <div style={{flex:1}}>
            <h2 style={{fontSize:26, fontWeight:800, margin:0}}>Ready to stop missing leads?</h2>
            <p style={{color:'var(--muted)', marginTop:8}}>Start your free trial, or get a custom demo for your business. No credit card required.</p>
          </div>

          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <a href="/signup" className="btn-primary">Start Free</a>
            <a href="/demo" className="btn-ghost">Book a demo</a>
          </div>
        </section>

        {/* CONTACT CTA */}
        <section id="contact" className="lp-section-band lp-band-3" aria-label="Contact sales">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap'}}>
            <div style={{flex:1}}>
              <h3 style={{fontSize:20, fontWeight:800, margin:0}}>Need help deciding?</h3>
              <p style={{color:'var(--muted)', marginTop:6}}>Our product experts can recommend the right plan and migration path for you.</p>
            </div>
            <div style={{display:'flex', gap:12}}>
              <a className="btn-ghost" href="/contact">Contact sales</a>
              <a className="btn-primary" href="/signup">Start free</a>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{marginTop:28, color:'var(--muted)', borderTop:'1px solid rgba(255,255,255,0.02)', paddingTop:18}}>
          <div style={{display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', flexWrap:'wrap'}}>
            <div>© {new Date().getFullYear()} MyCalls — Built for teams.</div>
            <div>
              <a href="/privacy" style={{marginRight:12, color:'var(--muted)'}}>Privacy</a>
              <a href="/terms" style={{color:'var(--muted)'}}>Terms</a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
