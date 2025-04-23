// frontend/src/__tests__/ForgotPassword.test.jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import ForgotPassword from "../ForgotPassword"; // Adjust path as needed
import { sendPasswordResetEmail } from "../firebase"; // Use named import
import { toast } from "react-toastify";

// Mock dependencies
jest.mock("../firebase");
jest.mock("react-toastify");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

describe("ForgotPassword Component", () => {
  const renderComponent = () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders the forgot password form", () => {
    renderComponent();
    expect(
      screen.getByRole("heading", { name: /forgot password/i })
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/enter your email/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reset password/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to sign in/i })
    ).toBeInTheDocument();
  });

  test("calls sendPasswordResetEmail on form submission with valid email", async () => {
    sendPasswordResetEmail.mockResolvedValueOnce(undefined); // Mock successful email sending
    renderComponent();
    const user = userEvent.setup();

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        "test@example.com"
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Password reset email sent. Please check your inbox."
      );
    });
  });

  test("shows error toast if email sending fails", async () => {
    const errorMessage = "Firebase error: Unable to send email";
    sendPasswordResetEmail.mockRejectedValueOnce(new Error(errorMessage)); // Mock failed email sending
    renderComponent();
    const user = userEvent.setup();

    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    await user.type(emailInput, "fail@example.com");
    await user.click(submitButton);

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      // Check for a generic error message or the specific one if handled
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to send password reset email")
      );
      // Optionally check if the specific error message is included:
      // expect(toast.error).toHaveBeenCalledWith(`Failed to send password reset email. ${errorMessage}`);
    });
  });

  test("does not submit if email is empty", async () => {
    renderComponent();
    const user = userEvent.setup();
    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    await user.click(submitButton);

    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled(); // Or check for a specific validation message if you add one
  });
});
