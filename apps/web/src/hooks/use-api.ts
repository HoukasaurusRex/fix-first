'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth';
import { apiFetch } from '../lib/api';

export function useApi() {
  const { getAccessToken, refreshAccessToken } = useAuth();
  const router = useRouter();

  const request = useCallback(
    <T>(path: string, options: RequestInit = {}): Promise<T> => {
      return apiFetch<T>(path, options, getAccessToken, refreshAccessToken, () =>
        router.push('/login'),
      );
    },
    [getAccessToken, refreshAccessToken, router],
  );

  return { request };
}
