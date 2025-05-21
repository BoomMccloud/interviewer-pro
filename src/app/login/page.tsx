/**
 * @fileoverview Login page for the application.
 *
 * This page provides a way for users to initiate the sign-in process,
 * currently using Google OAuth.
 */

'use client';

import { signIn } from 'next-auth/react';
import { Button } from '~/components/UI/Button'; // Assuming Button component is available

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-4">Sign In</h1>
      <Button onClick={() => signIn('google')}>
        Sign in with Google
      </Button>
    </div>
  );
} 