'use client';

import { ProtectedRoute } from '../../components/protected-route';
import { useAuth } from '../../context/auth';

function DashboardContent() {
  const { user, logout } = useAuth();

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name ?? user?.email}!</p>
      <button onClick={logout}>Sign out</button>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
