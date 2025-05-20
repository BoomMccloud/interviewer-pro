/**
 * tRPC router for managing Job Description (JD) and Resume text for users.
 *
 * Core Procedures:
 * - `saveJdResumeText`: Allows an authenticated user to save or update their JD and resume text.
 * - `getJdResumeText`: Allows an authenticated user to retrieve their currently saved JD and resume text.
 */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

// Zod schema for input validation when saving JD/Resume text
export const JdResumeInputSchema = z.object({
  jdText: z.string().min(1, "Job description cannot be empty."),
  resumeText: z.string().min(1, "Resume text cannot be empty."),
});

export const jdResumeRouter = createTRPCRouter({
  /**
   * Saves or updates the Job Description and Resume text for the authenticated user.
   * If a record already exists for the user, it's updated. Otherwise, a new record is created.
   */
  saveJdResumeText: protectedProcedure
    .input(JdResumeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Use findFirst as userId is not a @unique or @@id field directly usable by findUnique
      // but we treat it as de-facto unique for a user's active JD/Resume in MVP context.
      const existingEntry = await db.jdResumeText.findFirst({
        where: { userId },
      });

      if (existingEntry) {
        return db.jdResumeText.update({
          where: { id: existingEntry.id }, // Update by its actual @id
          data: {
            jdText: input.jdText,
            resumeText: input.resumeText,
          },
        });
      } else {
        return db.jdResumeText.create({
          data: {
            userId,
            jdText: input.jdText,
            resumeText: input.resumeText,
          },
        });
      }
    }),

  /**
   * Retrieves the Job Description and Resume text for the authenticated user.
   * Returns the JdResumeText record or null if no entry exists for the user.
   * For MVP, we assume a user has at most one JdResumeText record.
   */
  getJdResumeText: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    // Use findFirst, as a user might not have one, or (theoretically, post-MVP) could have multiple.
    // For MVP, we expect at most one.
    return db.jdResumeText.findFirst({
      where: { userId },
    });
  }),
}); 