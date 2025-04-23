// frontend/src/components/__tests__/Navbar.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter, useNavigate } from "react-router-dom";
import Navbar from "../Navbar"; // Adjust path
import { useAuth } from "../../context/AuthContext"; // Adjust path
import { auth } from "../../firebase"; // Import mocked auth
import { toast } from "react-toastify";

// Mock dependencies
jest.mock("../../firebase"); // Mock firebase auth object
jest.mock("../../context/AuthContext");
jest.mock("react-toastify");

// Mock react-router-dom specifically useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock global fetch for the logout API call
global.fetch = jest.fn();

describe("Navbar Component", () => {
  const mockSetAuthUser = jest.fn();

  const renderComponent = () => {
    // Setup mock context value
    useAuth.mockReturnValue({
      setAuthUser: mockSetAuthUser,
      // Add other context values if Navbar consumes them
    });
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear(); // Clear fetch mock
    // Provide a mock implementation for auth.signOut if not in __mocks__
    if (!auth.signOut) {
      auth.signOut = jest.fn().mockResolvedValue(undefined);
    }
  });

  test("renders logo and logout button", () => {
    renderComponent();
    expect(screen.getByAltText("Logo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  test("clicking logout calls Firebase signOut, fetch API, updates context, shows toast, and navigates", async () => {
    // Mock successful fetch response
    fetch.mockResolvedValueOnce({ ok: true });
    auth.signOut.mockResolvedValueOnce(undefined); // Ensure signOut resolves

    renderComponent();
    const user = userEvent.setup();
    const logoutButton = screen.getByRole("button", { name: /logout/i });

    await user.click(logoutButton);

    // Check Firebase sign out
    await waitFor(() => {
      expect(auth.signOut).toHaveBeenCalledTimes(1);
    });

    // Check fetch call to backend logout
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/auth/logout",
        expect.objectContaining({ method: "POST", credentials: "include" })
      );
    });

    // Check context update
    expect(mockSetAuthUser).toHaveBeenCalledTimes(1);
    expect(mockSetAuthUser).toHaveBeenCalledWith(null);

    // Check toast message
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Logged out");

    // Check navigation
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/signin");
  });

  test("handles Firebase signOut error during logout", async () => {
    const error = new Error("Firebase signout failed");
    auth.signOut.mockRejectedValueOnce(error); // Simulate Firebase error
    // Fetch might still be called or not, depending on flow, assume it might not be
    fetch.mockResolvedValueOnce({ ok: true });

    renderComponent();
    const user = userEvent.setup();
    const logoutButton = screen.getByRole("button", { name: /logout/i });

    // Spy on console.error
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await user.click(logoutButton);

    await waitFor(() => {
      expect(auth.signOut).toHaveBeenCalledTimes(1);
    });

    // Check that the error was logged
    expect(consoleSpy).toHaveBeenCalledWith("Firebase signout error:", error);

    // Context, toast, and navigation should still happen even if Firebase fails
    expect(mockSetAuthUser).toHaveBeenCalledWith(null);
    expect(toast.success).toHaveBeenCalledWith("Logged out");
    expect(mockNavigate).toHaveBeenCalledWith("/signin");

    consoleSpy.mockRestore(); // Restore console.error
  });

  test("handles fetch API error during logout", async () => {
    auth.signOut.mockResolvedValueOnce(undefined); // Firebase signout is successful
    fetch.mockResolvedValueOnce({ ok: false, statusText: "Server Error" }); // Simulate fetch failure

    renderComponent();
    const user = userEvent.setup();
    const logoutButton = screen.getByRole("button", { name: /logout/i });

    await user.click(logoutButton);

    await waitFor(() => {
      expect(auth.signOut).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Should still proceed with context update, toast, and navigation
    expect(mockSetAuthUser).toHaveBeenCalledWith(null);
    expect(toast.success).toHaveBeenCalledWith("Logged out");
    expect(mockNavigate).toHaveBeenCalledWith("/signin");
    // Maybe add a console.error check if you log the fetch error specifically
  });
});
