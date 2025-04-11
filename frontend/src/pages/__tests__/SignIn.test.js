import { render, screen } from "@testing-library/react";
import SignIn from "../auth/SignIn";
import "@testing-library/jest-dom";

// Mock external dependencies
jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ setAuthUser: jest.fn() }),
}));

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("SignIn page", () => {
  beforeEach(() => {
    render(<SignIn />);
  });

  test("renders the sign-in heading", () => {
    const heading = screen.getByRole("heading", { name: /sign in now/i });
    expect(heading).toBeInTheDocument();
  });

  test("renders the email input", () => {
    const emailInput = screen.getByPlaceholderText(/email/i);
    expect(emailInput).toBeInTheDocument();
  });

  test("renders the password input", () => {
    const passwordInput = screen.getByPlaceholderText(/password/i);
    expect(passwordInput).toBeInTheDocument();
  });

  test("renders the sign-in button", () => {
    const button = screen.getByRole("button", { name: /sign in/i });
    expect(button).toBeInTheDocument();
  });
});
