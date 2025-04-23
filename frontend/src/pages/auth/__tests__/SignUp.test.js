// src/pages/auth/__tests__/SignUp.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event"; // Correct import
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom"; // Use MemoryRouter for routing context
import SignUp from "../SignUp";
import { __triggerAuthCallback } from "../../../firebase";
// AuthProvider might not be needed if useAuth is mocked directly
// import { AuthProvider } from "../../../context/AuthContext";

// Mock dependencies
// Use named imports matching your firebase module structure and the mock

import { toast } from "react-toastify";

// Mock the necessary modules

jest.mock("../../../auth/auth", () => ({
  signUpWithThirdParty: jest.fn(),
}));

jest.mock("../../../firebase"); // Use the mock from __mocks__
jest.mock("react-toastify");
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"), // Keep original stuff like Link
  useNavigate: () => mockNavigate, // Mock navigate
}));

jest.mock("firebase/auth", () => ({
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: class {
    static credentialFromResult = jest.fn();
  },
}));

beforeAll(() => {
  // Suppress logs during tests
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

describe("SignUp Component", () => {
  const renderComponent = () => {
    render(
      <MemoryRouter>
        {/* No Provider needed if context isn't directly used by SignUp */}
        <SignUp />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockNavigate.mockClear(); // Clear navigate mock calls
  });

  test("renders sign-up form elements", () => {
    renderComponent();
    expect(
      // Correct the heading text query
      screen.getByRole("heading", { name: /create your account/i })
    ).toBeInTheDocument();
    // Inputs are MUI based, check for role and label instead of placeholder
    expect(screen.getByRole("combobox", { name: /role/i })).toBeInTheDocument(); // Role selection
    // Check for the Google button
    expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
    // Check for the sign-in link
    expect(
      screen.getByRole("link", { name: /sign in here/i })
    ).toBeInTheDocument();
  });

  test("shows error if role is not selected before Google sign-up", async () => {
    renderComponent();
    const user = userEvent.setup();
    const googleButton = screen.getByRole("button", { name: /google/i });

    await user.click(googleButton);

    expect(toast.error).toHaveBeenCalledWith("Please select a role first");
    // Ensure Firebase popup wasn't called
    // Need to mock signInWithPopup if checking this
    // const { signInWithPopup } = require('firebase/auth'); // Assuming this would be mocked
    // expect(signInWithPopup).not.toHaveBeenCalled();
  });

  // Add tests for successful Google sign-up, API errors, etc.
  // These would require mocking signInWithPopup and signUpWithThirdParty

  test("calls Google sign-up flow and backend on successful Google sign-up", async () => {
    const { signInWithPopup, GoogleAuthProvider } = require("firebase/auth"); // Import from mock
    const { signUpWithThirdParty } = require("../../../auth/auth"); // Import your API function
    GoogleAuthProvider.credentialFromResult = jest.fn(() => ({
      accessToken: "mock",
    }));
    // Mock Firebase popup success
    const mockFirebaseUser = {
      uid: "google-user-123",
      getIdToken: jest.fn().mockResolvedValue("mock-google-id-token"),
    };
    signInWithPopup.mockResolvedValue({
      user: mockFirebaseUser,
      credential: {
        /* mock credential if needed */
      }, // Mock credential if signUpWithThirdParty uses it
    });
    GoogleAuthProvider.credentialFromResult = jest.fn(() => ({
      /* mock credential */
    })); // Mock static method

    // Mock backend API success
    const mockBackendResponse = {
      userId: "backend-user-id",
      email: "google@test.com",
    };
    signUpWithThirdParty.mockResolvedValue(mockBackendResponse);

    renderComponent();
    const user = userEvent.setup();

    // Select role first
    const roleSelect = screen.getByRole("combobox", { name: /role/i });
    await user.click(roleSelect); // Open the select dropdown
    const staffOption = await screen.findByRole("option", {
      name: /facility staff/i,
    });
    await user.click(staffOption); // Select Staff role

    const googleButton = screen.getByRole("button", { name: /google/i });
    await user.click(googleButton);

    // Check Firebase popup call
    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalledTimes(1);
      // Optionally check arguments if needed: expect(signInWithPopup).toHaveBeenCalledWith(auth, expect.any(Object));
    });

    // Check backend API call
    await waitFor(() => {
      expect(signUpWithThirdParty).toHaveBeenCalledTimes(1);
      expect(signUpWithThirdParty).toHaveBeenCalledWith({
        idToken: "mock-google-id-token",
        provider: "google",
        role: "staff", // Ensure correct role selected
      });
    });

    // Check success toast
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining(
          `Account created for ${mockBackendResponse.email}. Awaiting admin approval.`
        )
      );
    });

    // Check navigation
    expect(mockNavigate).toHaveBeenCalledWith("/signin");
  });

  test("handles Google sign-up cancellation (popup closed)", async () => {
    const { signInWithPopup } = require("firebase/auth");

    // Mock Firebase popup closing
    signInWithPopup.mockRejectedValue({ code: "auth/popup-closed-by-user" });

    renderComponent();
    const user = userEvent.setup();

    // Select role
    const roleSelect = screen.getByRole("combobox", { name: /role/i });
    await user.click(roleSelect);
    const residentOption = await screen.findByRole("option", {
      name: /resident/i,
    });
    await user.click(residentOption);

    const googleButton = screen.getByRole("button", { name: /google/i });
    await user.click(googleButton);

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalledTimes(1);
    });

    // Check cancellation toast
    expect(toast.error).toHaveBeenCalledWith("Signup canceled");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("handles generic Google sign-up error", async () => {
    const { signInWithPopup } = require("firebase/auth");
    const { signUpWithThirdParty } = require("../../../auth/auth");

    // Mock Firebase popup error
    const error = new Error("Firebase generic auth error");
    signInWithPopup.mockRejectedValue(error);

    renderComponent();
    const user = userEvent.setup();

    // Select role
    const roleSelect = screen.getByRole("combobox", { name: /role/i });
    await user.click(roleSelect);
    const residentOption = await screen.findByRole("option", {
      name: /resident/i,
    });
    await user.click(residentOption);

    const googleButton = screen.getByRole("button", { name: /google/i });
    await user.click(googleButton);

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalledTimes(1);
    });

    // Check generic error toast
    expect(toast.error).toHaveBeenCalledWith("Signup failed: " + error.message);
    expect(signUpWithThirdParty).not.toHaveBeenCalled(); // Backend should not be called
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
