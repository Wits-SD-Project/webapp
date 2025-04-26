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
