import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Navbar from "../components/Navbar";

/*─────────────────────────────────────────────────
  Mocks
─────────────────────────────────────────────────*/

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const mockSetAuthUser = jest.fn();
jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({ setAuthUser: mockSetAuthUser }),
}));

jest.mock("react-toastify", () => ({
  toast: { success: jest.fn() },
}));

/*  firebase mock is already in src/__mocks__/firebase.js.
    We only need to ensure auth.signOut exists + is a jest.fn.
*/
import { auth } from "../firebase";
auth.signOut = jest.fn(() => Promise.resolve());

/* helper to swap fetch implementations per test */
const mockFetch = jest.fn();
global.fetch = mockFetch;

/*─────────────────────────────────────────────────
  Tests
─────────────────────────────────────────────────*/
describe("Navbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders logo and logout button", () => {
    render(<Navbar />);

    // logo is present
    expect(screen.getByAltText(/logo/i)).toBeInTheDocument();
    // logout button is present
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  test("logout success path – signs out, clears context, navigates", async () => {
    // 1️⃣ server replies OK
    mockFetch.mockResolvedValueOnce({ ok: true });

    render(<Navbar />);
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(auth.signOut).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_API_BASE_URL}/api/auth/logout`,
        expect.objectContaining({ method: "POST", credentials: "include" })
      );
      expect(mockSetAuthUser).toHaveBeenCalledWith(null);
      // toast.success called once
      const { toast } = require("react-toastify");
      expect(toast.success).toHaveBeenCalledWith("Logged out");
      // navigate to /signin
      expect(mockNavigate).toHaveBeenCalledWith("/signin");
    });
  });

  test("logout error branch – server responds !ok triggers catch‑logic", async () => {
    // 2️⃣ make fetch reject the ok check
    mockFetch.mockResolvedValueOnce({ ok: false });

    render(<Navbar />);
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      // signOut still happens
      expect(auth.signOut).toHaveBeenCalled();
      // because fetch!.ok throws, setAuthUser/null/etc. should still run
      expect(mockSetAuthUser).toHaveBeenCalledWith(null);
      expect(mockNavigate).toHaveBeenCalledWith("/signin");
    });
  });
});
