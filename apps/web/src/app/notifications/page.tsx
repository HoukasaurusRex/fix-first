'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../components/protected-route';
import { useApi } from '../../hooks/use-api';
import type { UserProductDetail, WarrantySummary } from '@fixfirst/shared-types';

type NotificationPrefs = {
  id?: string;
  emailEnabled: boolean;
  daysBeforeExpiry: number;
};

type ExpiringItem = {
  userProductId: string;
  productName: string;
  warrantyType: string;
  daysLeft: number;
  endDate: string;
};

function getExpiringWarranties(products: UserProductDetail[], withinDays: number): ExpiringItem[] {
  const now = Date.now();
  const cutoff = now + withinDays * 24 * 60 * 60 * 1000;
  const items: ExpiringItem[] = [];
  for (const up of products) {
    for (const w of up.warranties as WarrantySummary[]) {
      if (!w.endDate) continue;
      const end = new Date(w.endDate).getTime();
      if (end > now && end <= cutoff) {
        items.push({
          userProductId: up.id,
          productName: `${up.product.brand} ${up.product.model}`,
          warrantyType: w.type,
          daysLeft: Math.ceil((end - now) / (24 * 60 * 60 * 1000)),
          endDate: w.endDate,
        });
      }
    }
  }
  return items.sort((a, b) => a.daysLeft - b.daysLeft);
}

function NotificationsContent() {
  const { request } = useApi();
  const [products, setProducts] = useState<UserProductDetail[]>([]);
  const [prefs, setPrefs] = useState<NotificationPrefs>({ emailEnabled: true, daysBeforeExpiry: 30 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      request<UserProductDetail[]>('/user-products'),
      request<NotificationPrefs>('/users/me/notification-prefs').catch(() => null),
    ]).then(([prods, prefsData]) => {
      setProducts(prods);
      if (prefsData) setPrefs(prefsData);
    }).finally(() => setLoading(false));
  }, [request]);

  const handleSavePrefs = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await request('/users/me/notification-prefs', {
        method: 'PATCH',
        body: JSON.stringify(prefs),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const expiring = getExpiringWarranties(products, 60);

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <Link href="/dashboard">← Dashboard</Link>
      <h1>Notifications</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Warranties expiring within 60 days</h2>
        {loading && <p>Loading…</p>}
        {!loading && expiring.length === 0 && (
          <p style={{ color: '#6b7280' }}>No warranties expiring in the next 60 days.</p>
        )}
        {!loading && expiring.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {expiring.map((item, i) => (
              <li
                key={i}
                style={{
                  marginBottom: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: item.daysLeft <= 7 ? '#fef2f2' : item.daysLeft <= 30 ? '#fffbeb' : '#f9fafb',
                  border: `1px solid ${item.daysLeft <= 7 ? '#fca5a5' : item.daysLeft <= 30 ? '#fcd34d' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <Link href={`/products/${item.userProductId}`}>
                    <strong>{item.productName}</strong>
                  </Link>
                  <span style={{ marginLeft: '0.5rem', color: '#6b7280', textTransform: 'capitalize' }}>
                    ({item.warrantyType})
                  </span>
                </div>
                <span
                  style={{
                    fontWeight: 600,
                    color: item.daysLeft <= 7 ? '#dc2626' : item.daysLeft <= 30 ? '#d97706' : '#374151',
                  }}
                >
                  {item.daysLeft} day{item.daysLeft !== 1 ? 's' : ''} left
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Notification preferences</h2>
        <form onSubmit={handleSavePrefs} style={{ maxWidth: '400px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="checkbox"
              checked={prefs.emailEnabled}
              onChange={(e) => setPrefs((p) => ({ ...p, emailEnabled: e.target.checked }))}
            />
            Email notifications enabled
          </label>
          <label>
            Alert me this many days before expiry
            <input
              type="number"
              min={1}
              max={365}
              value={prefs.daysBeforeExpiry}
              onChange={(e) => setPrefs((p) => ({ ...p, daysBeforeExpiry: parseInt(e.target.value, 10) || 30 }))}
              style={{ display: 'block', marginTop: '0.25rem', width: '80px' }}
            />
          </label>
          {saved && <p style={{ color: '#22c55e', marginTop: '0.5rem' }}>Saved.</p>}
          <button type="submit" disabled={saving} style={{ marginTop: '1rem' }}>
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}
