import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ResetPassword from "../ResetPassword";

describe("ResetPassword Component", () => {
  beforeEach(() => {
    render(<ResetPassword />);
  });

  test("renders heading and instructions", () => {
    expect(
      screen.getByRole("heading", { name: /reset your password/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/enter your new password below/i)
    ).toBeInTheDocument();
  });

  test("renders password fields and submit button", () => {
    const inputs = screen.getAllByPlaceholderText(/password/i);
    expect(inputs.length).toBe(2);
    expect(inputs[0]).toHaveAttribute("placeholder", "New password");
    expect(inputs[1]).toHaveAttribute("placeholder", "Confirm new password");

    expect(
      screen.getByRole("button", { name: /update password/i })
    ).toBeInTheDocument();
  });

  test("form does not submit by default", () => {
    const form = screen.getByTestId("reset-form");
    const submitEvent = new Event("submit", {
      bubbles: true,
      cancelable: true,
    });

    submitEvent.preventDefault = jest.fn(); // Intercept

    form.dispatchEvent(submitEvent);

    expect(submitEvent.preventDefault).toHaveBeenCalled();
  });
});
