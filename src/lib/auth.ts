/**
 * @fileoverview NextAuth configuration for the application (v5 pattern).
 *
 * This file sets up NextAuth with the Google provider and exports
 * necessary handlers and functions.
 */

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
// import { PrismaAdapter } from "@auth/prisma-adapter";
// import { db } from "~/server/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Configure one or more authentication providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    // ...add more providers here
  ],
  // Optional: Add callbacks for custom behavior
  callbacks: {
    // async signIn({ account, profile }) {
    //   if (account?.provider === "google") {
    //     return profile?.email_verified
    //   } else {
    //     return false // Do not allow users to sign in with other providers
    //   }
    // },
    // async session({ session, token, user }) {
    //   // Add properties to the session object
    //   return session;
    // },
  },
  // Optional: Add a database for persistent sessions
  // adapter: PrismaAdapter(db),
  // session: {
  //   strategy: "database",
  // },
  // Optional: Configure pages
  // pages: {
  //   signIn: '/login',
  // },
}); 