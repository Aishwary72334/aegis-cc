import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-hud-bg flex items-center justify-center font-sans">
        <div className="relative w-16 h-16 border-2 border-hud-border rounded-full animate-spin border-t-hud-accent">
          <div className="absolute inset-2 border border-hud-border rounded-full animate-ping border-t-hud-accent opacity-30"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
