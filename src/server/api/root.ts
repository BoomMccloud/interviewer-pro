import { sessionRouter } from "~/server/api/routers/session";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { jdResumeRouter } from "~/server/api/routers/jdResume";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  session: sessionRouter,
  jdResume: jdResumeRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
