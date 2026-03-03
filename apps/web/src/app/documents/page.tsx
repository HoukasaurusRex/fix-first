'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '../../components/protected-route';
import { useApi } from '../../hooks/use-api';
import { useDocumentUpload } from '../../hooks/use-document-upload';
import type { DocumentSummary, DocumentType } from '@fixfirst/shared-types';

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'warranty_certificate', label: 'Warranty Certificate' },
  { value: 'other', label: 'Other' },
];

function DocumentRow({ doc, onDownload }: { doc: DocumentSummary; onDownload: (id: string) => void }) {
  const formattedDate = new Date(doc.createdAt).toLocaleDateString();
  const sizeKb = (doc.sizeBytes / 1024).toFixed(1);

  return (
    <tr>
      <td style={{ padding: '0.5rem 1rem' }}>{doc.filename}</td>
      <td style={{ padding: '0.5rem 1rem', textTransform: 'capitalize' }}>
        {doc.type.replace('_', ' ')}
      </td>
      <td style={{ padding: '0.5rem 1rem' }}>
        {doc.product ? `${doc.product.brand} ${doc.product.model}` : '—'}
      </td>
      <td style={{ padding: '0.5rem 1rem', color: '#6b7280' }}>{sizeKb} KB</td>
      <td style={{ padding: '0.5rem 1rem', color: '#6b7280' }}>{formattedDate}</td>
      <td style={{ padding: '0.5rem 1rem' }}>
        <button
          onClick={() => onDownload(doc.id)}
          style={{ fontSize: '0.85rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Download
        </button>
      </td>
    </tr>
  );
}

function DocumentsContent() {
  const { request } = useApi();
  const { state, upload, reset } = useDocumentUpload();

  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loadError, setLoadError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>('manual');

  const loadDocs = () =>
    request<DocumentSummary[]>('/documents')
      .then(setDocs)
      .catch((err: Error) => setLoadError(err.message));

  useEffect(() => { loadDocs(); }, []);

  // Reload after a successful upload
  useEffect(() => {
    if (state.status === 'done' || state.status === 'duplicate') {
      loadDocs();
    }
  }, [state.status]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    reset();
  };

  const handleUpload = async () => {
    if (!file) return;
    await upload({ file, type: docType });
  };

  const handleDownload = async (id: string) => {
    try {
      const { url } = await request<{ url: string }>(`/documents/${id}/download-url`);
      window.open(url, '_blank', 'noopener');
    } catch {
      // ignore
    }
  };

  const uploadLabel =
    state.status === 'hashing' ? 'Hashing…' :
    state.status === 'checking' ? 'Checking…' :
    state.status === 'uploading' ? `Uploading ${state.progress}%` :
    state.status === 'confirming' ? 'Saving…' :
    'Upload';

  return (
    <main>
      <Link href="/dashboard">← Back to dashboard</Link>
      <h1>Document Library</h1>
      <p style={{ color: '#6b7280' }}>
        Community-shared manuals and warranty certificates. Files are deduplicated — uploading the
        same file twice links to the existing copy.
      </p>

      <section style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0 }}>Upload a document</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '420px' }}>
          <label>
            File
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              style={{ display: 'block', marginTop: '0.25rem' }}
            />
          </label>

          <label>
            Document type
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              style={{ display: 'block', marginTop: '0.25rem', width: '100%' }}
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          <button
            onClick={handleUpload}
            disabled={!file || state.status !== 'idle'}
            style={{ alignSelf: 'flex-start' }}
          >
            {uploadLabel}
          </button>

          {state.status === 'done' && (
            <p style={{ color: '#16a34a' }}>
              Uploaded: <strong>{state.document.filename}</strong>
            </p>
          )}
          {state.status === 'duplicate' && (
            <p style={{ color: '#2563eb' }}>
              This file already exists in the library (no duplicate stored).
            </p>
          )}
          {state.status === 'error' && (
            <p role="alert" style={{ color: '#ef4444' }}>{state.message}</p>
          )}
        </div>
      </section>

      <h2>All documents</h2>
      {loadError && <p role="alert" style={{ color: '#ef4444' }}>{loadError}</p>}
      {docs.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No documents yet. Be the first to upload one!</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem 1rem' }}>Filename</th>
                <th style={{ padding: '0.5rem 1rem' }}>Type</th>
                <th style={{ padding: '0.5rem 1rem' }}>Product</th>
                <th style={{ padding: '0.5rem 1rem' }}>Size</th>
                <th style={{ padding: '0.5rem 1rem' }}>Uploaded</th>
                <th style={{ padding: '0.5rem 1rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} onDownload={handleDownload} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default function DocumentsPage() {
  return (
    <ProtectedRoute>
      <DocumentsContent />
    </ProtectedRoute>
  );
}
