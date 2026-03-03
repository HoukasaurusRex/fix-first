'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '../../../../components/protected-route';
import { useApi } from '../../../../hooks/use-api';

type ChecklistItem = {
  key: string;
  label: string;
  status: 'checked' | 'unchecked' | 'n-a';
  detail?: string;
};

type RepairOrReplace = {
  recommendation: 'check_warranty' | 'repair' | 'replace';
  reasons: string[];
  warrantyStatus: string;
};

type Resource = { label: string; url: string };

const STATUS_ICON: Record<string, string> = {
  checked: '✓',
  unchecked: '✗',
  'n-a': '–',
};

const STATUS_COLOR: Record<string, string> = {
  checked: '#16a34a',
  unchecked: '#dc2626',
  'n-a': '#9ca3af',
};

const RECOMMENDATION_LABELS: Record<string, string> = {
  check_warranty: 'Check Your Warranty',
  repair: 'Repair is Recommended',
  replace: 'Consider Replacing',
};

const RECOMMENDATION_COLORS: Record<string, string> = {
  check_warranty: '#2563eb',
  repair: '#16a34a',
  replace: '#d97706',
};

function GuidanceContent() {
  const { id } = useParams<{ id: string }>();
  const { request } = useApi();
  const [checklist, setChecklist] = useState<ChecklistItem[] | null>(null);
  const [repairOrReplace, setRepairOrReplace] = useState<RepairOrReplace | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      request<ChecklistItem[]>(`/guidance/checklist/${id}`),
      request<RepairOrReplace>(`/guidance/repair-or-replace/${id}`),
    ]).then(([cl, ror]) => {
      setChecklist(cl);
      setRepairOrReplace(ror);
      // Fetch resources (we don't know category here, use default)
      return request<Resource[]>('/guidance/resources');
    }).then(setResources).finally(() => setLoading(false));
  }, [id, request]);

  if (loading) return <p>Loading guidance…</p>;

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <Link href={`/products/${id}`}>← Back to product</Link>
      <h1>Product Guidance</h1>

      {repairOrReplace && (
        <section
          style={{
            marginBottom: '2rem',
            padding: '1.25rem',
            background: '#f9fafb',
            border: `2px solid ${RECOMMENDATION_COLORS[repairOrReplace.recommendation]}`,
            borderRadius: '12px',
          }}
        >
          <h2 style={{ color: RECOMMENDATION_COLORS[repairOrReplace.recommendation], margin: '0 0 0.75rem' }}>
            {RECOMMENDATION_LABELS[repairOrReplace.recommendation]}
          </h2>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {repairOrReplace.reasons.map((r, i) => (
              <li key={i} style={{ marginBottom: '0.25rem' }}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {checklist && (
        <section style={{ marginBottom: '2rem' }}>
          <h2>Before You Act — Checklist</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {checklist.map((item) => (
              <li
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: STATUS_COLOR[item.status],
                    minWidth: '1.25rem',
                    textAlign: 'center',
                  }}
                >
                  {STATUS_ICON[item.status]}
                </span>
                <div>
                  <strong>{item.label}</strong>
                  {item.detail && (
                    <p style={{ margin: '0.2rem 0 0', color: '#6b7280', fontSize: '0.9rem' }}>{item.detail}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resources.length > 0 && (
        <section>
          <h2>Repair Resources</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {resources.map((r, i) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                  {r.label} →
                </a>
              </li>
            ))}
          </ul>
          <p style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>
            External links open in a new tab. FixFirst is not responsible for third-party content.
          </p>
        </section>
      )}
    </main>
  );
}

export default function GuidancePage() {
  return (
    <ProtectedRoute>
      <GuidanceContent />
    </ProtectedRoute>
  );
}
