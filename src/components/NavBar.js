// src/components/NavBar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import useUserProfile from '../hooks/useUserProfile';
import { signOutUser } from '../services/authService';
import './NavBar.css';

export default function NavBar() {
  const { user, profile } = useUserProfile();

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="navbar-brand">
        Admin Panel
      </div>

      {/* Links */}
      <div className="nav-links">
        <Link to="/dashboard" className="nav-link">Dashboard</Link>

        {profile?.role === 'admin' && (
          <>
            <Link to="/leads" className="nav-link">Leads</Link>
            <Link to="/calls" className="nav-link">Calls</Link>
            <Link to="/tenants" className="nav-link">Tenants</Link>
          </>
        )}

        {user ? (
          <>
            <span className="nav-profile">
              {profile?.displayName ? profile.displayName : user.email}
            </span>

            <button
              className="nav-button"
              onClick={() => signOutUser()}
            >
              Sign out
            </button>
          </>
        ) : (
          <Link to="/login" className="nav-link">Login</Link>
        )}
      </div>
    </nav>
  );
}
