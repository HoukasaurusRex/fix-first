'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { ProtectedRoute } from '../../components/protected-route';
import { useApi } from '../../hooks/use-api';
import { sha256File, uploadToS3 } from '../../lib/crypto';
import type { ReceiptFields } from '@fixfirst/shared-types';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
const POLL_INTERVAL_MS = 2000;

type Stage = 'idle' | 'hashing' | 'uploading' | 'confirming' | 'polling' | 'review' | 'saving' | 'done' | 'error';

function ReceiptUploadContent() {
  const { request } = useApi();
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<ReceiptFields | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Edit form state
  const [retailer, setRetailer] = useState('');
  const [productName, setProductName] = useState('');
  const [purchasedAt, setPurchasedAt] = useState('');
  const [price, setPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleFile = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Unsupported file type. Use JPEG, PNG, HEIC, or PDF.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File exceeds 20 MB limit.');
      return;
    }

    setError('');
    try {
      // 1. Compute SHA-256 client-side
      setStage('hashing');
      const hash = await sha256File(file);

      // 2. Request presigned upload URL
      const { uploadUrl, receiptId } = await request<{ uploadUrl: string; receiptId: string; s3Key: string }>(
        '/receipts/upload-url',
        {
          method: 'POST',
          body: JSON.stringify({ filename: file.name, contentType: file.type, sha256: hash }),
        },
      );

      // 3. Upload directly to S3
      setStage('uploading');
      await uploadToS3(uploadUrl, file, setProgress);

      // 4. Confirm upload with API
      setStage('confirming');
      await request('/receipts/confirm-upload', {
        method: 'POST',
        body: JSON.stringify({ receiptId }),
      });

      // 5. Poll for OCR completion
      setStage('polling');
      pollRef.current = setInterval(async () => {
        const r = await request<ReceiptFields>(`/receipts/${receiptId}`).catch(() => null);
        if (!r) return;
        if (r.ocrStatus === 'completed' || r.ocrStatus === 'failed') {
          stopPolling();
          setReceipt(r);
          setRetailer(r.retailer ?? '');
          setProductName(r.productName ?? '');
          setPurchasedAt(r.purchasedAt ? r.purchasedAt.slice(0, 10) : '');
          setPrice(r.price ?? '');
          setPaymentMethod(r.paymentMethod ?? '');
          setStage('review');
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      stopPolling();
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setStage('error');
    }
  }, [request, stopPolling]);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSave = async () => {
    if (!receipt) return;
    setStage('saving');
    try {
      await request(`/receipts/${receipt.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          retailer: retailer || undefined,
          productName: productName || undefined,
          purchasedAt: purchasedAt || undefined,
          price: price ? parseFloat(price) : undefined,
          paymentMethod: paymentMethod || undefined,
        }),
      });
      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
      setStage('review');
    }
  };

  if (stage === 'done') {
    return (
      <main>
        <h1>Receipt saved</h1>
        <p>Your receipt has been processed and saved.</p>
        <button onClick={() => { setStage('idle'); setReceipt(null); }}>Upload another</button>
      </main>
    );
  }

  if (stage === 'review' || stage === 'saving') {
    return (
      <main>
        <h1>Review Receipt</h1>
        {receipt?.ocrStatus === 'failed' && (
          <p role="alert" style={{ color: '#ef4444' }}>OCR failed — please enter fields manually.</p>
        )}
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {receipt?.imageUrl && (
            <div style={{ flex: 1, minWidth: '280px' }}>
              <img src={receipt.imageUrl} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '600px' }} />
            </div>
          )}
          <form
            style={{ flex: 1, minWidth: '280px' }}
            onSubmit={(e) => { e.preventDefault(); handleSave(); }}
          >
            <label>
              Retailer
              <input type="text" value={retailer} onChange={(e) => setRetailer(e.target.value)} />
            </label>
            <label>
              Product name
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} />
            </label>
            <label>
              Purchase date
              <input type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
            </label>
            <label>
              Price (CAD)
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <label>
              Payment method
              <input type="text" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
            </label>
            {error && <p role="alert" style={{ color: '#ef4444' }}>{error}</p>}
            <button type="submit" disabled={stage === 'saving'}>
              {stage === 'saving' ? 'Saving…' : 'Confirm & Save'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main>
      <h1>Upload Receipt</h1>

      {stage === 'idle' || stage === 'error' ? (
        <div
          role="button"
          aria-label="Drop zone — click or drag a receipt here"
          style={{
            border: `2px dashed ${isDragging ? '#6366f1' : '#ccc'}`,
            borderRadius: '8px',
            padding: '3rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragging ? '#eef2ff' : undefined,
          }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <p>Drag & drop a receipt here, or click to select</p>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>JPEG, PNG, HEIC, PDF · max 20 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      ) : (
        <div>
          {stage === 'hashing' && <p>Computing file hash…</p>}
          {stage === 'uploading' && (
            <div>
              <p>Uploading… {progress}%</p>
              <progress value={progress} max={100} style={{ width: '100%' }} />
            </div>
          )}
          {stage === 'confirming' && <p>Confirming upload…</p>}
          {stage === 'polling' && <p>Running OCR… this may take a moment.</p>}
        </div>
      )}

      {error && <p role="alert" style={{ color: '#ef4444', marginTop: '1rem' }}>{error}</p>}
    </main>
  );
}

export default function ReceiptsPage() {
  return (
    <ProtectedRoute>
      <ReceiptUploadContent />
    </ProtectedRoute>
  );
}
