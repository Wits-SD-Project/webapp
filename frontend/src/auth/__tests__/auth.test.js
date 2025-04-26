// frontend/src/auth/__tests__/auth.test.js
import { getAuth } from "firebase/auth";
import {
  getAuthToken,
  signUpWithThirdParty,
  signInWithThirdParty,
  uploadFacility,
} from "../auth"; // Adjust path

// Mock Firebase getAuth
jest.mock("firebase/auth");

// Mock global fetch
global.fetch = jest.fn();

describe("Auth API Utilities", () => {
  beforeEach(() => {
    fetch.mockClear(); // Clear fetch mock calls
    getAuth.mockClear(); // Clear getAuth mock calls
  });

  // --- getAuthToken ---
  test("getAuthToken throws error if user is not authenticated", async () => {
    getAuth.mockReturnValue({ currentUser: null }); // Simulate no user
    await expect(getAuthToken()).rejects.toThrow("User not authenticated");
    expect(getAuth).toHaveBeenCalledTimes(1);
  });

  test("getAuthToken returns token for authenticated user", async () => {
    const mockToken = "mock-firebase-token";
    const mockUser = { getIdToken: jest.fn().mockResolvedValue(mockToken) };
    getAuth.mockReturnValue({ currentUser: mockUser }); // Simulate logged-in user

    const token = await getAuthToken();

    expect(token).toBe(mockToken);
    expect(getAuth).toHaveBeenCalledTimes(1);
    expect(mockUser.getIdToken).toHaveBeenCalledTimes(1);
  });

  // --- signUpWithThirdParty ---
  test("signUpWithThirdParty successfully calls API", async () => {
    const mockResponse = { success: true, userId: "new-third-party-user" };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const params = {
      idToken: "third-party-token",
      provider: "google",
      role: "Resident",
    };
    const result = await signUpWithThirdParty(params);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/auth/signup/thirdparty", // Ensure URL matches
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  test("signUpWithThirdParty throws error on API failure", async () => {
    const mockError = { message: "Third-party signup failed from API" };
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => mockError, // Simulate API error response
    });

    const params = { idToken: "fail-token", provider: "google", role: "Staff" };
    await expect(signUpWithThirdParty(params)).rejects.toThrow(
      mockError.message
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("signUpWithThirdParty throws generic error if no message from API", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}), // Simulate API error response with no message
    });
    const params = { idToken: "fail-token", provider: "google", role: "Staff" };
    await expect(signUpWithThirdParty(params)).rejects.toThrow(
      "Third-party signup failed"
    );
  });

  // --- signInWithThirdParty ---
  test("signInWithThirdParty successfully calls API", async () => {
    const mockResponse = { success: true, token: "backend-jwt" };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });
    const params = { idToken: "signin-token" };
    const result = await signInWithThirdParty(params);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/auth/signin/thirdparty", // Ensure URL matches
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  test("signInWithThirdParty throws error on API failure", async () => {
    const mockError = { message: "Third-party signin failed from API" };
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => mockError,
    });
    const params = { idToken: "signin-fail-token" };
    await expect(signInWithThirdParty(params)).rejects.toThrow(
      mockError.message
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("signInWithThirdParty throws generic error if no message from API", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}), // Simulate API error response with no message
    });
    const params = { idToken: "signin-fail-token" };
    await expect(signInWithThirdParty(params)).rejects.toThrow(
      "Third-party signin failed"
    );
  });

  // --- uploadFacility ---
  test("uploadFacility successfully calls API", async () => {
    const mockResponse = { success: true, facilityId: "facility-123" };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });
    const params = {
      name: "Test Facility",
      type: "Tennis Court",
      isOutdoors: true,
      availability: {},
    };
    const result = await uploadFacility(params);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/facilities/upload:", // Ensure URL matches
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        credentials: "include",
      })
    );
    expect(result).toEqual(mockResponse);
  });

  test("uploadFacility throws error on API failure", async () => {
    const mockError = { message: "Facility upload failed from API" };
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => mockError,
    });
    const params = {
      name: "Fail Facility",
      type: "Pool",
      isOutdoors: false,
      availability: {},
    };
    await expect(uploadFacility(params)).rejects.toThrow(mockError.message);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("uploadFacility throws generic error if no message from API", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}), // Simulate API error response with no message
    });
    const params = {
      name: "Fail Facility",
      type: "Pool",
      isOutdoors: false,
      availability: {},
    };
    await expect(uploadFacility(params)).rejects.toThrow(
      "Facility Upload Failed"
    );
  });
});
import {
    getAuthToken,
    signUpWithThirdParty,
    signInWithThirdParty,
    uploadFacility,
  } from '../auth';
  
  jest.mock('firebase/auth', () => ({
    getAuth: jest.fn(),
  }));
  
  global.fetch = jest.fn();
  
  describe('API Utilities', () => {
    const { getAuth } = require('firebase/auth');
  
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    describe('getAuthToken', () => {
      it('should return a token if user is authenticated', async () => {
        getAuth.mockReturnValue({
          currentUser: {
            getIdToken: jest.fn(() => Promise.resolve('mock-id-token')),
          },
        });
  
        const token = await getAuthToken();
        expect(token).toBe('mock-id-token');
      });
  
      it('should throw if user is not authenticated', async () => {
        getAuth.mockReturnValue({ currentUser: null });
  
        await expect(getAuthToken()).rejects.toThrow('User not authenticated');
      });
    });
  
    describe('signUpWithThirdParty', () => {
      it('should call fetch and return JSON on success', async () => {
        const mockResponse = { message: 'Signup successful' };
        fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });
  
        const res = await signUpWithThirdParty({
          idToken: 'token',
          provider: 'google',
          role: 'user',
        });
  
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/auth/signup/thirdparty',
          expect.objectContaining({
            method: 'POST',
          })
        );
        expect(res).toEqual(mockResponse);
      });
  
      it('should throw error on failed signup', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ message: 'Signup failed' }),
        });
  
        await expect(
          signUpWithThirdParty({ idToken: 'x', provider: 'y', role: 'z' })
        ).rejects.toThrow('Signup failed');
      });
    });
  
    describe('signInWithThirdParty', () => {
      it('should return response JSON on success', async () => {
        const mockResponse = { token: 'abc' };
        fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });
  
        const res = await signInWithThirdParty({ idToken: 'some-token' });
        expect(res).toEqual(mockResponse);
      });
  
      it('should throw error on failed signin', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ message: 'Signin failed' }),
        });
  
        await expect(
          signInWithThirdParty({ idToken: 'bad-token' })
        ).rejects.toThrow('Signin failed');
      });
    });
  
    describe('uploadFacility', () => {
      it('should upload facility and return JSON', async () => {
        const mockRes = { id: 'facility123' };
        fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRes),
        });
  
        const result = await uploadFacility({
          name: 'Test Gym',
          type: 'basketball',
          isOutdoors: false,
          availability: ['Mon', 'Tue'],
        });
  
        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/facilities/upload',
          expect.objectContaining({
            method: 'POST',
          })
        );
        expect(result).toEqual(mockRes);
      });
  
      it('should throw error on failure', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ message: 'Upload failed' }),
        });
  
        await expect(
          uploadFacility({
            name: 'Fail Gym',
            type: 'badminton',
            isOutdoors: true,
            availability: [],
          })
        ).rejects.toThrow('Upload failed');
      });
    });
  });
  