// frontend/src/pages/auth/__tests__/SignUp.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom"; // Use MemoryRouter for routing context
import SignUp from "../SignUp";
import { AuthProvider } from "../../../context/AuthContext"; // Import real provider for structure, but hooks might be mocked

// Mock dependencies
import { createUserWithEmailAndPassword, setDoc, doc } from "../../../firebase"; // Use named imports matching your mock
import { toast } from "react-toastify";

// Mock the necessary modules
jest.mock("../../../firebase"); // Use the mock from __mocks__
jest.mock("react-toastify");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"), // Keep original stuff like Link
  useNavigate: () => jest.fn().mockImplementation(() => {}), // Mock navigate
}));

// Mock context if needed, or provide a simplified mock provider
jest.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({
    setAuthUser: jest.fn(),
    loading: false, // Mock loading state if used directly
    // Add other context values if needed
  }),
  // Keep AuthProvider if SignUp relies on its structure, otherwise mock it too
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

describe("SignUp Component", () => {
  const renderComponent = () => {
    render(
      <MemoryRouter>
        {/* You might need to wrap with your actual AuthProvider if it provides
            more than just setAuthUser or if SignUp consumes it directly */}
        <SignUp />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test("renders sign-up form elements", () => {
    renderComponent();
    expect(
      screen.getByRole("heading", { name: /sign up now/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^password$/i)).toBeInTheDocument(); // Use regex for exact match
    expect(
      screen.getByPlaceholderText(/confirm password/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument(); // Role selection
    expect(
      screen.getByRole("button", { name: /sign up/i })
    ).toBeInTheDocument();
  });

  test("shows error if passwords do not match", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/email/i), "test@example.com");
    await user.type(screen.getByPlaceholderText(/^password$/i), "password123");
    await user.type(
      screen.getByPlaceholderText(/confirm password/i),
      "password456"
    );
    await user.selectOptions(screen.getByRole("combobox"), "Resident");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(
      await screen.findByText(/passwords do not match/i)
    ).toBeInTheDocument();
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Passwords do not match");
  });

  test("shows error if email is already in use", async () => {
    // Mock Firebase to throw 'auth/email-already-in-use'
    createUserWithEmailAndPassword.mockRejectedValueOnce({
      code: "auth/email-already-in-use",
    });
    renderComponent();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText(/email/i),
      "existing@example.com"
    );
    await user.type(screen.getByPlaceholderText(/^password$/i), "password123");
    await user.type(
      screen.getByPlaceholderText(/confirm password/i),
      "password123"
    );
    await user.selectOptions(screen.getByRole("combobox"), "Resident");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Email already in use.");
    });
    expect(createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
    expect(setDoc).not.toHaveBeenCalled();
  });

  test("calls firebase auth and firestore on successful sign-up", async () => {
    // Setup successful mock return
    const mockUserCred = {
      user: { uid: "new-user-uid", email: "new@example.com" },
    };
    createUserWithEmailAndPassword.mockResolvedValueOnce(mockUserCred);
    setDoc.mockResolvedValueOnce(undefined); // Mock setDoc success

    renderComponent();
    const user = userEvent.setup();

    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/^password$/i);
    const confirmPasswordInput =
      screen.getByPlaceholderText(/confirm password/i);
    const roleSelect = screen.getByRole("combobox");
    const signUpButton = screen.getByRole("button", { name: /sign up/i });

    await user.type(emailInput, "new@example.com");
    await user.type(passwordInput, "password123");
    await user.type(confirmPasswordInput, "password123");
    await user.selectOptions(roleSelect, "Staff"); // Select 'Staff' role
    await user.click(signUpButton);

    // Wait for async operations
    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(), // Mocked auth instance
        "new@example.com",
        "password123"
      );
    });

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledTimes(1);
      // Check if setDoc is called with the correct user data structure
      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: "users/new-user-uid" }), // Check the doc path
        expect.objectContaining({
          // Check the data being set
          email: "new@example.com",
          role: "Staff", // Ensure correct role
          status: "pending", // Ensure status is pending
        })
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Sign up request sent successfully! Please wait for admin approval."
      );
    });

    // Optionally check for navigation if it happens on success
    // const navigate = require('react-router-dom').useNavigate();
    // expect(navigate).toHaveBeenCalledWith('/signin'); // Or wherever it navigates
  });

  test("handles generic firebase error during sign up", async () => {
    createUserWithEmailAndPassword.mockRejectedValueOnce(
      new Error("Firebase generic error")
    );
    renderComponent();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/email/i), "error@example.com");
    await user.type(screen.getByPlaceholderText(/^password$/i), "password123");
    await user.type(
      screen.getByPlaceholderText(/confirm password/i),
      "password123"
    );
    await user.selectOptions(screen.getByRole("combobox"), "Resident");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to sign up. Please try again."
      );
    });
    expect(setDoc).not.toHaveBeenCalled();
  });

  test("handles firestore error after successful auth", async () => {
    // Setup successful auth mock return, but Firestore fail
    const mockUserCred = {
      user: { uid: "firestore-fail-uid", email: "firestore@fail.com" },
    };
    createUserWithEmailAndPassword.mockResolvedValueOnce(mockUserCred);
    setDoc.mockRejectedValueOnce(new Error("Firestore error")); // Mock setDoc failure

    renderComponent();
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText(/email/i),
      "firestore@fail.com"
    );
    await user.type(screen.getByPlaceholderText(/^password$/i), "password123");
    await user.type(
      screen.getByPlaceholderText(/confirm password/i),
      "password123"
    );
    await user.selectOptions(screen.getByRole("combobox"), "Staff");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to save user data. Please contact support."
      );
    });
  });
});
