// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import useUserProfile from '../hooks/useUserProfile';

export default function ProtectedRoute({ children }) {
  const { user, profile, loading } = useUserProfile();
  if (loading) return <div>Loading…</div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || profile.role !== 'admin') {
    return <div className="p-6">Access denied — admin only.</div>;
  }
  return children;
}
