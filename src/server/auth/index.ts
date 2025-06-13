import NextAuth from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

/**
 * The `auth` function is wrapped in `cache` to prevent it from being called
 * multiple times in a single request. This is a performance optimization.
 *
 * It is the single source of truth for the current user's session.
 *
 * @see https://nextjs.org/docs/app/building-your-application/caching#react-cache-function
 * @see https://authjs.dev/getting-started/session-management/get-session#in-app-router
 */
export const auth = cache(uncachedAuth);

export { handlers, signIn, signOut };
