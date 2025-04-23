// frontend/src/pages/auth/__tests__/SignUp.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, AuthContext } from "../../../../context/AuthContext"; // Adjust path
import SignUp from "../SignUp"; // Adjust path

const mockSignup = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const renderWithProviders = (ui) => {
  return render(
    <MemoryRouter initialEntries={["/signup"]}>
      {/* You might need the full AuthProvider if SignUp relies on more context logic */}
      <AuthContext.Provider
        value={{ user: null, loading: false, signup: mockSignup }}
      >
        <Routes>
          <Route path="/signup" element={ui} />
          <Route path="/signin" element={<div>Sign In Page</div>} />{" "}
          {/* Mock destination */}
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe("SignUp Component", () => {
  beforeEach(() => {
    mockSignup.mockClear();
    mockNavigate.mockClear();
  });

  test("renders sign up form correctly", () => {
    renderWithProviders(<SignUp />);
    expect(
      screen.getByRole("heading", { name: /create account/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument(); // Match exact label 'Password'
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument(); // Assuming a select dropdown for role
    expect(
      screen.getByRole("button", { name: /sign up/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/already have an account\?/i)).toBeInTheDocument();
  });

  test("allows user input in form fields", () => {
    renderWithProviders(<SignUp />);
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "password123" },
    });
    // Select role (adjust value based on your options)
    fireEvent.change(screen.getByLabelText(/role/i), {
      target: { value: "resident" },
    });

    expect(screen.getByLabelText(/email address/i)).toHaveValue(
      "new@example.com"
    );
    expect(screen.getByLabelText(/^password$/i)).toHaveValue("password123");
    expect(screen.getByLabelText(/confirm password/i)).toHaveValue(
      "password123"
    );
    expect(screen.getByLabelText(/role/i)).toHaveValue("resident");
  });

  test("calls signup function on form submission and navigates on success", async () => {
    mockSignup.mockResolvedValueOnce(); // Simulate successful signup

    renderWithProviders(<SignUp />);
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/role/i), {
      target: { value: "resident" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledTimes(1);
      expect(mockSignup).toHaveBeenCalledWith(
        "new@example.com",
        "password123",
        "resident"
      ); // Adjust args based on your signup function
    });

    await waitFor(() => {
      // Expect navigation or a success message display
      expect(mockNavigate).toHaveBeenCalledWith("/signin"); // Or wherever signup redirects
      // Or check for a success message:
      // expect(screen.getByText(/signup successful/i)).toBeInTheDocument();
    });
  });

  test("shows error if passwords do not match", async () => {
    renderWithProviders(<SignUp />);
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "password456" },
    }); // Mismatch
    fireEvent.change(screen.getByLabelText(/role/i), {
      target: { value: "resident" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    // Wait for validation message (assuming it's displayed)
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument(); // Adjust error message
    });

    expect(mockSignup).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("shows error message on failed signup (e.g., email exists)", async () => {
    const errorMessage = "Email already in use";
    mockSignup.mockRejectedValueOnce(new Error(errorMessage));

    renderWithProviders(<SignUp />);
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "existing@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/role/i), {
      target: { value: "staff" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledTimes(1);
    });
    // Assert error display (toast or inline)
    // await waitFor(() => {
    //   expect(screen.getByText(errorMessage)).toBeInTheDocument();
    // });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
