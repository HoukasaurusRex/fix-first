'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '../../../components/protected-route';
import { useApi } from '../../../hooks/use-api';
import type { ProductSummary } from '@fixfirst/shared-types';

function AddProductContent() {
  const { request } = useApi();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [selected, setSelected] = useState<ProductSummary | null>(null);
  const [searching, setSearching] = useState(false);

  const [purchasedAt, setPurchasedAt] = useState('');
  const [retailer, setRetailer] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await request<{ items: ProductSummary[] }>(`/products/search?q=${encodeURIComponent(query)}`);
      setResults(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError('');
    try {
      const up = await request<{ id: string }>('/user-products', {
        method: 'POST',
        body: JSON.stringify({
          productId: selected.id,
          purchasedAt: purchasedAt || undefined,
          retailer: retailer || undefined,
          price: price ? parseFloat(price) : undefined,
        }),
      });
      router.push(`/products/${up.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product');
      setSubmitting(false);
    }
  };

  return (
    <main>
      <h1>Add Product</h1>

      {!selected ? (
        <section>
          <h2>Search the catalog</h2>
          <form onSubmit={handleSearch}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by brand or model…"
            />
            <button type="submit" disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>

          {results.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {results.map((p) => (
                <li
                  key={p.id}
                  style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                  onClick={() => setSelected(p)}
                >
                  <strong>{p.brand} {p.model}</strong> — {p.category}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section>
          <p>
            Selected: <strong>{selected.brand} {selected.model}</strong>{' '}
            <button onClick={() => setSelected(null)}>Change</button>
          </p>

          <h2>Purchase details</h2>
          <form onSubmit={handleAdd}>
            <label>
              Purchase date
              <input type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
            </label>
            <label>
              Retailer
              <input
                type="text"
                value={retailer}
                onChange={(e) => setRetailer(e.target.value)}
                placeholder="e.g. Best Buy"
              />
            </label>
            <label>
              Price (CAD)
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add to my products'}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

export default function AddProductPage() {
  return (
    <ProtectedRoute>
      <AddProductContent />
    </ProtectedRoute>
  );
}
