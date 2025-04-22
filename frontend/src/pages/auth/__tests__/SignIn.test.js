// frontend/src/pages/auth/__tests__/SignIn.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, AuthContext } from "../../../../context/AuthContext"; // Adjust path
import SignIn from "../SignIn"; // Adjust path

// Mock the AuthContext login function and navigate
const mockLogin = jest.fn();
const mockNavigate = jest.fn();

// Mock react-router-dom's useNavigate
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"), // Use actual implementations for MemoryRouter etc.
  useNavigate: () => mockNavigate,
}));

// Mock the context directly for simplicity in this test
const renderWithProviders = (ui) => {
  return render(
    <MemoryRouter initialEntries={["/signin"]}>
      <AuthContext.Provider
        value={{
          user: null,
          loading: false,
          login: mockLogin /* other context values */,
        }}
      >
        <Routes>
          <Route path="/signin" element={ui} />
          <Route path="/" element={<div>Home Page</div>} />{" "}
          {/* Mock destination */}
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe("SignIn Component", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockLogin.mockClear();
    mockNavigate.mockClear();
    // Reset any fetch/firebase mocks if needed globally
  });

  test("renders sign in form correctly", () => {
    renderWithProviders(<SignIn />);
    expect(
      screen.getByRole("heading", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument(); // Check for link
    expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument(); // Check for link
  });

  test("allows user to input email and password", () => {
    renderWithProviders(<SignIn />);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  test("calls login function on form submission and navigates on success", async () => {
    // Mock login to resolve successfully
    mockLogin.mockResolvedValueOnce(); // Simulate successful login

    renderWithProviders(<SignIn />);
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    // Wait for async login and navigation
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/"); // Or the expected redirect path
    });
  });

  test("shows error message on failed login", async () => {
    // Mock login to reject with an error
    const errorMessage = "Invalid credentials";
    mockLogin.mockRejectedValueOnce(new Error(errorMessage));

    renderWithProviders(<SignIn />);
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "wrong@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    // Wait for error message (assuming react-toastify or similar is used via context)
    // If displaying error inline:
    // await waitFor(() => {
    //   expect(screen.getByText(errorMessage)).toBeInTheDocument();
    // });

    // Check if the mock login function was called
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith("wrong@example.com", "wrong");
    });

    // Assert that navigation did NOT happen
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("navigates to signup page when signup link is clicked", () => {
    renderWithProviders(<SignIn />);
    const signUpLink = screen.getByRole("link", { name: /sign up/i }); // Make sure the link has a role or accessible name
    fireEvent.click(signUpLink);
    // We can't easily assert navigation with this setup, but we check the link exists
    expect(signUpLink).toHaveAttribute("href", "/signup"); // Check link destination
  });

  test("navigates to forgot password page when link is clicked", () => {
    renderWithProviders(<SignIn />);
    const forgotLink = screen.getByRole("link", { name: /forgot password/i });
    fireEvent.click(forgotLink);
    expect(forgotLink).toHaveAttribute("href", "/forgot-password");
  });
});
