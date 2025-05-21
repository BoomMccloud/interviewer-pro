/**
 * @fileoverview Unit tests for the API utility functions in src/utils/api.ts.
 *
 * These tests use Jest to mock the global `fetch` function and verify
 * that the API utility functions make correct requests and handle responses
 * and errors as expected.
 */

import { getMvpJdResumeText, saveMvpJdResumeText, createMvpSession, listMvpSessionsForCurrentText, getSessionState, continueSession, endSession, getSessionReport } from '~/utils/api';
import { type JdResumeText, type MvpReportData, type SessionData, type MvpSessionTurn } from '~/types';
import fetchMock from 'jest-fetch-mock';

// Note: fetchMocker.enableMocks() is called in jest.setup.ts

describe('API Utility Functions', () => {
  // Reset the fetch mock before each test to ensure isolation
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  describe('getMvpJdResumeText', () => {
    it('should fetch JD/Resume text and return the parsed data on success', async () => {
      // Arrange: Define a mock successful response
      const mockJdResumeText: JdResumeText = {
        id: 'test-id',
        userId: 'test-user-id',
        jdText: 'Test Job Description',
        resumeText: 'Test Resume Text',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      fetchMock.mockResponseOnce(JSON.stringify(mockJdResumeText), { status: 200 });

      // Act: Call the function
      const result = await getMvpJdResumeText();

      // Assert: Verify fetch was called correctly and the result matches the mock data
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-jd-resume-text');
      expect(result).toEqual(mockJdResumeText);
    });

    it('should return null if the API returns 404', async () => {
      // Arrange: Define a mock 404 response
      fetchMock.mockResponseOnce(JSON.stringify(null), { status: 404 });

      // Act: Call the function
      const result = await getMvpJdResumeText();

      // Assert: Verify fetch was called correctly and the result is null
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-jd-resume-text');
      expect(result).toBeNull();
    });

    it('should throw an error if the API returns a non-404 error status', async () => {
      // Arrange: Define a mock error response (e.g., 500 Internal Server Error)
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Server Error' }), { status: 500, statusText: 'Internal Server Error' });

      // Act & Assert: Expect the function to throw an error
      await expect(getMvpJdResumeText()).rejects.toThrow('API error: 500 Internal Server Error');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-jd-resume-text');
    });

    it('should throw a Zod error if the response data is invalid', async () => {
      // Arrange: Define a mock response with invalid data structure
      const invalidData = { id: 'test-id', userId: 'test-user-id', jobDescription: 'wrong field name' }; // Missing resumeText and wrong field names
      fetchMock.mockResponseOnce(JSON.stringify(invalidData), { status: 200 });

      // Act & Assert: Expect the function to throw a Zod error
      await expect(getMvpJdResumeText()).rejects.toThrow(); // Expect a Zod parsing error
      // You could add a more specific check for ZodError if needed:
      // await expect(getMvpJdResumeText()).rejects.toBeInstanceOf(z.ZodError);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-jd-resume-text');
    });

    it('should handle network errors during fetch', async () => {
      // Arrange: Simulate a network error
      const networkError = new Error('Network request failed');
      fetchMock.mockRejectedValueOnce(networkError);

      // Act & Assert: Expect the function to throw the network error
      await expect(getMvpJdResumeText()).rejects.toThrow('Network request failed');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-jd-resume-text');
    });
  });

  describe('saveMvpJdResumeText', () => {
    it('should send a POST request with data and return the parsed response on success', async () => {
      // Arrange: Define mock data to send and a mock successful response
      const dataToSend = { jdText: 'New JD', resumeText: 'New Resume' };
      const mockSavedData: JdResumeText = {
        id: 'saved-id',
        userId: 'test-user-id',
        jdText: 'New JD',
        resumeText: 'New Resume',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      fetchMock.mockResponseOnce(JSON.stringify(mockSavedData), { status: 200 });

      // Act: Call the function
      const result = await saveMvpJdResumeText(dataToSend);

      // Assert: Verify fetch was called correctly (POST, URL, headers, body) and the result matches
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-jd-resume-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      expect(result).toEqual(mockSavedData);
    });

    it('should throw an error if the API returns a non-2xx status', async () => {
      // Arrange: Define mock data and a mock error response
      const dataToSend = { jdText: 'New JD', resumeText: 'New Resume' };
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Bad Request' }), { status: 400, statusText: 'Bad Request' });

      // Act & Assert: Expect the function to throw an error
      await expect(saveMvpJdResumeText(dataToSend)).rejects.toThrow('API error: 400 Bad Request');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      // Verify fetch was still called with the correct arguments
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-jd-resume-text', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      }));
    });

    it('should throw a Zod error if the successful response data is invalid', async () => {
      // Arrange: Define mock data to send and a mock successful response with invalid data
      const dataToSend = { jdText: 'New JD', resumeText: 'New Resume' };
      const invalidData = { id: 'saved-id', userId: 'test-user-id', jobDescription: 'wrong' }; // Invalid structure
      fetchMock.mockResponseOnce(JSON.stringify(invalidData), { status: 200 });

      // Act & Assert: Expect the function to throw a Zod error
      await expect(saveMvpJdResumeText(dataToSend)).rejects.toThrow(); // Expect a Zod parsing error

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-jd-resume-text', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      }));
    });

    it('should handle network errors during fetch', async () => {
      // Arrange: Define mock data and simulate a network error
      const dataToSend = { jdText: 'New JD', resumeText: 'New Resume' };
      const networkError = new Error('Network request failed');
      fetchMock.mockRejectedValueOnce(networkError);

      // Act & Assert: Expect the function to throw the network error
      await expect(saveMvpJdResumeText(dataToSend)).rejects.toThrow('Network request failed');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-jd-resume-text', expect.anything());
    });
  });

  describe('createMvpSession', () => {
    it('should send a POST request with personaId and jdResumeTextId and return the session ID on success', async () => {
      // Arrange: Define mock data to send and a mock successful response
      const personaId = 'technical-lead';
      const jdResumeTextId = 'test-jd-resume-id';
      const mockResponseData = { sessionId: 'new-session-id' };
      fetchMock.mockResponseOnce(JSON.stringify(mockResponseData), { status: 200 });

      // Act: Call the function
      const result = await createMvpSession(personaId, jdResumeTextId);

      // Assert: Verify fetch was called correctly (POST, URL, headers, body) and the result matches
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personaId, jdResumeTextId }),
      });
      expect(result).toEqual({ sessionId: 'new-session-id' });
    });

    it('should throw an error if the API returns a non-2xx status', async () => {
      // Arrange: Define mock data and a mock error response
      const personaId = 'technical-lead';
      const jdResumeTextId = 'test-jd-resume-id';
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Server Error' }), { status: 500, statusText: 'Internal Server Error' });

      // Act & Assert: Expect the function to throw an error
      await expect(createMvpSession(personaId, jdResumeTextId)).rejects.toThrow('API error: 500 Internal Server Error');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      // Verify fetch was still called with the correct arguments (excluding body for simplicity)
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-sessions', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId, jdResumeTextId }),
      }));
    });

    it('should throw a Zod error if the successful response data is invalid', async () => {
      // Arrange: Define mock data to send and a mock successful response with invalid data
      const personaId = 'technical-lead';
      const jdResumeTextId = 'test-jd-resume-id';
      const invalidData = { id: 'wrong' }; // Invalid structure
      fetchMock.mockResponseOnce(JSON.stringify(invalidData), { status: 200 });

      // Act & Assert: Expect the function to throw a Zod error
      await expect(createMvpSession(personaId, jdResumeTextId)).rejects.toThrow(); // Expect a Zod parsing error

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-sessions', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId, jdResumeTextId }),
      }));
    });

    it('should handle network errors during fetch', async () => {
      // Arrange: Define mock data and simulate a network error
      const personaId = 'technical-lead';
      const jdResumeTextId = 'test-jd-resume-id';
      const networkError = new Error('Network request failed');
      fetchMock.mockRejectedValueOnce(networkError);

      // Act & Assert: Expect the function to throw the network error
      await expect(createMvpSession(personaId, jdResumeTextId)).rejects.toThrow('Network request failed');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-sessions', expect.anything());
    });
  });

  describe('listMvpSessionsForCurrentText', () => {
    it('should fetch the list of sessions and return the parsed data on success', async () => {
      // Arrange: Define a mock successful response with an array of SessionData
      const mockSessions: (Omit<SessionData, 'history'> & { history: MvpSessionTurn[] })[] = [
        {
          id: 'session-1',
          userId: 'user-1',
          personaId: 'technical-lead',
          jdResumeTextId: 'text-1',
          history: [],
          durationInSeconds: 0,
          overallSummary: null,
          startTime: new Date(),
          endTime: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'session-2',
          userId: 'user-1',
          personaId: 'technical-lead',
          jdResumeTextId: 'text-1',
          history: [],
          durationInSeconds: 60,
          overallSummary: 'Completed',
          startTime: new Date(),
          endTime: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      fetchMock.mockResponseOnce(JSON.stringify(mockSessions), { status: 200 });

      // Act: Call the function
      const result = await listMvpSessionsForCurrentText();

      // Assert: Verify fetch was called correctly and the result matches
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-jd-resume-text/sessions');
      expect(result).toEqual(mockSessions);
    });

    it('should throw an error if the API returns a non-2xx status', async () => {
      // Arrange: Define a mock error response
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Server Error' }), { status: 500, statusText: 'Internal Server Error' });

      // Act & Assert: Expect the function to throw an error
      await expect(listMvpSessionsForCurrentText()).rejects.toThrow('API error: 500 Internal Server Error');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-jd-resume-text/sessions');
    });

    it('should throw a Zod error if the response data is invalid', async () => {
      // Arrange: Define a mock response with invalid data
      const invalidData = [{ id: 'session-1', userId: 'user-1' }]; // Missing many fields
      fetchMock.mockResponseOnce(JSON.stringify(invalidData), { status: 200 });

      // Act & Assert: Expect the function to throw a Zod error
      await expect(listMvpSessionsForCurrentText()).rejects.toThrow(); // Expect a Zod parsing error

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-jd-resume-text/sessions');
    });

    it('should handle network errors during fetch', async () => {
      // Arrange: Simulate a network error
      const networkError = new Error('Network request failed');
      fetchMock.mockRejectedValueOnce(networkError);

      // Act & Assert: Expect the function to throw the network error
      await expect(listMvpSessionsForCurrentText()).rejects.toThrow('Network request failed');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('/api/mvp-jd-resume-text/sessions');
    });
  });

  describe('getSessionState', () => {
    it('should fetch the session state and return the parsed data on success', async () => {
      // Arrange: Define a mock successful response with SessionData
      const sessionId = 'test-session-id';
      const mockSessionState: Omit<SessionData, 'history'> & { history: MvpSessionTurn[] } = {
        id: sessionId,
        userId: 'user-1',
        personaId: 'technical-lead',
        jdResumeTextId: 'text-1',
        history: [
          {
            id: 'turn-1',
            role: 'user',
            text: 'user input',
            timestamp: new Date(),
          },
        ],
        durationInSeconds: 120,
        overallSummary: null,
        startTime: new Date(),
        endTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      fetchMock.mockResponseOnce(JSON.stringify(mockSessionState), { status: 200 });

      // Act: Call the function
      const result = await getSessionState(sessionId);

      // Assert: Verify fetch was called correctly and the result matches
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}`);
      expect(result).toEqual(mockSessionState);
    });

    it('should throw an error if the API returns a non-2xx status', async () => {
      // Arrange: Define a mock error response
      const sessionId = 'test-session-id';
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Server Error' }), { status: 500, statusText: 'Internal Server Error' });

      // Act & Assert: Expect the function to throw an error
      await expect(getSessionState(sessionId)).rejects.toThrow('API error: 500 Internal Server Error');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}`);
    });

    it('should throw a Zod error if the response data is invalid', async () => {
      // Arrange: Define a mock response with invalid data
      const sessionId = 'test-session-id';
      const invalidData = { id: sessionId, userId: 'user-1' }; // Missing many fields
      fetchMock.mockResponseOnce(JSON.stringify(invalidData), { status: 200 });

      // Act & Assert: Expect the function to throw a Zod error
      await expect(getSessionState(sessionId)).rejects.toThrow(); // Expect a Zod parsing error

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}`);
    });

    it('should handle network errors during fetch', async () => {
      // Arrange: Simulate a network error
      const sessionId = 'test-session-id';
      const networkError = new Error('Network request failed');
      fetchMock.mockRejectedValueOnce(networkError);

      // Act & Assert: Expect the function to throw the network error
      await expect(getSessionState(sessionId)).rejects.toThrow('Network request failed');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}`);
    });
  });

  describe('continueSession', () => {
    it('should send user answer and return updated session data on success', async () => {
      // Arrange: Define mock data to send and a mock successful response
      const sessionId = 'test-session-id';
      const userAnswer = 'My answer';
      const mockUpdatedSession: Omit<SessionData, 'history'> & { history: MvpSessionTurn[] } = {
        id: sessionId,
        userId: 'user-1',
        personaId: 'technical-lead',
        jdResumeTextId: 'text-1',
        history: [
          { id: 'turn-1', role: 'user', text: 'prev user input', timestamp: new Date() },
          { id: 'turn-2', role: 'model', text: 'prev model response', timestamp: new Date() },
          { id: 'turn-3', role: 'user', text: userAnswer, timestamp: new Date() },
        ],
        durationInSeconds: 180,
        overallSummary: null,
        startTime: new Date(),
        endTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      fetchMock.mockResponseOnce(JSON.stringify(mockUpdatedSession), { status: 200 });

      // Act: Call the function
      const result = await continueSession(sessionId, userAnswer);

      // Assert: Verify fetch was called correctly (POST, URL, headers, body) and the result matches
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}/continue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAnswer }),
      });
      expect(result).toEqual(mockUpdatedSession);
    });

    it('should throw an error if the API returns a non-2xx status', async () => {
      // Arrange: Define mock data and a mock error response
      const sessionId = 'test-session-id';
      const userAnswer = 'My answer';
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Server Error' }), { status: 500, statusText: 'Internal Server Error' });

      // Act & Assert: Expect the function to throw an error
      await expect(continueSession(sessionId, userAnswer)).rejects.toThrow('API error: 500 Internal Server Error');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}/continue`, expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAnswer }),
      }));
    });

    it('should throw a Zod error if the successful response data is invalid', async () => {
      // Arrange: Define mock data to send and a mock successful response with invalid data
      const sessionId = 'test-session-id';
      const userAnswer = 'My answer';
      const invalidData = { id: sessionId, userId: 'user-1' }; // Invalid structure
      fetchMock.mockResponseOnce(JSON.stringify(invalidData), { status: 200 });

      // Act & Assert: Expect the function to throw a Zod error
      await expect(continueSession(sessionId, userAnswer)).rejects.toThrow(); // Expect a Zod parsing error

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}/continue`, expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAnswer }),
      }));
    });

    it('should handle network errors during fetch', async () => {
      // Arrange: Define mock data and simulate a network error
      const sessionId = 'test-session-id';
      const userAnswer = 'My answer';
      const networkError = new Error('Network request failed');
      fetchMock.mockRejectedValueOnce(networkError);

      // Act & Assert: Expect the function to throw the network error
      await expect(continueSession(sessionId, userAnswer)).rejects.toThrow('Network request failed');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}/continue`, expect.anything());
    });
  });

  describe('endSession', () => {
    it('should send a POST request to end the session and return the report on success', async () => {
      // Arrange: Define mock report data
      const sessionId = 'test-session-id';
      const mockReport: MvpReportData = {
        sessionId: sessionId,
        startTime: new Date(),
        endTime: new Date(),
        durationConfigured: 600,
        durationActual: 550,
        personaName: 'Technical Lead',
        overallSummary: 'Good session.',
        turns: [],
      };
      fetchMock.mockResponseOnce(JSON.stringify(mockReport), { status: 200 });

      // Act: Call the function
      const result = await endSession(sessionId);

      // Assert: Verify fetch was called correctly (POST, URL) and the result matches
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // No body is sent by default for now
      });
      expect(result).toEqual(mockReport);
    });

    it('should throw an error if the API returns a non-2xx status', async () => {
      // Arrange: Define a mock error response
      const sessionId = 'test-session-id';
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Server Error' }), { status: 500, statusText: 'Internal Server Error' });

      // Act & Assert: Expect the function to throw an error
      await expect(endSession(sessionId)).rejects.toThrow('API error: 500 Internal Server Error');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}/end`, expect.anything());
    });

    it('should throw a Zod error if the successful response data is invalid', async () => {
      // Arrange: Define mock data to send and a mock successful response with invalid data
      const sessionId = 'test-session-id';
      const invalidData = { sessionId: sessionId, startTime: 'wrong date format' }; // Invalid structure
      fetchMock.mockResponseOnce(JSON.stringify(invalidData), { status: 200 });

      // Act & Assert: Expect the function to throw a Zod error
      await expect(endSession(sessionId)).rejects.toThrow(); // Expect a Zod parsing error

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}/end`, expect.anything());
    });

    it('should handle network errors during fetch', async () => {
      // Arrange: Define mock data and simulate a network error
      const sessionId = 'test-session-id';
      const networkError = new Error('Network request failed');
      fetchMock.mockRejectedValueOnce(networkError);

      // Act & Assert: Expect the function to throw the network error
      await expect(endSession(sessionId)).rejects.toThrow('Network request failed');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}/end`, expect.anything());
    });
  });

  describe('getSessionReport', () => {
    it('should fetch the session report and return the parsed data on success', async () => {
      // Arrange: Define mock report data
      const sessionId = 'test-session-id';
      const mockReport: MvpReportData = {
        sessionId: sessionId,
        startTime: new Date(),
        endTime: new Date(),
        durationConfigured: 600,
        durationActual: 550,
        personaName: 'Technical Lead',
        overallSummary: 'Good session.',
        turns: [],
      };
      fetchMock.mockResponseOnce(JSON.stringify(mockReport), { status: 200 });

      // Act: Call the function
      const result = await getSessionReport(sessionId);

      // Assert: Verify fetch was called correctly (GET, URL) and the result matches
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}/report`);
      expect(result).toEqual(mockReport);
    });

    it('should throw an error if the API returns a non-2xx status', async () => {
      // Arrange: Define a mock error response
      const sessionId = 'test-session-id';
      fetchMock.mockResponseOnce(JSON.stringify({ error: 'Server Error' }), { status: 500, statusText: 'Internal Server Error' });

      // Act & Assert: Expect the function to throw an error
      await expect(getSessionReport(sessionId)).rejects.toThrow('API error: 500 Internal Server Error');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}/report`);
    });

    it('should throw a Zod error if the response data is invalid', async () => {
      // Arrange: Define a mock response with invalid data
      const sessionId = 'test-session-id';
      const invalidData = { sessionId: sessionId, startTime: 'wrong date format' }; // Invalid structure
      fetchMock.mockResponseOnce(JSON.stringify(invalidData), { status: 200 });

      // Act & Assert: Expect the function to throw a Zod error
      await expect(getSessionReport(sessionId)).rejects.toThrow(); // Expect a Zod parsing error

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}/report`);
    });

    it('should handle network errors during fetch', async () => {
      // Arrange: Simulate a network error
      const sessionId = 'test-session-id';
      const networkError = new Error('Network request failed');
      fetchMock.mockRejectedValueOnce(networkError);

      // Act & Assert: Expect the function to throw the network error
      await expect(getSessionReport(sessionId)).rejects.toThrow('Network request failed');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`/api/mvp-sessions/${sessionId}/report`);
    });
  });
}); 