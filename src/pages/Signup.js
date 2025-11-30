// src/pages/Signup.jsx
import React, { useState } from 'react';
import { signupWithEmail } from '../services/authService';
import { useNavigate, Link } from 'react-router-dom';
import './Signup.css';

export default function Signup() {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [displayName,setDisplayName]=useState('');
  const [err,setErr]=useState(null);
  const [loading,setLoading]=useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await signupWithEmail(email, password, displayName);
      nav('/dashboard');
    } catch (ex) {
      setErr(ex.message || 'Signup failed');
      console.error('signup error', ex);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-full">
      <div className="bg-gradient" />
      <div className="blob b1" aria-hidden />
      <div className="blob b2" aria-hidden />
      <div className="particles" aria-hidden />

      <div className="signup-card" role="form" aria-labelledby="signup-heading">
        <h2 id="signup-heading">Create your account</h2>
        <div className="sub">Join the admin panel — use your organization email.</div>

        {err && <div className="error-box" role="alert">{err}</div>}

        <form onSubmit={submit} className="form-row" autoComplete="on">
          <input
            className="input"
            type="text"
            placeholder="Full name"
            value={displayName}
            onChange={e=>setDisplayName(e.target.value)}
            required
            aria-label="Full name"
          />
          <input
            className="input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
            aria-label="Email address"
          />
          <input
            className="input"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            required
            minLength={6}
            aria-label="Password"
          />

          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Creating…' : 'Create account'}
            </button>

            <div style={{marginLeft:'auto', fontSize:13, color:'var(--muted)'}}>
              <Link to="/login" className="link">Already have an account?</Link>
            </div>
          </div>
        </form>

        <div className="signup-footer">
          By continuing you agree to our <Link to="/terms" className="link">Terms</Link> and <Link to="/privacy" className="link">Privacy</Link>.
        </div>
      </div>
    </div>
  );
}
