/**
 * ResSideBar.test.js  – full‑coverage version
 *
 * Adds:
 *  • logo‑button navigation
 *  • "active" CSS class assertion
 *  • logout *error* branch (server !ok)
 *  • guards that every menu item calls the right path
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import ResSideBar from "../components/ResSideBar";

/* ----------------------------- mocks -------------------------------- */
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

import { auth } from "../firebase";
auth.signOut = jest.fn(() => Promise.resolve());

global.fetch = jest.fn();

/* ----------------------------- helpers ------------------------------ */
const renderBar = (active = "dashboard") =>
  render(<ResSideBar activeItem={active} />);

const click = (text) => fireEvent.click(screen.getByText(text));

/* ----------------------------- tests -------------------------------- */
describe("ResSideBar – rigorous coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* ------------------ static render tests ------------------ */
  it('adds the "active" class only to the active item', () => {
    renderBar("notifications");

    const activeLi = screen.getByText(/notifications/i).closest("li");
    expect(activeLi).toHaveClass("active");

    ["Dashboard", "Facility Bookings", "Maintenance", "Log Out"].forEach(
      (t) => {
        expect(
          screen.getByText(new RegExp(t, "i")).closest("li")
        ).not.toHaveClass("active");
      }
    );
  });

  it("logo button navigates to /res-dashboard", () => {
    renderBar();
    fireEvent.click(
      screen.getByRole("button", { name: /sports sphere logo/i })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/res-dashboard");
  });

  /* ------------------ per‑item navigation ------------------ */
  const navCases = [
    ["Dashboard", "/res-dashboard"],
    ["Facility Bookings", "/resident-dashboard"],
    ["Maintenance", "/res-maintenance"],
    ["Notifications", "/res-notifications"],
  ];

  test.each(navCases)('clicking "%s" navigates to %s', (label, path) => {
    renderBar();
    click(label);
    expect(mockNavigate).toHaveBeenCalledWith(path);
  });

  /* ------------------ logout paths ------------------ */
  it("logout success path already covered – sanity check still passes", async () => {
    fetch.mockResolvedValueOnce({ ok: true });
    renderBar();
    click(/log out/i);

    await waitFor(() => {
      expect(auth.signOut).toHaveBeenCalled();
      expect(mockSetAuthUser).toHaveBeenCalledWith(null);
      const { toast } = require("react-toastify");
      expect(toast.success).toHaveBeenCalledWith("Logged out");
      expect(mockNavigate).toHaveBeenCalledWith("/signin");
    });
  });

  it("logout **error** path (server !ok) still clears and redirects", async () => {
    fetch.mockResolvedValueOnce({ ok: false }); // triggers error branch
    renderBar();
    click(/log out/i);

    await waitFor(() => {
      expect(auth.signOut).toHaveBeenCalled();
      expect(mockSetAuthUser).toHaveBeenCalledWith(null);
      // toast should still fire because component doesn’t gate it on ok
      const { toast } = require("react-toastify");
      expect(toast.success).toHaveBeenCalledWith("Logged out");
      expect(mockNavigate).toHaveBeenCalledWith("/signin");
    });
  });
});
