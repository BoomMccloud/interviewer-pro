import Link from "next/link";
import { auth } from "~/lib/auth";
import { api, HydrateClient } from "~/trpc/server";
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            AI Interview Pro
          </h1>
          <p className="text-2xl text-white text-center">
            Prepare for your technical interviews with AI. Sign in to continue.
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
