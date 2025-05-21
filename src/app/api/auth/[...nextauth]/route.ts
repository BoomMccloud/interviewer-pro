/**
 * @fileoverview NextAuth API route handler for the App Router (v5 pattern).
 *
 * This file imports the handlers from the root auth.ts configuration file
 * and exports the GET and POST methods required by NextAuth.
 */

import { handlers } from "~/lib/auth";

export const { GET, POST } = handlers;

// Note: The NextAuth v5 documentation suggests the auth.ts file is at the root,
// but based on the project structure and T3 boilerplate conventions,
// importing from ~/lib/auth is more appropriate.
