// src/components/__tests__/SideBar.test.js
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter, useNavigate } from "react-router-dom";
import Sidebar from "../SideBar";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../firebase"; // Mocked firebase auth
import { toast } from "react-toastify";

// Mock dependencies
jest.mock("../../context/AuthContext");
jest.mock("../../firebase");
jest.mock("react-toastify");

// Mock navigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock global fetch for logout
global.fetch = jest.fn();

describe("Sidebar Component", () => {
  const mockSetAuthUser = jest.fn();

  const renderSidebar = (activeItem = "dashboard") => {
    useAuth.mockReturnValue({
      setAuthUser: mockSetAuthUser,
      authUser: { uid: "test" },
    }); // Assume logged in
    // Mock auth.signOut if not in firebase mock
    if (!auth.signOut) {
      auth.signOut = jest.fn().mockResolvedValue(undefined);
    }
    fetch.mockResolvedValue({ ok: true }); // Mock successful logout fetch

    return render(
      <MemoryRouter>
        <Sidebar activeItem={activeItem} />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders all menu items and highlights active item", () => {
    renderSidebar("manage facilities");
    expect(screen.getByAltText("Sports Sphere Logo")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    const manageFacilitiesItem = screen.getByText("Manage Facilities");
    expect(manageFacilitiesItem).toBeInTheDocument();
    expect(screen.getByText("View Bookings")).toBeInTheDocument();
    expect(screen.getByText("Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Log Out")).toBeInTheDocument();

    // Check active class
    expect(manageFacilitiesItem.closest("li")).toHaveClass("active");
    expect(screen.getByText("Dashboard").closest("li")).not.toHaveClass(
      "active"
    );
  });

  test.each([
    ["Dashboard", "/staff-dashboard"],
    ["Manage Facilities", "/staff-manage-facilities"],
    ["View Bookings", "/staff-view-bookings"],
    ["Maintenance", "/maintenance"],
  ])(
    'navigates correctly when "%s" item is clicked',
    async (itemName, expectedPath) => {
      renderSidebar();
      const user = userEvent.setup();
      await user.click(screen.getByText(itemName));
      expect(mockNavigate).toHaveBeenCalledWith(expectedPath);
    }
  );

  test("navigates to dashboard when logo is clicked", async () => {
    renderSidebar();
    const user = userEvent.setup();
    await user.click(screen.getByAltText("Sports Sphere Logo"));
    expect(mockNavigate).toHaveBeenCalledWith("/staff-dashboard");
  });

  test("calls logout handler when Log Out is clicked", async () => {
    renderSidebar();
    const user = userEvent.setup();
    auth.signOut.mockResolvedValueOnce(undefined);

    await user.click(screen.getByText("Log Out"));

    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_API_BASE_URL}/api/auth/logout`,
        expect.any(Object)
      )
    );
    expect(mockSetAuthUser).toHaveBeenCalledWith(null);
    expect(toast.success).toHaveBeenCalledWith("Logged out");
    expect(mockNavigate).toHaveBeenCalledWith("/signin");
  });

  test("handles logout error from fetch", async () => {
    renderSidebar();
    const user = userEvent.setup();
    auth.signOut.mockResolvedValueOnce(undefined); // Firebase success
    fetch.mockResolvedValueOnce({ ok: false, statusText: "Logout API Failed" }); // Fetch fails

    // Spy on console.error
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await user.click(screen.getByText("Log Out"));

    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    // Should still log out locally and navigate
    expect(mockSetAuthUser).toHaveBeenCalledWith(null);
    expect(toast.success).toHaveBeenCalledWith("Logged out");
    expect(mockNavigate).toHaveBeenCalledWith("/signin");
    // Check if the error was logged (optional, based on implementation)
    // expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
