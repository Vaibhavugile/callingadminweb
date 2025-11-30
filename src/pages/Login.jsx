// src/pages/Login.jsx
import React, { useState } from 'react';
import { signInEmail, signInWithGoogle } from '../services/authService';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [err,setErr]=useState(null);
  const [loading,setLoading]=useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await signInEmail(email, password);
      nav('/dashboard');
    } catch (ex) { setErr(ex.message || 'Sign-in failed'); }
    setLoading(false);
  };

  const onGoogle = async () => {
    setErr(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      nav('/dashboard');
    } catch (ex) { setErr(ex.message || 'Google sign-in failed'); }
    setLoading(false);
  };

  return (
    <div className="login-full">
      <div className="bg-gradient" />
      <div className="blob b1" aria-hidden />
      <div className="blob b2" aria-hidden />
      <div className="particles" aria-hidden />

      <div className="login-card" role="form" aria-labelledby="login-heading">
        <h2 id="login-heading">Welcome back</h2>
        <div className="sub">Sign in to access the admin dashboard</div>

        {err && <div className="error-box" role="alert">{err}</div>}

        <form onSubmit={submit} className="form-row" autoComplete="on">
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
            aria-label="Email"
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            required
            aria-label="Password"
          />
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <button type="button" className="btn btn-google" onClick={onGoogle} disabled={loading}>
              <span className="google-inner">
                <svg className="google-logo" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false">
                  <path fill="#4285f4" d="M533.5 278.4c0-18.8-1.5-37-4.4-54.6H272v103.4h146.9c-6.3 34.1-25.6 63-54.6 82.3v68.2h88.2c51.6-47.6 81-118 81-199.3z"/>
                  <path fill="#34a853" d="M272 544.3c73.5 0 135-24.4 180-66.3l-88.2-68.2c-24.5 16.5-56 26.2-91.8 26.2-70.6 0-130.4-47.6-151.8-111.6H30.6v70.2C75 488.5 167 544.3 272 544.3z"/>
                  <path fill="#fbbc04" d="M120.2 323.9c-6.7-20.1-10.6-41.5-10.6-63.9s3.9-43.8 10.6-63.9V125.9H30.6C11 169.1 0 214.7 0 259.9s11 90.8 30.6 134.1l89.6-70.1z"/>
                  <path fill="#ea4335" d="M272 107.7c39.9 0 75.7 13.7 103.9 40.6l78-78C399 24.5 338 0 272 0 167 0 75 55.8 30.6 139.9l89.6 70.2C141.6 155.3 201.4 107.7 272 107.7z"/>
                </svg>
                <span>{loading ? 'Please wait' : 'Sign in with Google'}</span>
              </span>
            </button>
          </div>
        </form>

        <div className="login-footer">
          <div className="small-muted">
            Don’t have an account? <Link to="/signup" className="link">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
