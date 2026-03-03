'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '../../../components/protected-route';
import { useApi } from '../../../hooks/use-api';
import { useAuth } from '../../../context/auth';
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

// Best-effort official act URL mapping keyed by jurisdiction code
const STATUTE_URLS: Record<string, string> = {
  CA: 'https://laws-lois.justice.gc.ca/eng/acts/',
  ON: 'https://www.ontario.ca/laws/statute/02c30',
  QC: 'https://www.legisquebec.gouv.qc.ca/en/document/cs/p-40.1',
  BC: 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/04002_01',
  AB: 'https://www.qp.alberta.ca/documents/Acts/C26P3.pdf',
  MB: 'https://web2.gov.mb.ca/laws/statutes/ccsm/c200e.php',
  SK: 'https://www.qp.gov.sk.ca/documents/English/Statutes/Statutes/C30-2.pdf',
  NS: 'https://nslegislature.ca/sites/default/files/legc/statutes/consumer%20protection.htm',
  NB: 'https://www.snb.ca/e/bills/index-e.asp',
  PE: 'https://www.princeedwardisland.ca/en/legislation/consumer-protection-act',
  NL: 'https://assembly.nl.ca/legislation/sr/statutes/c31-1.htm',
  NT: 'https://www.justice.gov.nt.ca/en/files/legislation/sale-of-goods/sale-of-goods.a.pdf',
  NU: 'https://www.nunavutlegislation.ca/',
  YT: 'https://legislation.yukon.ca/acts/sa.pdf',
};

function statuteUrl(jurisdictionCode: string): string {
  return STATUTE_URLS[jurisdictionCode] ?? `https://www.google.com/search?q=${encodeURIComponent(jurisdictionCode + ' consumer protection act')}`;
}

function statusBadge(type: WarrantyType, endDate: string | null): { label: string; color: string } {
  if (type === 'lifetime') return { label: 'Lifetime', color: '#22c55e' };
  if (type === 'statutory') return { label: 'Statutory (no fixed expiry)', color: '#6366f1' };
  if (!endDate) return { label: 'No end date', color: '#888' };
  const msLeft = new Date(endDate).getTime() - Date.now();
  if (msLeft <= 0) return { label: 'Expired', color: '#ef4444' };
  const days = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  if (days <= 30)
    return { label: `Expiring in ${days}d`, color: '#f59e0b' };
  return { label: `Active (${Math.ceil(days / 30)}mo left)`, color: '#22c55e' };
}

type LawEntry = {
  id: string;
  jurisdictionId: string;
  statute: string;
  summary: string;
  productCategory: string | null;
};

type ApplicableLawsResponse = {
  jurisdiction: { code: string; name: string };
  laws: LawEntry[];
};

function StatutoryRightsPanel({
  province,
  category,
}: {
  province: string | null | undefined;
  category: string;
}) {
  const { request } = useApi();
  const [data, setData] = useState<ApplicableLawsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!province) return;
    setLoading(true);
    request<ApplicableLawsResponse>(
      `/jurisdictions/${province}/laws?category=${encodeURIComponent(category)}`,
    )
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [province, category, request]);

  if (!province) {
    return (
      <section style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginTop: '1.5rem' }}>
        <h2>Your Statutory Rights</h2>
        <p>
          Set your <Link href="/account">province in account settings</Link> to see the consumer
          protection laws that apply to this product in your jurisdiction.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section style={{ marginTop: '1.5rem' }}>
        <h2>Your Statutory Rights</h2>
        <p>Loading applicable laws…</p>
      </section>
    );
  }

  if (!data || data.laws.length === 0) {
    return null;
  }

  return (
    <section style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem', marginTop: '1.5rem' }}>
      <h2>Your Statutory Rights — {data.jurisdiction.name}</h2>
      <p style={{ fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic' }}>
        This information is for educational purposes only and is not legal advice. For legal
        questions, consult a qualified lawyer or your provincial consumer protection office.
      </p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {data.laws.map((law) => (
          <li key={law.id} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #dbeafe' }}>
            <strong>{law.statute}</strong>
            <p style={{ margin: '0.25rem 0', color: '#374151' }}>{law.summary}</p>
            <a
              href={statuteUrl(data.jurisdiction.code)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.85rem', color: '#2563eb' }}
            >
              View official act text →
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { request } = useApi();
  const { user } = useAuth();
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
      {' · '}
      <Link href={`/products/${id}/guidance`}>Guidance tool</Link>
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

      <StatutoryRightsPanel
        province={(user as any)?.province}
        category={product.category}
      />

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
