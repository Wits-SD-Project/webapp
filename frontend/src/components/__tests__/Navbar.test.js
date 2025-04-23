// frontend/src/components/Navbar.test.js
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../context/AuthContext"; // Adjust path
import Navbar from "./Navbar"; // Adjust path

const mockLogout = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const renderNavbar = (user) => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user, logout: mockLogout }}>
        <Navbar />
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe("Navbar Component", () => {
  beforeEach(() => {
    mockLogout.mockClear();
    mockNavigate.mockClear();
  });

  test("renders logo and title", () => {
    renderNavbar(null); // Render as logged out
    // Check for logo if it's an img with alt text
    // expect(screen.getByAltText(/sports sphere logo/i)).toBeInTheDocument();
    // Or check for title text
    expect(screen.getByText(/sports sphere/i)).toBeInTheDocument();
  });

  test("renders sign in and sign up links when logged out", () => {
    renderNavbar(null);
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /logout/i })
    ).not.toBeInTheDocument();
  });

  test("renders welcome message and logout button when logged in", () => {
    const testUser = { email: "test@example.com" /* other user props */ };
    renderNavbar(testUser);

    // Check for a welcome message - adjust based on your Navbar's display
    // expect(screen.getByText(/welcome, test@example.com/i)).toBeInTheDocument();
    // Or just check for the logout button
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /sign in/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /sign up/i })
    ).not.toBeInTheDocument();
  });

  test("calls logout and navigates when logout button is clicked", async () => {
    const testUser = { email: "test@example.com" };
    mockLogout.mockResolvedValueOnce(); // Simulate successful logout

    renderNavbar(testUser);
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutButton);

    // Check if context logout function was called
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    // Check if navigation occurred (usually back to signin)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/signin"); // Adjust path if needed
    });
  });

  test("navigates correctly when links are clicked", () => {
    renderNavbar(null); // Logged out state

    const signInLink = screen.getByRole("link", { name: /sign in/i });
    const signUpLink = screen.getByRole("link", { name: /sign up/i });

    expect(signInLink).toHaveAttribute("href", "/signin");
    expect(signUpLink).toHaveAttribute("href", "/signup");

    // You can simulate clicks if needed, but checking href is often sufficient for links
    // fireEvent.click(signInLink);
    // assert navigation or check router state if using more advanced MemoryRouter setup
  });
});
