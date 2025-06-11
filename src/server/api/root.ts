import { sessionRouter } from "~/server/api/routers/session";
import { jdResumeRouter } from "~/server/api/routers/jdResume";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { reportRouter } from './routers/report';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  session: sessionRouter,
  jdResume: jdResumeRouter,
  report: reportRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const caller = createCaller(createContext);
 * const res = await caller.post.all();
 * 
 * The `createCaller` function is meant for server-side use only. It allows calling tRPC
 * procedures from server-side code such as an API route handler or a Next.js server component.
 */
export const createCaller = createCallerFactory(appRouter);
