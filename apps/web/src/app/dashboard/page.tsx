'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../components/protected-route';
import { useApi } from '../../hooks/use-api';
import { useAuth } from '../../context/auth';
import type { UserProductDetail, WarrantySummary } from '@fixfirst/shared-types';

function warrantyBadge(warranties: UserProductDetail['warranties']): {
  label: string;
  color: string;
} {
  if (!warranties.length) return { label: 'No warranty', color: '#888' };

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  let hasActive = false;
  let hasExpiringSoon = false;
  let allExpired = true;

  for (const w of warranties) {
    if (w.type === 'lifetime' || w.type === 'statutory') {
      hasActive = true;
      allExpired = false;
      continue;
    }
    if (!w.endDate) continue;
    const end = new Date(w.endDate).getTime();
    if (end > now) {
      allExpired = false;
      hasActive = true;
      if (end - now <= thirtyDays) hasExpiringSoon = true;
    }
  }

  if (hasExpiringSoon) return { label: 'Expiring soon', color: '#f59e0b' };
  if (hasActive) return { label: 'Active', color: '#22c55e' };
  if (allExpired) return { label: 'Expired', color: '#ef4444' };
  return { label: 'No warranty', color: '#888' };
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const { request } = useApi();
  const [products, setProducts] = useState<UserProductDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    request<UserProductDetail[]>('/user-products')
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [request]);

  return (
    <main>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Products</h1>
        <div>
          <span>{user?.name ?? user?.email}</span>
          {' · '}
          <Link href="/notifications">Notifications</Link>
          {' · '}
          <Link href="/account">Settings</Link>
          {' · '}
          <button onClick={logout}>Sign out</button>
        </div>
      </header>

      <Link href="/products/new">+ Add product</Link>
      {' · '}
      <Link href="/documents">Document library</Link>

      {loading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p>No products yet. <Link href="/products/new">Add your first product</Link>.</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {products.map((up) => {
          const badge = warrantyBadge(up.warranties);
          const expiringWarranties = up.warranties.filter((w) => {
            if (w.type === 'lifetime' || w.type === 'statutory' || !w.endDate) return false;
            const ms = new Date(w.endDate).getTime() - Date.now();
            return ms > 0 && ms <= 30 * 24 * 60 * 60 * 1000;
          });

          return (
            <li key={up.id} style={{ marginBottom: '1rem', border: '1px solid #ddd', padding: '1rem' }}>
              <Link href={`/products/${up.id}`}>
                <strong>{up.product.brand} {up.product.model}</strong>
              </Link>
              <span style={{ marginLeft: '0.5rem', color: badge.color }}>
                ● {badge.label}
              </span>
              {expiringWarranties.map((w) => {
                const days = Math.ceil(
                  (new Date(w.endDate!).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
                );
                return (
                  <span
                    key={w.id}
                    style={{
                      marginLeft: '0.5rem',
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                    }}
                  >
                    {days}d left
                  </span>
                );
              })}
              <div style={{ color: '#666', fontSize: '0.9rem' }}>
                {up.product.category}
                {up.retailer && ` · Bought at ${up.retailer}`}
              </div>
            </li>
          );
        })}
      </ul>
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
