// src/pages/Landing.jsx
import React, { useEffect, useRef, useState } from "react";
import "./Landing.css";

export default function Landing() {
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const rafRef = useRef(null);
  const particleRef = useRef(null);
  const hologramRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ------------------ LOADER LOGIC ------------------ */
    // Hide loader once content "ready" or fallback after timeout
    let loaderTimeout = null;
    function hideLoaderSoon() {
      // small delay so UX sees loader briefly (polish)
      loaderTimeout = setTimeout(() => setLoading(false), 600);
    }

    // Consider page "ready" when DOM and fonts loaded - use window 'load' as baseline
    if (document.readyState === "complete") {
      hideLoaderSoon();
    } else {
      window.addEventListener("load", hideLoaderSoon);
      // Fallback in case 'load' never fires quickly (e.g. SPA hydration)
      loaderTimeout = setTimeout(() => setLoading(false), 2400);
    }

    /* ------------------ TILT ------------------ */
    function applyTilt(el, cfg = { maxRotateX: 7.5, maxRotateY: 7.5, depth: 8 }) {
      if (!el || prefersReduced) return () => {};
      let rect = el.getBoundingClientRect();
      let rAF = null;
      const current = { rx: 0, ry: 0, tz: 0 };

      function updateRect() { rect = el.getBoundingClientRect(); }

      function onMove(e) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const px = (x / rect.width) * 2 - 1; // -1..1
        const py = (y / rect.height) * 2 - 1; // -1..1

        const rotY = cfg.maxRotateY * px;
        const rotX = cfg.maxRotateX * -py;
        const tz = cfg.depth * (1 - Math.abs(px));

        current.rx = rotX;
        current.ry = rotY;
        current.tz = tz;

        if (!rAF) rAF = requestAnimationFrame(animate);
      }

      function animate() {
        el.style.transform = `perspective(1200px) rotateX(${current.rx}deg) rotateY(${current.ry}deg) translateZ(${current.tz}px)`;
        rAF = null;
      }

      function onLeave() {
        // Smooth reset
        el.style.transition = "transform 500ms cubic-bezier(.2,.8,.2,1)";
        el.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) translateZ(0px)`;
        setTimeout(() => (el.style.transition = ""), 520);
      }

      window.addEventListener("resize", updateRect);
      el.addEventListener("mousemove", onMove);
      el.addEventListener("touchmove", onMove, { passive: true });
      el.addEventListener("mouseleave", onLeave);
      el.addEventListener("touchend", onLeave);

      // return cleanup
      return () => {
        window.removeEventListener("resize", updateRect);
        el.removeEventListener("mousemove", onMove);
        el.removeEventListener("touchmove", onMove);
        el.removeEventListener("mouseleave", onLeave);
        el.removeEventListener("touchend", onLeave);
        if (rAF) cancelAnimationFrame(rAF);
      };
    }

    /* ------------------ PARALLAX BG ------------------ */
    function attachParallax(rootEl) {
      if (!rootEl || prefersReduced) return () => {};
      let loop = null;
      let lastX = 0, lastY = 0;

      function onMove(e) {
        const x = e.clientX || (e.touches && e.touches[0].clientX) || window.innerWidth / 2;
        const y = e.clientY || (e.touches && e.touches[0].clientY) || window.innerHeight / 2;
        lastX = (x / window.innerWidth - 0.5) * 20; // smaller shift
        lastY = (y / window.innerHeight - 0.5) * 12;
        if (!loop) loop = requestAnimationFrame(() => {
          rootEl.style.backgroundPosition = `${50 + lastX}% ${40 + lastY}%`;
          loop = null;
        });
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("touchmove", onMove, { passive: true });

      return () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("touchmove", onMove);
        if (loop) cancelAnimationFrame(loop);
      };
    }

    /* ------------------ PARTICLES (CANVAS) ------------------ */
    function createParticles(container) {
      if (!container || prefersReduced) return () => {};
      // create canvas
      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = 0;
      container.appendChild(canvas);
      particleRef.current = canvas;
      const ctx = canvas.getContext("2d");
      let w = canvas.width = container.offsetWidth;
      let h = canvas.height = container.offsetHeight;
      let particles = [];
      const count = Math.max(18, Math.round(w * 0.02));

      function rand(a, b) { return Math.random() * (b - a) + a; }

      function init() {
        particles = [];
        for (let i = 0; i < count; i++) {
          particles.push({
            x: rand(0, w),
            y: rand(0, h),
            r: rand(0.6, 3.2),
            vx: rand(-0.2, 0.2),
            vy: rand(-0.05, 0.05),
            a: rand(0.06, 0.35)
          });
        }
      }

      function resize() {
        w = canvas.width = container.offsetWidth;
        h = canvas.height = container.offsetHeight;
        init();
      }

      function draw() {
        ctx.clearRect(0, 0, w, h);
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10;
          if (p.y > h + 10) p.y = -10;
          ctx.beginPath();
          ctx.fillStyle = `rgba(99,102,241, ${p.a})`;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        rafRef.current = requestAnimationFrame(draw);
      }

      init();
      window.addEventListener("resize", resize);
      rafRef.current = requestAnimationFrame(draw);

      return () => {
        window.removeEventListener("resize", resize);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      };
    }

    /* ------------------ HOLOGRAM (SVG FLOAT) ------------------ */
    function createHologram(el) {
      if (!el || prefersReduced) return () => {};
      // Create a small floating SVG hologram element and animate via JS for subtle movement
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", "0 0 120 120");
      svg.setAttribute("aria-hidden", "true");
      svg.style.position = "absolute";
      svg.style.right = "14px";
      svg.style.top = "14px";
      svg.style.width = "160px";
      svg.style.height = "160px";
      svg.style.zIndex = 5;
      svg.style.pointerEvents = "none";
      svg.style.opacity = "0.95";

      // create layered shapes (crystal + glow)
      const glow = document.createElementNS(svgNS, "circle");
      glow.setAttribute("cx", "60");
      glow.setAttribute("cy", "60");
      glow.setAttribute("r", "38");
      glow.setAttribute("fill", "none");
      glow.setAttribute("stroke", "rgba(99,102,241,0.18)");
      glow.setAttribute("stroke-width", "12");
      glow.setAttribute("filter", "url(#gblur)");

      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("transform", "translate(0,6)");

      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", "M60 20 L92 64 L60 100 L28 64 Z");
      path.setAttribute("fill", "url(#grad1)");
      path.setAttribute("opacity", "0.95");
      path.setAttribute("transform-origin", "60px 60px");

      // defs
      const defs = document.createElementNS(svgNS, "defs");
      const grad = document.createElementNS(svgNS, "linearGradient");
      grad.setAttribute("id", "grad1");
      grad.setAttribute("x1", "0%");
      grad.setAttribute("x2", "100%");
      const s1 = document.createElementNS(svgNS, "stop");
      s1.setAttribute("offset", "0%");
      s1.setAttribute("stop-color", "#6b73ff");
      s1.setAttribute("stop-opacity", "0.95");
      const s2 = document.createElementNS(svgNS, "stop");
      s2.setAttribute("offset", "100%");
      s2.setAttribute("stop-color", "#08bde6");
      s2.setAttribute("stop-opacity", "0.9");
      grad.appendChild(s1);
      grad.appendChild(s2);

      const filter = document.createElementNS(svgNS, "filter");
      filter.setAttribute("id", "gblur");
      const feGaussian = document.createElementNS(svgNS, "feGaussianBlur");
      feGaussian.setAttribute("stdDeviation", "6");
      feGaussian.setAttribute("result", "blur");
      filter.appendChild(feGaussian);

      defs.appendChild(grad);
      defs.appendChild(filter);

      svg.appendChild(defs);
      svg.appendChild(glow);
      g.appendChild(path);
      svg.appendChild(g);

      el.appendChild(svg);
      hologramRef.current = svg;

      // simple bobbing animation using requestAnimationFrame
      let t = 0;
      let rafId = null;
      function bob() {
        t += 0.015;
        const y = Math.sin(t) * 8; // vertical bob
        const rot = Math.sin(t * 0.6) * 6; // tilt
        svg.style.transform = `translate3d(0px, ${y}px, 0px) rotateZ(${rot}deg)`;
        rafId = requestAnimationFrame(bob);
      }
      rafId = requestAnimationFrame(bob);

      // Mouse parallax for hologram (subtle)
      function onMove(e) {
        const mx = (e.clientX / window.innerWidth - 0.5) * 16;
        const my = (e.clientY / window.innerHeight - 0.5) * 10;
        svg.style.transform = `translate3d(${mx}px, ${Math.sin(t) * 8 + my}px, 0px) rotateZ(${Math.sin(t * 0.6) * 6}deg)`;
      }
      window.addEventListener("mousemove", onMove);

      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener("mousemove", onMove);
        if (svg.parentNode) svg.parentNode.removeChild(svg);
      };
    }

    /* ------------------ SMOOTH ANCHOR SCROLL ------------------ */
    function enhanceAnchors() {
      const anchors = Array.from(document.querySelectorAll('a[href^="#"]'));
      for (const a of anchors) {
        a.addEventListener("click", (ev) => {
          const href = a.getAttribute("href");
          const target = document.querySelector(href);
          if (!target) return;
          ev.preventDefault();
          target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
        });
      }
    }

    /* ------------------ INITIALIZE EFFECTS ------------------ */
    const disposers = [];
    if (rootRef.current) {
      disposers.push(attachParallax(rootRef.current));
    }

    // apply tilt to hero card
    if (heroRef.current) {
      disposers.push(applyTilt(heroRef.current, { maxRotateX: 8.5, maxRotateY: 8.5, depth: 14 }));
      // add particles under hero card
      disposers.push(createParticles(heroRef.current));
      // add hologram inside hero card
      disposers.push(createHologram(heroRef.current));
    }

    // apply tilt to all feature cards
    const featureCards = Array.from(document.querySelectorAll(".feature-card"));
    featureCards.forEach((fc) => {
      disposers.push(applyTilt(fc, { maxRotateX: 6, maxRotateY: 6, depth: 6 }));
    });

    enhanceAnchors();

    // cleanup on unmount
    return () => {
      if (loaderTimeout) clearTimeout(loaderTimeout);
      disposers.forEach((d) => {
        try {
          if (typeof d === "function") d();
        } catch (e) {}
      });
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ------------------ RENDER ------------------ */
  return (
    <>
      {/* LOADER */}
      {loading && (
        <div className="loader-screen" role="status" aria-label="Loading">
          <div className="loader-grid" aria-hidden="true" />
          <div className="loader-ring" aria-hidden="true" />
        </div>
      )}

      <div className="landing-root" ref={rootRef}>
        {/* NAVBAR */}
        <header className="landing-nav">
          <div className="landing-nav-left" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div className="landing-logo-circle">C</div>
            <div className="landing-logo-text">
              <div className="landing-logo-title">Call Leads CRM</div>
              <div className="landing-logo-sub" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Call-first lead tracking
              </div>
            </div>
          </div>

          <nav className="landing-nav-links" aria-label="Primary">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="landing-nav-actions">
            <a href="/login" className="btn-ghost">Log in</a>
            <a href="/login" className="btn-primary">Go to Dashboard</a>
          </div>
        </header>

        {/* HERO */}
        <main className="landing-main" style={{ padding: "20px 6vw 60px", perspective: 1200 }}>
          <section className="landing-hero">
            <div className="landing-hero-text">
              <h1>
                Never lose a lead
                <br />
                because of a missed call.
              </h1>
              <p className="landing-hero-sub" style={{ color: "var(--text-muted)", maxWidth: 520 }}>
                Call Leads CRM connects your phone calls to a simple web dashboard. Track leads, follow-ups, missed & rejected
                calls and exports — all in one place.
              </p>

              <div className="landing-hero-actions" style={{ marginTop: 18 }}>
                <a href="/login" className="btn-primary btn-lg">Start tracking calls</a>
                <a href="#features" className="btn-ghost btn-lg" style={{ marginLeft: 10 }}>View features</a>
              </div>

              <div className="landing-hero-highlights" style={{ marginTop: 12 }}>
                <div className="highlight-pill">📞 Auto call logging</div>
                <div className="highlight-pill">⚡ Missed / Rejected detection</div>
                <div className="highlight-pill">🧮 Admin multi-user view</div>
                <div className="highlight-pill">📊 CSV export</div>
              </div>
            </div>

            <div className="landing-hero-card tilt" ref={heroRef}>
              <div className="hero-card-header">
                <span className="hero-pill">Live preview</span>
                <span className="hero-pill-muted">Admin dashboard</span>
              </div>

              <div className="hero-stats-grid">
                <div className="hero-stat-card">
                  <div className="stat-label">Total leads</div>
                  <div className="stat-value">248</div>
                  <div className="stat-trend positive">+32 today</div>
                </div>
                <div className="hero-stat-card">
                  <div className="stat-label">Calls</div>
                  <div className="stat-value">731</div>
                  <div className="stat-trend">Last 7 days</div>
                </div>
                <div className="hero-stat-card">
                  <div className="stat-label">Missed calls</div>
                  <div className="stat-value red">27</div>
                  <div className="stat-trend">Need attention</div>
                </div>
                <div className="hero-stat-card">
                  <div className="stat-label">Follow-ups today</div>
                  <div className="stat-value orange">14</div>
                  <div className="stat-trend">Due now</div>
                </div>
              </div>

              <div className="hero-mini-list">
                <div className="mini-list-row">
                  <div className="mini-avatar">VA</div>
                  <div className="mini-text">
                    <div className="mini-title">Vaibhav — Wedding lead</div>
                    <div className="mini-sub">Next follow-up: Today, 4:30 PM</div>
                  </div>
                  <span className="mini-status-pill">Follow up</span>
                </div>

                <div className="mini-list-row">
                  <div className="mini-avatar">IN</div>
                  <div className="mini-text">
                    <div className="mini-title">Incoming missed call</div>
                    <div className="mini-sub">+91···1234 · Missed 5m ago</div>
                  </div>
                  <span className="mini-status-pill red">Missed</span>
                </div>

                <div className="mini-list-row">
                  <div className="mini-avatar">AD</div>
                  <div className="mini-text">
                    <div className="mini-title">Admin overview</div>
                    <div className="mini-sub">3 users connected · Live sync</div>
                  </div>
                  <span className="mini-status-pill green">Online</span>
                </div>
              </div>
            </div>
          </section>

          {/* FEATURES */}
          <section id="features" className="landing-section" style={{ marginTop: 60 }}>
            <div className="section-heading">
              <h2>Built for call-heavy businesses</h2>
              <p style={{ color: "var(--text-muted)" }}>
                Whether you close deals on the phone or collect leads from enquiries, Call Leads CRM keeps everything organized.
              </p>
            </div>

            <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div className="feature-card"><div className="feature-icon">📱</div><h3>Sync from phone call log</h3><p>Capture calls directly from your call log — inbound and outbound.</p></div>
              <div className="feature-card"><div className="feature-icon">🎯</div><h3>Missed &amp; rejected detection</h3><p>Smart logic to mark calls as <strong>Missed</strong> or <strong>Rejected</strong>.</p></div>
              <div className="feature-card"><div className="feature-icon">👥</div><h3>Leads with latest call</h3><p>Each lead shows the most recent call, status and follow-up date.</p></div>
              <div className="feature-card"><div className="feature-icon">🧑‍💼</div><h3>Multi-user admin</h3><p>Admins can connect specific users and see only those accounts.</p></div>
              <div className="feature-card"><div className="feature-icon">📊</div><h3>Clean analytics</h3><p>Quick overview of total calls, inbound vs outbound, missed vs rejected.</p></div>
              <div className="feature-card"><div className="feature-icon">⬇️</div><h3>CSV exports</h3><p>Export filtered calls and leads straight to CSV for reports.</p></div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section id="how-it-works" className="landing-section landing-section-alt" style={{ marginTop: 60 }}>
            <div className="section-heading">
              <h2>How it works</h2>
              <p style={{ color: "var(--text-muted)" }}>From phone call to trackable lead in just a few steps.</p>
            </div>

            <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div className="step-card"><div className="step-number">1</div><h3>Install and connect</h3><p>Log in to the admin dashboard and create user accounts.</p></div>
              <div className="step-card"><div className="step-number">2</div><h3>Sync call activity</h3><p>Use the mobile app to sync calls from your phone log.</p></div>
              <div className="step-card"><div className="step-number">3</div><h3>Work your leads</h3><p>See all calls and leads in one place and export if needed.</p></div>
            </div>
          </section>

          {/* PRICING */}
          <section id="pricing" className="landing-section" style={{ marginTop: 60 }}>
            <div className="section-heading"><h2>Simple pricing</h2><p style={{ color: "var(--text-muted)" }}>Start small, grow with your team. No complicated plans.</p></div>
            <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
              <div className="pricing-card"><div className="pricing-label">For single business</div><div className="pricing-price"><span className="pricing-currency">₹</span>— <span className="pricing-period">/ month</span></div><p className="pricing-note">Placeholder block.</p><ul className="pricing-list"><li>1 user</li><li>Unlimited calls &amp; leads</li></ul><a href="/login" className="btn-primary btn-full">Use for my business</a></div>

              <div className="pricing-card featured"><div className="pricing-label">For agencies / admins</div><div className="pricing-price"><span className="pricing-currency">₹</span>— <span className="pricing-period">/ month</span></div><p className="pricing-note">Manage multiple users.</p><ul className="pricing-list"><li>Multiple users</li><li>Admin dashboard &amp; filters</li></ul><a href="/login" className="btn-primary btn-full">I\u2019m an admin / reseller</a></div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="landing-section landing-section-alt" style={{ marginTop: 60 }}>
            <div className="section-heading"><h2>FAQ</h2><p style={{ color: "var(--text-muted)" }}>Quick answers to common questions.</p></div>
            <div className="faq-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              <div className="faq-item"><h3>Is this only for one business?</h3><p>No. You can create multiple users.</p></div>
              <div className="faq-item"><h3>How do missed / rejected calls work?</h3><p><strong>Missed</strong> = inbound + 0s or outcome 'missed'.</p></div>
              <div className="faq-item"><h3>Can I export data?</h3><p>Yes. Both Calls and Leads pages have CSV export.</p></div>
              <div className="faq-item"><h3>Who is this for?</h3><p>Anyone who closes business on calls: agencies, studios, small businesses.</p></div>
            </div>
          </section>

          {/* BOTTOM CTA */}
          <section className="landing-section landing-cta" style={{ marginTop: 60 }}>
            <div className="landing-cta-inner">
              <div>
                <h2>Ready to see every lead your calls create?</h2>
                <p style={{ color: "var(--text-muted)" }}>Connect your phone calls to a clean dashboard and stay on top of follow-ups, missed calls and users.</p>
              </div>
              <div className="landing-cta-actions">
                <a href="/login" className="btn-primary btn-lg">Open Dashboard</a>
                <a href="#features" className="btn-ghost btn-lg">Explore features</a>
              </div>
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="landing-footer">
          <div className="landing-footer-inner">
            <div className="footer-left">
              <span className="landing-logo-circle small">C</span>
              <span className="footer-brand">Call Leads CRM</span>
            </div>
            <div className="footer-right"><span>© {new Date().getFullYear()} Call Leads CRM</span><span>Built for call-based teams</span></div>
          </div>
        </footer>
      </div>
    </>
  );
}
