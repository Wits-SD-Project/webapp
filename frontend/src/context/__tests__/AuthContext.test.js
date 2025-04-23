// frontend/src/context/__tests__/AuthContext.test.js
import React, { useContext } from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider, useAuth, AuthContext } from "../AuthContext"; // Adjust path
import {
  onAuthStateChanged,
  getAuth,
  signOut,
  getDoc,
  doc,
} from "../../firebase"; // Use named imports

// Mock Firebase
jest.mock("../../firebase");

// Test component to consume the context
const TestConsumerComponent = () => {
  const { authUser, loading, userRole, logout } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="user">{authUser ? authUser.uid : "null"}</div>
      <div data-testid="role">{userRole || "null"}</div>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe("AuthContext", () => {
  let authCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    // Capture the callback passed to onAuthStateChanged
    onAuthStateChanged.mockImplementation((auth, callback) => {
      authCallback = callback; // Store the callback
      // Return a mock unsubscribe function
      return jest.fn();
    });
    // Ensure getAuth is mocked
    getAuth.mockReturnValue({});
    // Mock getDoc to return a default role
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: "Resident" }), // Default role for tests
    });
    signOut.mockResolvedValue(undefined);
  });

  test("initial state has loading true and no user/role", () => {
    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );
    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(screen.getByTestId("user")).toHaveTextContent("null");
    expect(screen.getByTestId("role")).toHaveTextContent("null");
  });

  test("sets user and role when auth state changes to logged in", async () => {
    const mockUser = { uid: "user123", email: "user@test.com" };
    getDoc.mockResolvedValueOnce({
      // Specific mock for this user
      exists: () => true,
      data: () => ({ role: "Admin" }),
    });

    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );

    // Simulate Firebase firing the onAuthStateChanged callback with a user
    act(() => {
      authCallback(mockUser);
    });

    // Wait for async operations (getDoc) and state updates
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("user123");
    });
    await waitFor(() => {
      expect(getDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: "users/user123" })
      );
      expect(screen.getByTestId("role")).toHaveTextContent("Admin"); // Role from mocked getDoc
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  test("sets user to null and clears role when auth state changes to logged out", async () => {
    const mockUser = { uid: "user123", email: "user@test.com" };
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: "Staff" }),
    }); // Mock initial login

    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );

    // Simulate login first
    act(() => {
      authCallback(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("user123");
      expect(screen.getByTestId("role")).toHaveTextContent("Staff");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    // Simulate logout via onAuthStateChanged
    act(() => {
      authCallback(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("null");
      expect(screen.getByTestId("role")).toHaveTextContent("null");
      expect(screen.getByTestId("loading")).toHaveTextContent("false"); // Still false after logout state confirmed
    });
  });

  test("handles getDoc error when fetching role", async () => {
    const mockUser = { uid: "user-no-doc", email: "nodoc@test.com" };
    getDoc.mockRejectedValueOnce(new Error("Firestore error")); // Simulate getDoc failure

    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );

    act(() => {
      authCallback(mockUser);
    });

    // User should still be set, but role should remain null and loading should finish
    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("user-no-doc");
      expect(getDoc).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("role")).toHaveTextContent("null"); // Role fetch failed
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      // You might want to check for console.error output here
    });
  });

  test("calls firebase signOut on logout function call", async () => {
    const mockUser = { uid: "logout-test", email: "logout@test.com" };
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: "Resident" }),
    });

    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );

    // Simulate login
    act(() => {
      authCallback(mockUser);
    });
    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("logout-test")
    );

    // Click logout button provided by context
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    act(() => {
      logoutButton.click();
    });

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
      // Note: The state update (user to null) will happen via the onAuthStateChanged
      // callback triggered by the actual signOut, which we simulate separately.
      // Here we just check if our logout function calls the Firebase signOut.
    });

    // Simulate the resulting auth state change
    act(() => {
      authCallback(null);
    });
    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("null")
    );
  });
});
