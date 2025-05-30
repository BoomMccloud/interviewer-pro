/**
 * Jest setup file for backend tests
 * Configures environment variables and global test setup
 */

// Set NODE_ENV to test to help libraries detect test environment
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: true,
  enumerable: true,
  configurable: true,
});

// Provide test-specific environment variables if needed
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Optional: Mock global console methods to reduce noise during tests
// jest.spyOn(console, 'log').mockImplementation(() => {});
// jest.spyOn(console, 'warn').mockImplementation(() => {}); 