// frontend/src/pages/dashboards/__tests__/AdminDashboard.test.js
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import AdminDashboard from "../AdminDashboard"; // Adjust path
import { toast } from "react-toastify";

// Mock Navbar as it's rendered inside
jest.mock("../../components/Navbar", () => () => <nav>Mock Navbar</nav>);
jest.mock("react-toastify");

// Mock global fetch
global.fetch = jest.fn();

describe("AdminDashboard Component", () => {
  const mockUsers = [
    {
      email: "pending@test.com",
      role: "Resident",
      approved: false,
      accepted: false,
    },
    {
      email: "approved@test.com",
      role: "Staff",
      approved: true,
      accepted: false,
    },
    {
      email: "accepted@test.com",
      role: "Resident",
      approved: true,
      accepted: true,
    },
    {
      email: "staffpending@test.com",
      role: "Staff",
      approved: false,
      accepted: false,
    },
  ];

  const renderComponent = () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    fetch.mockClear();
    toast.success.mockClear();
    toast.error.mockClear();
  });

  test("renders dashboard title and table headers", async () => {
    fetch.mockResolvedValueOnce({
      // Mock fetch for initial user load
      ok: true,
      text: async () => JSON.stringify([]), // Start with no users
      json: async () => [],
    });
    renderComponent();
    expect(
      screen.getByRole("heading", { name: /admin dashboard/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /email/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /role/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /approved\?/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /access granted\?/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /actions/i })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/users")
      );
    });
  });

  test("fetches and displays users correctly", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockUsers),
      json: async () => mockUsers, // Return mock users
    });

    renderComponent();

    // Wait for users to be loaded and displayed
    await waitFor(() => {
      expect(screen.getByText("pending@test.com")).toBeInTheDocument();
      expect(screen.getByText("approved@test.com")).toBeInTheDocument();
      expect(screen.getByText("accepted@test.com")).toBeInTheDocument();
    });

    // Check details for one user row
    const pendingUserRow = screen.getByRole("row", {
      name: /pending@test.com/i,
    });
    expect(within(pendingUserRow).getByText("Resident")).toBeInTheDocument(); // Role
    expect(within(pendingUserRow).getAllByText("No")[0]).toBeInTheDocument(); // Approved? No
    expect(within(pendingUserRow).getAllByText("No")[1]).toBeInTheDocument(); // Accepted? No
    expect(
      within(pendingUserRow).getByRole("button", { name: /approve/i })
    ).toBeInTheDocument();
    expect(
      within(pendingUserRow).getByRole("button", { name: /grant access/i })
    ).toBeDisabled(); // Grant should be disabled if not approved

    const acceptedUserRow = screen.getByRole("row", {
      name: /accepted@test.com/i,
    });
    expect(within(acceptedUserRow).getByText("Resident")).toBeInTheDocument(); // Role
    expect(within(acceptedUserRow).getAllByText("Yes")[0]).toBeInTheDocument(); // Approved? Yes
    expect(within(acceptedUserRow).getAllByText("Yes")[1]).toBeInTheDocument(); // Accepted? Yes
    expect(
      within(acceptedUserRow).getByRole("button", { name: /revoke$/i })
    ).toBeInTheDocument(); // Revoke Approval
    expect(
      within(acceptedUserRow).getByRole("button", { name: /revoke access/i })
    ).toBeEnabled(); // Revoke Access enabled
  });

  test("handles error during user fetch", async () => {
    const errorMsg = "Failed to fetch users from API";
    fetch.mockResolvedValueOnce({
      ok: false,
      statusText: errorMsg,
      text: async () => errorMsg, // Simulate error response
    });

    // Spy on console.error
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    renderComponent();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load users:")
      );
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining(errorMsg)
      );
    });

    expect(screen.getByText(/no users found/i)).toBeInTheDocument(); // Should show no users message
    expect(consoleSpy).toHaveBeenCalledWith(
      "fetchUsers error:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  test('clicking "Approve" button calls API and updates UI on success', async () => {
    // Initial fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([mockUsers[0]]), // Only the pending user
      json: async () => [mockUsers[0]],
    });
    // Mock response for the toggle API call
    const toggleResponse = {
      approved: true,
      message: "User approved successfully",
    };
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(toggleResponse),
      json: async () => toggleResponse,
    });

    renderComponent();
    const user = userEvent.setup();

    // Wait for the initial user to render
    const approveButton = await screen.findByRole("button", {
      name: /approve/i,
    });
    expect(approveButton).toBeInTheDocument();

    // Check initial state in the row
    const userRow = screen.getByRole("row", { name: /pending@test.com/i });
    expect(within(userRow).getAllByText("No")[0]).toBeInTheDocument(); // Approved? No
    expect(
      within(userRow).getByRole("button", { name: /grant access/i })
    ).toBeDisabled();

    // Click Approve
    await user.click(approveButton);

    // Check fetch call for toggle
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2); // Initial load + toggle
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/toggle-approval"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "pending@test.com" }),
        })
      );
    });

    // Check UI update
    await waitFor(() => {
      // Button text changes to Revoke
      expect(
        screen.getByRole("button", { name: /revoke$/i })
      ).toBeInTheDocument();
      // Approved status text changes
      expect(within(userRow).getByText("Yes")).toBeInTheDocument();
      // Grant access button becomes enabled
      expect(
        within(userRow).getByRole("button", { name: /grant access/i })
      ).toBeEnabled();
    });

    // Check toast message
    expect(toast.success).toHaveBeenCalledWith("User approved successfully");
  });

  test('clicking "Grant Access" button calls API and updates UI on success', async () => {
    // Initial fetch (user is approved but not accepted)
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([mockUsers[1]]),
      json: async () => [mockUsers[1]],
    });
    // Mock response for the toggle API call
    const toggleResponse = { accepted: true, message: "User access granted" };
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(toggleResponse),
      json: async () => toggleResponse,
    });

    renderComponent();
    const user = userEvent.setup();

    // Wait for the initial user to render
    const grantButton = await screen.findByRole("button", {
      name: /grant access/i,
    });
    expect(grantButton).toBeEnabled(); // Should be enabled as user is approved

    // Check initial state in the row
    const userRow = screen.getByRole("row", { name: /approved@test.com/i });
    expect(within(userRow).getAllByText("Yes")[0]).toBeInTheDocument(); // Approved? Yes
    expect(within(userRow).getAllByText("No")[0]).toBeInTheDocument(); // Accepted? No

    // Click Grant Access
    await user.click(grantButton);

    // Check fetch call for toggle
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2); // Initial load + toggle
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/toggle-accepted"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "approved@test.com" }),
        })
      );
    });

    // Check UI update
    await waitFor(() => {
      // Button text changes to Revoke Access
      expect(
        screen.getByRole("button", { name: /revoke access/i })
      ).toBeInTheDocument();
      // Accepted status text changes (need to find the second 'Yes')
      expect(within(userRow).getAllByText("Yes")[1]).toBeInTheDocument(); // Accepted? Yes
    });

    // Check toast message
    expect(toast.success).toHaveBeenCalledWith("User access granted");
  });

  test("handles API error when toggling approval", async () => {
    // Initial fetch
    fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([mockUsers[0]]), // Pending user
      json: async () => [mockUsers[0]],
    });
    // Mock failed response for the toggle API call
    const errorMsg = "Failed to toggle approval";
    fetch.mockResolvedValueOnce({
      ok: false,
      statusText: errorMsg,
      text: async () => JSON.stringify({ message: errorMsg }),
      json: async () => ({ message: errorMsg }),
    });

    renderComponent();
    const user = userEvent.setup();
    const approveButton = await screen.findByRole("button", {
      name: /approve/i,
    });

    // Spy on console.error
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await user.click(approveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    // Check error toast
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMsg);
    });

    // UI should NOT have updated
    expect(
      screen.getByRole("button", { name: /approve/i })
    ).toBeInTheDocument(); // Still Approve
    const userRow = screen.getByRole("row", { name: /pending@test.com/i });
    expect(within(userRow).getAllByText("No")[0]).toBeInTheDocument(); // Still Approved? No

    expect(consoleSpy).toHaveBeenCalledWith(
      "toggle-approval error:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  // Add similar tests for Revoke and Revoke Access buttons, and API errors for toggle-accepted
});
