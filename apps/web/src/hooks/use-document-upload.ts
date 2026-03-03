'use client';

import { useState, useCallback } from 'react';
import { useApi } from './use-api';
import { sha256File, uploadToS3 } from '../lib/crypto';
import type { DocumentSummary, DocumentType } from '@fixfirst/shared-types';

export type UploadState =
  | { status: 'idle' }
  | { status: 'hashing' }
  | { status: 'checking' }
  | { status: 'uploading'; progress: number }
  | { status: 'confirming' }
  | { status: 'done'; document: DocumentSummary }
  | { status: 'duplicate'; documentId: string }
  | { status: 'error'; message: string };

export interface UploadDocumentOptions {
  file: File;
  type: DocumentType;
  productId?: string;
}

type CheckResponse =
  | { exists: true; documentId: string }
  | { exists: false; uploadUrl: string; s3Key: string };

export function useDocumentUpload() {
  const { request } = useApi();
  const [state, setState] = useState<UploadState>({ status: 'idle' });

  const upload = useCallback(
    async ({ file, type, productId }: UploadDocumentOptions) => {
      setState({ status: 'hashing' });
      let sha256: string;
      try {
        sha256 = await sha256File(file);
      } catch {
        setState({ status: 'error', message: 'Failed to hash file' });
        return;
      }

      setState({ status: 'checking' });
      let check: CheckResponse;
      try {
        check = await request<CheckResponse>('/documents/check', {
          method: 'POST',
          body: JSON.stringify({
            sha256,
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
          }),
        });
      } catch (err) {
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Check failed' });
        return;
      }

      if (check.exists) {
        setState({ status: 'duplicate', documentId: check.documentId });
        return;
      }

      setState({ status: 'uploading', progress: 0 });
      try {
        await uploadToS3(check.uploadUrl, file, (progress) =>
          setState({ status: 'uploading', progress }),
        );
      } catch (err) {
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Upload failed' });
        return;
      }

      setState({ status: 'confirming' });
      let doc: DocumentSummary;
      try {
        doc = await request<DocumentSummary>('/documents/confirm-upload', {
          method: 'POST',
          body: JSON.stringify({
            sha256,
            s3Key: check.s3Key,
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            type,
            productId,
          }),
        });
      } catch (err) {
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Confirm failed' });
        return;
      }

      setState({ status: 'done', document: doc });
    },
    [request],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, upload, reset };
}
