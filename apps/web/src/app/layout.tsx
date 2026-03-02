import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '../context/auth';

export const metadata: Metadata = {
  title: 'FixFirst',
  description:
    'Repair before you replace — track warranties, scan receipts, and know your consumer rights.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
