/**
 * @fileoverview API utilities for tRPC integration.
 *
 * This file provides type-safe access to tRPC procedures.
 * Use the tRPC hooks directly from ~/trpc/react in your React components.
 * 
 * Example usage in components:
 * import { api } from '~/trpc/react';
 * const { data, isLoading, error } = api.jdResume.getJdResumeText.useQuery();
 * const mutation = api.jdResume.saveJdResumeText.useMutation();
 */

// Re-export the api for convenience in tests and other utilities
export { api } from '~/trpc/react'; 