import Link from "next/link";
// import { auth } from "~/lib/auth"; // Replaced by getSessionForTest
import { getSessionForTest } from "~/lib/test-auth-utils";
import { HydrateClient } from "~/trpc/server";
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getSessionForTest();

  // For debugging in E2E test mode
  if (process.env.E2E_TESTING === 'true') {
    console.log(`[Home Page] E2E_TESTING=${process.env.E2E_TESTING}, Session: ${session ? 'Authenticated' : 'Unauthenticated'}`);
  }

  if (session?.user) {
    if (process.env.E2E_TESTING === 'true') console.log('[Home Page] E2E Test Mode: Authenticated, redirecting to /dashboard');
    redirect('/dashboard');
  } else {
    if (process.env.E2E_TESTING === 'true') console.log('[Home Page] E2E Test Mode: Unauthenticated, redirecting to /login');
    redirect('/login');
  }

  // The content below will not be reached if redirection occurs
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        {/* TAILWIND TEST: This should be red if Tailwind works */}
        <h1 className="text-red-500">Tailwind Test on Main Page</h1>
        
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            AI Interview Pro
          </h1>
          <p className="text-2xl text-white text-center">
            Prepare for your interviews with AI. Sign in to continue.
          </p>
          <div className="flex flex-col items-center justify-center gap-4">
            <Link
               href="/login"
               className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
            >
               Sign In
            </Link>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
