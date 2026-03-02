'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '../../../components/protected-route';
import { useApi } from '../../../hooks/use-api';
import type { UserProductDetail, WarrantyType } from '@fixfirst/shared-types';

const WARRANTY_TYPES: { value: WarrantyType; label: string; tooltip: string }[] = [
  {
    value: 'manufacturer',
    label: 'Manufacturer',
    tooltip: 'Warranty provided by the product manufacturer for defects.',
  },
  {
    value: 'statutory',
    label: 'Statutory',
    tooltip: 'Legal consumer protection rights under provincial consumer law. No fixed end date.',
  },
  {
    value: 'extended',
    label: 'Extended',
    tooltip: 'An optional extended warranty purchased separately.',
  },
  {
    value: 'lifetime',
    label: 'Lifetime',
    tooltip: 'Warranty that covers the product for its entire lifespan. Never expires.',
  },
];

function statusBadge(type: WarrantyType, endDate: string | null): { label: string; color: string } {
  if (type === 'lifetime') return { label: 'Lifetime', color: '#22c55e' };
  if (type === 'statutory') return { label: 'Statutory (no fixed expiry)', color: '#6366f1' };
  if (!endDate) return { label: 'No end date', color: '#888' };
  const msLeft = new Date(endDate).getTime() - Date.now();
  if (msLeft <= 0) return { label: 'Expired', color: '#ef4444' };
  const days = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  if (days <= 30)
    return {
      label: `Expiring in ${days}d`,
      color: '#f59e0b',
    };
  return { label: `Active (${Math.ceil(days / 30)}mo left)`, color: '#22c55e' };
}

function ProductDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { request } = useApi();
  const router = useRouter();

  const [userProduct, setUserProduct] = useState<UserProductDetail | null>(null);
  const [loadError, setLoadError] = useState('');

  const [type, setType] = useState<WarrantyType>('manufacturer');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [provider, setProvider] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = () =>
    request<UserProductDetail[]>('/user-products')
      .then((items) => {
        const found = items.find((u) => u.id === id);
        if (!found) { router.push('/dashboard'); return; }
        setUserProduct(found);
      })
      .catch((err) => setLoadError(err.message));

  useEffect(() => { load(); }, [id]);

  const handleAddWarranty = async (e: FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAdding(true);
    try {
      await request(`/user-products/${id}/warranties`, {
        method: 'POST',
        body: JSON.stringify({
          type,
          startDate,
          endDate: (type === 'lifetime' || type === 'statutory') ? null : (endDate || null),
          provider: provider || undefined,
        }),
      });
      await load();
      setStartDate('');
      setEndDate('');
      setProvider('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add warranty');
    } finally {
      setAdding(false);
    }
  };

  if (loadError) return <p role="alert">{loadError}</p>;
  if (!userProduct) return <p>Loading…</p>;

  const { product, warranties } = userProduct;
  const noEndDate = type === 'lifetime' || type === 'statutory';

  return (
    <main>
      <Link href="/dashboard">← Back to dashboard</Link>
      <h1>{product.brand} {product.model}</h1>
      <p>{product.category}</p>
      {userProduct.retailer && <p>Purchased at {userProduct.retailer}</p>}
      {userProduct.purchasedAt && (
        <p>Purchase date: {new Date(userProduct.purchasedAt).toLocaleDateString()}</p>
      )}

      <h2>Warranties</h2>
      {warranties.length === 0 ? (
        <p>No warranties yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {warranties.map((w) => {
            const badge = statusBadge(w.type as WarrantyType, w.endDate);
            return (
              <li key={w.id} style={{ marginBottom: '0.5rem' }}>
                <strong style={{ textTransform: 'capitalize' }}>{w.type}</strong>
                {' '}
                <span style={{ color: badge.color }}>● {badge.label}</span>
              </li>
            );
          })}
        </ul>
      )}

      <h2>Add warranty</h2>
      <form onSubmit={handleAddWarranty}>
        <fieldset>
          <legend>Warranty type</legend>
          {WARRANTY_TYPES.map((t) => (
            <label key={t.value} title={t.tooltip} style={{ display: 'block', marginBottom: '0.25rem' }}>
              <input
                type="radio"
                name="warrantyType"
                value={t.value}
                checked={type === t.value}
                onChange={() => setType(t.value)}
              />
              {' '}{t.label}
              <span style={{ color: '#888', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                ({t.tooltip})
              </span>
            </label>
          ))}
        </fieldset>

        <label>
          Start date *
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </label>

        {!noEndDate && (
          <label>
            End date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        )}

        <label>
          Provider / Retailer
          <input
            type="text"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="e.g. Dyson, Best Buy Protection Plan"
          />
        </label>

        {addError && <p role="alert">{addError}</p>}
        <button type="submit" disabled={adding}>
          {adding ? 'Adding…' : 'Add warranty'}
        </button>
      </form>
    </main>
  );
}

export default function ProductDetailPage() {
  return (
    <ProtectedRoute>
      <ProductDetailContent />
    </ProtectedRoute>
  );
}
