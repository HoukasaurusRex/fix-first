'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicFetch } from '../../lib/api';
import { useAuth } from '../../context/auth';

const PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

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

export default function RightsPage() {
  const { user } = useAuth();
  const [selectedProvince, setSelectedProvince] = useState('ON');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [data, setData] = useState<ApplicableLawsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Pre-select user's province on first load
  useEffect(() => {
    if (!initialized && user) {
      const province = (user as any).province;
      if (province) setSelectedProvince(province);
      setInitialized(true);
    } else if (!initialized && user === null) {
      // Not logged in — use default ON
      setInitialized(true);
    }
  }, [user, initialized]);

  useEffect(() => {
    if (!selectedProvince) return;
    setLoading(true);
    const url = categoryFilter
      ? `/jurisdictions/${selectedProvince}/laws?category=${encodeURIComponent(categoryFilter)}`
      : `/jurisdictions/${selectedProvince}/laws`;
    publicFetch<ApplicableLawsResponse>(url)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedProvince, categoryFilter]);

  const federalLaws =
    data?.laws.filter((l) => {
      // Federal laws come from the CA jurisdiction (included in the response)
      // We identify them by checking which jurisdiction they belong to
      // Since the API merges federal + provincial, we separate them by statute name pattern
      // Actually, we need a better way. Let's fetch all jurisdictions to get IDs.
      // For simplicity: laws without productCategory from a non-provincial context are federal.
      // We'll use a heuristic: federal statutes contain "R.S.C." or "S.C."
      return (
        l.statute.includes('R.S.C.') ||
        l.statute.includes('S.C. ') ||
        l.statute.includes('federal') ||
        l.statute.toLowerCase().includes('competition act') ||
        l.statute.toLowerCase().includes('packaging')
      );
    }) ?? [];

  const provincialLaws = data?.laws.filter((l) => !federalLaws.includes(l)) ?? [];

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h1>Canadian Consumer Rights</h1>
        <nav>
          <Link href="/dashboard">Dashboard</Link>
          {' · '}
          <Link href="/account">Account</Link>
        </nav>
      </header>

      <p>
        Browse consumer protection laws that apply in your province. This is an educational overview
        — not legal advice. For specific legal questions, consult a qualified lawyer or your
        provincial consumer protection office.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <label>
          Province / Territory
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            style={{ display: 'block', marginTop: '0.25rem' }}
          >
            {PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </label>

        <label>
          Product category (optional)
          <input
            type="text"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="e.g. electronics"
            style={{ display: 'block', marginTop: '0.25rem' }}
          />
        </label>
      </div>

      {loading && <p>Loading laws…</p>}

      {!loading && data && (
        <>
          <section>
            <h2>Federal Laws (apply everywhere in Canada)</h2>
            {federalLaws.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No federal laws match the current filter.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {federalLaws.map((law) => (
                  <li
                    key={law.id}
                    style={{
                      marginBottom: '1rem',
                      padding: '1rem',
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '8px',
                    }}
                  >
                    <strong>{law.statute}</strong>
                    {law.productCategory && (
                      <span
                        style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.8rem',
                          color: '#0369a1',
                          background: '#e0f2fe',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                        }}
                      >
                        {law.productCategory}
                      </span>
                    )}
                    <p style={{ margin: '0.5rem 0 0', color: '#374151' }}>{law.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={{ marginTop: '1.5rem' }}>
            <h2>Provincial Laws — {data.jurisdiction.name}</h2>
            {provincialLaws.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No provincial laws match the current filter.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {provincialLaws.map((law) => (
                  <li
                    key={law.id}
                    style={{
                      marginBottom: '1rem',
                      padding: '1rem',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                    }}
                  >
                    <strong>{law.statute}</strong>
                    {law.productCategory && (
                      <span
                        style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.8rem',
                          color: '#166534',
                          background: '#dcfce7',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                        }}
                      >
                        {law.productCategory}
                      </span>
                    )}
                    <p style={{ margin: '0.5rem 0 0', color: '#374151' }}>{law.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p
            style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}
          >
            The information above is provided for educational purposes only and does not constitute
            legal advice. Laws change — always verify current statutes with official government
            sources.
          </p>
        </>
      )}
    </main>
  );
}
