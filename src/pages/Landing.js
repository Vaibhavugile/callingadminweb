// src/pages/Landing.jsx
import React from "react";
import "./Landing.css";

export default function Landing() {
  return (
    <div className="landing-root">
      {/* NAVBAR */}
      <header className="landing-nav">
        <div className="landing-nav-left">
          <div className="landing-logo-circle">C</div>
          <div className="landing-logo-text">
            <div className="landing-logo-title">Call Leads CRM</div>
            <div className="landing-logo-sub">Call-first lead tracking</div>
          </div>
        </div>

        <nav className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="landing-nav-actions">
          <a href="/login" className="btn-ghost">
            Log in
          </a>
          <a href="/login" className="btn-primary">
            Go to Dashboard
          </a>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-text">
            <h1>
              Never lose a lead
              <br />
              because of a missed call.
            </h1>
            <p className="landing-hero-sub">
              Call Leads CRM connects your phone calls to a simple web dashboard.
              Track leads, follow-ups, missed &amp; rejected calls and exports —
              all in one place.
            </p>

            <div className="landing-hero-actions">
              <a href="/login" className="btn-primary btn-lg">
                Start tracking calls
              </a>
              <a href="#features" className="btn-ghost btn-lg">
                View features
              </a>
            </div>

            <div className="landing-hero-highlights">
              <div className="highlight-pill">📞 Auto call logging</div>
              <div className="highlight-pill">⚡ Missed / Rejected detection</div>
              <div className="highlight-pill">🧮 Admin multi-tenant view</div>
              <div className="highlight-pill">📊 CSV export</div>
            </div>
          </div>

          <div className="landing-hero-card">
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
                  <div className="mini-sub">3 tenants connected · Live sync</div>
                </div>
                <span className="mini-status-pill green">Online</span>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="landing-section">
          <div className="section-heading">
            <h2>Built for call-heavy businesses</h2>
            <p>
              Whether you close deals on the phone or collect leads from
              enquiries, Call Leads CRM keeps everything organized.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Sync from phone call log</h3>
              <p>
                Capture calls directly from your call log — inbound and outbound.
                Fix today, last 7 days or last 30 days with a single tap.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Missed &amp; rejected detection</h3>
              <p>
                Smart logic to mark calls as <strong>Missed</strong> or{" "}
                <strong>Rejected</strong> based on direction and duration, the
                same way your mobile app does.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Leads with latest call</h3>
              <p>
                Each lead shows the most recent call, status, duration and
                follow-up date — so you always know where things stand.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🧑‍💼</div>
              <h3>Multi-tenant admin</h3>
              <p>
                Admins can connect specific tenants and see only those accounts
                across dashboard, calls and leads (with CSV exports).
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Clean analytics</h3>
              <p>
                Quick overview of total calls, inbound vs outbound, missed vs
                rejected and total talk time — per tenant or across tenants.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⬇️</div>
              <h3>CSV exports</h3>
              <p>
                Export filtered calls and leads (including latest call fields)
                straight to CSV for reports, billing or external tools.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="landing-section landing-section-alt">
          <div className="section-heading">
            <h2>How it works</h2>
            <p>From phone call to trackable lead in just a few steps.</p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Install and connect</h3>
              <p>
                Log in to the admin dashboard, create tenant accounts and connect
                them to your own admin profile.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Sync call activity</h3>
              <p>
                Use the mobile app to sync calls from your phone log — today,
                last 7 days or last 30 days. Leads are automatically attached.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Work your leads</h3>
              <p>
                See all calls and leads in one place, filter by tenant,
                follow-ups, missed/rejected and export if needed.
              </p>
            </div>
          </div>
        </section>

        {/* PRICING (simple placeholder style) */}
        <section id="pricing" className="landing-section">
          <div className="section-heading">
            <h2>Simple pricing</h2>
            <p>Start small, grow with your team. No complicated plans.</p>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-label">For single business</div>
              <div className="pricing-price">
                <span className="pricing-currency">₹</span>—{" "}
                <span className="pricing-period">/ month</span>
              </div>
              <p className="pricing-note">
                Decide your final price later — this is just a placeholder block
                in the UI.
              </p>
              <ul className="pricing-list">
                <li>1 tenant</li>
                <li>Unlimited calls &amp; leads</li>
                <li>Missed &amp; rejected detection</li>
                <li>CSV export</li>
              </ul>
              <a href="/login" className="btn-primary btn-full">
                Use for my business
              </a>
            </div>

            <div className="pricing-card featured">
              <div className="pricing-label">For agencies / admins</div>
              <div className="pricing-price">
                <span className="pricing-currency">₹</span>—{" "}
                <span className="pricing-period">/ month</span>
              </div>
              <p className="pricing-note">
                Manage multiple tenants, connect only the ones you need and see
                them in a single dashboard.
              </p>
              <ul className="pricing-list">
                <li>Multiple tenants</li>
                <li>Admin dashboard &amp; filters</li>
                <li>Per-tenant stats</li>
                <li>Full CSV export (calls &amp; leads)</li>
              </ul>
              <a href="/login" className="btn-primary btn-full">
                I’m an admin / reseller
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="landing-section landing-section-alt">
          <div className="section-heading">
            <h2>FAQ</h2>
            <p>Quick answers to common questions.</p>
          </div>

          <div className="faq-grid">
            <div className="faq-item">
              <h3>Is this only for one business?</h3>
              <p>
                No. You can create multiple tenants. Each tenant has its own
                leads &amp; calls. As an admin you can connect tenants to
                yourself and see only those across Dashboard, Calls and Leads.
              </p>
            </div>

            <div className="faq-item">
              <h3>How do missed / rejected calls work?</h3>
              <p>
                The system uses the same rules as your app:
                <br />
                <strong>Missed</strong> = inbound + 0s or outcome 'missed'.
                <br />
                <strong>Rejected</strong> = outbound + 0s or outcome 'rejected'.
              </p>
            </div>

            <div className="faq-item">
              <h3>Can I export data?</h3>
              <p>
                Yes. Both Calls and Leads pages have CSV export. Exports respect
                your current filters (tenant, dates, search, status, etc.).
              </p>
            </div>

            <div className="faq-item">
              <h3>Who is this for?</h3>
              <p>
                Anyone who closes business on calls: agencies, studios, small
                businesses, resellers managing multiple clients and more.
              </p>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="landing-section landing-cta">
          <div className="landing-cta-inner">
            <div>
              <h2>Ready to see every lead your calls create?</h2>
              <p>
                Connect your phone calls to a clean dashboard and stay on top of
                follow-ups, missed calls and tenants.
              </p>
            </div>
            <div className="landing-cta-actions">
              <a href="/login" className="btn-primary btn-lg">
                Open Dashboard
              </a>
              <a href="#features" className="btn-ghost btn-lg">
                Explore features
              </a>
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
          <div className="footer-right">
            <span>© {new Date().getFullYear()} Call Leads CRM</span>
            <span>Built for call-based teams</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
