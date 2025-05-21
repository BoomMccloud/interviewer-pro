/**
 * @fileoverview Layout for protected routes.
 *
 * This layout wraps pages within the `/(protected)` route group
 * and provides the NextAuth SessionProvider context.
 */

'use client';

import { SessionProvider } from 'next-auth/react';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
} 