/**
 * E2E RED Test – Hands-Free Voice Interview Flow (Phase 2)
 * -------------------------------------------------------
 * This test represents the desired behaviour for the voice modality MVP:
 * 1. User opens a session in voice mode.
 * 2. User records an answer via mocked MediaRecorder.
 * 3. Recording stops → backend should transcribe + evaluate → UI shows next AI question automatically.
 * 4. No transcript text is rendered to the user.
 *
 * The test is expected to FAIL until Phase 2 implementation is complete.
 */

import { test, expect } from '@playwright/test';

// Seeded session ID used across the E2E suite
const TEST_SESSION_ID = 'clxnt1o60000008l3f9j6g9z7';

// Mock helpers -------------------------------------------------------------
// We stub MediaRecorder + getUserMedia so that Playwright can run headless
// without real microphone input.  A tiny string blob stands in for audio.
const mediaMocks = () => {
  // @ts-expect-error – expose globally
  window.__mockRecordedChunks = [];

  class MockMediaRecorder {
    private chunks: Blob[] = [];
    private state: 'inactive' | 'recording' | 'stopped' = 'inactive';
    public ondataavailable: ((e: BlobEvent) => void) | null = null;
    public onstop: (() => void) | null = null;

    constructor() {}

    start() {
      this.state = 'recording';
      // Simulate recorded chunk after 500 ms
      setTimeout(() => {
        const mockBlob = new Blob(['dummy audio'], { type: 'audio/webm' });
        if (this.ondataavailable) {
          // @ts-ignore – simplified BlobEvent polyfill
          this.ondataavailable({ data: mockBlob });
        }
      }, 500);
    }

    stop() {
      this.state = 'stopped';
      if (this.onstop) this.onstop();
    }
  }

  // @ts-ignore – replace in window
  window.MediaRecorder = MockMediaRecorder;

  navigator.mediaDevices = {
    getUserMedia: async () => {
      // Return a dummy MediaStream object; we only need interface compatibility.
      return new MediaStream();
    },
  } as any;
};

// -------------------------------------------------------------------------

test.describe('Voice Interview – hands-free flow (RED)', () => {
  test.use({ storageState: 'tests/e2e/storageState.json' });

  test('records an answer and auto-advances to next question', async ({ page }) => {
    // Inject mocks before any page code runs
    await page.addInitScript(mediaMocks);

    await page.goto(`/sessions/${TEST_SESSION_ID}?mode=voice`);

    // Start recording – assumes a button with data-testid="record-toggle"
    await page.getByTestId('record-toggle').click();

    // Wait until the mocked recorder has produced a chunk and auto-stops
    await page.waitForTimeout(1200);

    // UI should now display the **next** AI question.
    // We rely on data-testid="current-question-text" for robust selection.
    const question = page.getByTestId('current-question-text');
    await expect(question).toBeVisible();

    // Assert that **transcript text is NOT rendered**
    await expect(page.locator('text=Transcribing…')).not.toBeVisible();
    await expect(page.locator('data-testid=transcript-line')).toHaveCount(0);
  });
}); 