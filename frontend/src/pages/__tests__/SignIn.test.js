import { render, screen } from "@testing-library/react";
import SignIn from "../SignIn";
import "@testing-library/jest-dom";

describe("SignIn page", () => {
  test("renders the sign-in heading", () => {
    render(<SignIn />);
    const heading = screen.getByRole("heading", { name: /sign in now/i });
    expect(heading).toBeInTheDocument();
  });

  test("renders the email input", () => {
    render(<SignIn />);
    const emailInput = screen.getByPlaceholderText(/email/i);
    expect(emailInput).toBeInTheDocument();
  });

  test("renders the password input", () => {
    render(<SignIn />);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    expect(passwordInput).toBeInTheDocument();
  });

  test("renders the sign-in button", () => {
    render(<SignIn />);
    const button = screen.getByRole("button", { name: /sign in/i });
    expect(button).toBeInTheDocument();
  });
});
