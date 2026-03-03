'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ProtectedRoute } from '../../components/protected-route';
import { useApi } from '../../hooks/use-api';
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

function AccountContent() {
  const { user, refreshAccessToken } = useAuth();
  const { request } = useApi();
  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setName((user as any).name ?? '');
      setProvince((user as any).province ?? '');
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    setError('');
    try {
      await request('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name || undefined,
          province: province || undefined,
        }),
      });
      await refreshAccessToken();
      setStatus('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
      setStatus('error');
    }
  };

  return (
    <main>
      <h1>Account Settings</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: '480px' }}>
        <label>
          Display name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </label>

        <label>
          Province / Territory
          <select value={province} onChange={(e) => setProvince(e.target.value)}>
            <option value="">— Select province —</option>
            {PROVINCES.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
          <small>Used to show your applicable consumer protection laws.</small>
        </label>

        {error && <p role="alert" style={{ color: '#ef4444' }}>{error}</p>}
        {status === 'saved' && <p style={{ color: '#22c55e' }}>Saved.</p>}

        <button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </main>
  );
}

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <AccountContent />
    </ProtectedRoute>
  );
}
