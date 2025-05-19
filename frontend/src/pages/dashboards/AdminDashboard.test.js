import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminDashboard from "../../pages/dashboards/AdminDashboard";
import { auth } from "../../firebase";

jest.mock("../../context/AuthContext");
jest.mock("../../firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn(),
    },
  },
}));

// Mock Chart.js components to avoid DOM-related errors
jest.mock("react-chartjs-2", () => ({
  Bar: () => <div data-testid="mock-bar-chart" />,
  Doughnut: () => <div data-testid="mock-doughnut-chart" />,
}));

// Mock useNavigate at the top level
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

global.fetch = jest.fn();

describe("AdminDashboard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the dashboard with default data", () => {
    useAuth.mockReturnValue({ authUser: { name: "Test Admin" } });

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    expect(
      screen.getByRole("heading", { name: /dashboard/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Test Admin")).toBeInTheDocument();
  });

  it("handles navigation to manage events", () => {
    useAuth.mockReturnValue({ authUser: { name: "Test Admin" } });

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    const manageEventsButton = screen.getAllByText("View all")[0]; // First "View all" button
    fireEvent.click(manageEventsButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin-manage-events");
  });

  it("handles navigation to manage users", () => {
    useAuth.mockReturnValue({ authUser: { name: "Test Admin" } });

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    const manageUsersButton = screen.getAllByText("View all")[1]; // Second "View all" button
    fireEvent.click(manageUsersButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin-manage-users");
  });

  it("fetches maintenance summary and updates state", async () => {
    useAuth.mockReturnValue({ authUser: { name: "Test Admin" } });
    auth.currentUser.getIdToken.mockResolvedValue("mockToken");
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        openCount: 5,
        closedCount: 10,
      }),
    });

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Open Issues: 5")).toBeInTheDocument();
      expect(screen.getByText("Closed Issues: 10")).toBeInTheDocument();
    });
  });

  it("handles API error gracefully in maintenance summary", async () => {
    useAuth.mockReturnValue({ authUser: { name: "Test Admin" } });
    auth.currentUser.getIdToken.mockResolvedValue("mockToken");
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Error fetching summary" }),
    });

    // Mock console.error
    const consoleErrorMock = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(consoleErrorMock).toHaveBeenCalledWith(
        "Maintenance summary error:",
        "Error fetching summary"
      );
    });

    consoleErrorMock.mockRestore();
  });

  it("exports maintenance report as PDF", async () => {
    useAuth.mockReturnValue({ authUser: { name: "Test Admin" } });
    auth.currentUser.getIdToken.mockResolvedValue("mockToken");
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reports: [
          {
            facilityName: "Facility 1",
            description: "Broken pipe",
            status: "Open",
            createdAt: { _seconds: 1620000000 },
          },
        ],
      }),
    });

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    const exportButton = screen.getByText("Export as PDF");
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/admin/maintenance-reports",
        expect.any(Object)
      );
    });
  });

  it("handles missing user gracefully in PDF export", async () => {
    useAuth.mockReturnValue({ authUser: null });

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    const exportButton = screen.getByText("Export as PDF");
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  it("renders charts without errors", () => {
    useAuth.mockReturnValue({ authUser: { name: "Test Admin" } });

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    expect(screen.getByTestId("mock-bar-chart")).toBeInTheDocument();
    expect(screen.getByTestId("mock-doughnut-chart")).toBeInTheDocument();
  });
});
