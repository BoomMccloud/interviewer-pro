import '../globals.css';
import { ThemeProvider, ThemeToggleButton } from './_components/ThemeToggle';

import { Inter } from "next/font/google";
import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Interviewer Pro - MVP",
  description: "AI-powered interview practice",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <ThemeToggleButton />
          <TRPCReactProvider>
            <main className="min-h-screen bg-white dark:bg-slate-900">{children}</main>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
