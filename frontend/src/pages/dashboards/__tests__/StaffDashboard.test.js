// src/pages/dashboards/__tests__/StaffDashboard.test.js
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter, useNavigate } from "react-router-dom";
import StaffDashboard from "../StaffDashboard";
import { useAuth } from "../../context/AuthContext";

// Mock dependencies
jest.mock("../../components/SideBar", () => ({ activeItem }) => (
  <div>Mock Sidebar - Active: {activeItem}</div>
));
jest.mock("../../context/AuthContext");

// Mock navigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("StaffDashboard Component", () => {
  const mockAuthUser = { name: "Staff Member Test" };

  const renderComponent = () => {
    useAuth.mockReturnValue({ authUser: mockAuthUser }); // Provide mock user
    render(
      <MemoryRouter>
        <StaffDashboard />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders sidebar, header with username, and cards", () => {
    renderComponent();
    expect(
      screen.getByText("Mock Sidebar - Active: dashboard")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();
    expect(screen.getByText(mockAuthUser.name)).toBeInTheDocument(); // Check username display

    expect(
      screen.getByRole("heading", { name: /upcoming facility bookings/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /view all/i })
    ).toBeInTheDocument(); // First view all button
    expect(
      screen.getByRole("heading", { name: /pending applications/i })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /view all/i })[1]
    ).toBeInTheDocument(); // Second view all button
  });

  test('navigates when "View all" buttons are clicked', async () => {
    renderComponent();
    const user = userEvent.setup();
    const viewButtons = screen.getAllByRole("button", { name: /view all/i });

    await user.click(viewButtons[0]); // Click first 'View all' (Upcoming)
    expect(mockNavigate).toHaveBeenCalledWith("/staff-upcoming-bookings");

    await user.click(viewButtons[1]); // Click second 'View all' (Pending)
    expect(mockNavigate).toHaveBeenCalledWith("/staff-view-bookings");
  });
});
