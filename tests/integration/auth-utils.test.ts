/**
 * @fileoverview Unit tests for `getSessionForTest` helper.
 *
 * These tests document the expected behaviour in E2E test mode:
 * 1. When no `x-test-auth-state` header is present, the function should
 *    return the mock E2E session.
 * 2. When `x-test-auth-state: logged-out` is present, it should return null.
 *
 * NOTE: The implementation does *not* yet satisfy these tests – they are
 * meant to fail first (red phase) and guide the subsequent refactor.
 */

import { jest } from '@jest/globals';
import { getSessionForTest } from '~/lib/test-auth-utils';

// Mock the `next/headers` module so we can control the header values
jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

// Import after the mock so we get the mocked version
import { headers } from 'next/headers';
const headersMock = headers as unknown as jest.Mock;

describe('getSessionForTest — E2E_TESTING=true', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    // Clone env to avoid side-effects across tests
    process.env = { ...ORIGINAL_ENV, E2E_TESTING: 'true', NODE_ENV: 'test' };
  });

  afterEach(() => {
    headersMock.mockReset();
    process.env = ORIGINAL_ENV; // restore
  });

  it('returns the mock session when no logged-out header is present', async () => {
    headersMock.mockReturnValue({
      get: () => undefined,
    });

    const session = await getSessionForTest();
    expect(session).not.toBeNull();
    expect(session?.user?.id).toBe('e2e-test-user-id-123');
  });

  it('returns null when the request indicates logged-out', async () => {
    headersMock.mockReturnValue({
      get: (key: string) => (key === 'x-test-auth-state' ? 'logged-out' : undefined),
    });

    const session = await getSessionForTest();
    expect(session).toBeNull();
  });
}); 