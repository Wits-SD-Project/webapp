import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import StaffMaintenance from "../pages/dashboards/StaffMaintenance";

/* ───── Sidebar stub ───── */
jest.mock("../components/StaffSideBar.js", () => () => <aside>sidebar</aside>);

/* ───── toast spy ───── */
jest.mock("react-toastify", () => {
  const toast = { success: jest.fn(), error: jest.fn() };
  return { toast };
});
import { toast } from "react-toastify";

/* ───── firebase getAuthToken stub ───── */
jest.mock("../firebase", () => ({
  getAuthToken: () => Promise.resolve("FAKE_TOKEN"),
}));

describe("StaffMaintenance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders maintenance requests after successful GET", async () => {
    const mockReports = [
      {
        id: 1,
        facilityName: "Gym",
        reportedBy: "Alice",
        description: "Broken treadmill",
        reportedAt: "2025-05-05T10:00Z",
        status: "open",
      },
      {
        id: 2,
        facilityName: "Pool",
        reportedBy: "Bob",
        description: "Leaky faucet",
        reportedAt: "2025-05-06T15:30Z",
        status: "in progress",
      },
    ];

    global.fetch = jest
      .fn()
      // GET
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ reports: mockReports }),
      });

    render(<StaffMaintenance />);

    // Verify GET called with correct args
    expect(global.fetch).toHaveBeenCalledWith(
      `${process.env.REACT_APP_API_BASE_URL}/api/facilities/staff-maintenance-requests`,
      {
        method: "GET",
        headers: { Authorization: "Bearer FAKE_TOKEN" },
      }
    );

    // Wait for first row
    const gymRow = await screen
      .findByText("Gym")
      .then((el) => el.closest("tr"));
    expect(within(gymRow).getByText("Alice")).toBeInTheDocument();
    expect(within(gymRow).getByText("Broken treadmill")).toBeInTheDocument();
    // Date formatting -> "2025-05-05 10:00"
    expect(within(gymRow).getByText("2025-05-05 10:00")).toBeInTheDocument();
    // Status cell
    expect(within(gymRow).getByText("open")).toBeInTheDocument();
    // Buttons: open → show both
    expect(
      within(gymRow).getByRole("button", { name: "In Progress" })
    ).toBeInTheDocument();
    expect(
      within(gymRow).getByRole("button", { name: "Closed" })
    ).toBeInTheDocument();

    // Second row
    const poolRow = screen.getByText("Pool").closest("tr");
    expect(within(poolRow).getByText("Bob")).toBeInTheDocument();
    // Date -> "2025-05-06 15:30"
    expect(within(poolRow).getByText("2025-05-06 15:30")).toBeInTheDocument();
    // in progress → only Closed
    expect(
      within(poolRow).queryByRole("button", { name: "In Progress" })
    ).toBeNull();
    expect(
      within(poolRow).getByRole("button", { name: "Closed" })
    ).toBeInTheDocument();
  });

  it("updateRequestStatus success updates status + toast.success", async () => {
    const mockReports = [
      {
        id: "r1",
        facilityName: "Gym",
        reportedBy: "Alice",
        description: "Broken treadmill",
        reportedAt: "2025-05-05T10:00Z",
        status: "open",
      },
    ];

    global.fetch = jest
      .fn()
      // GET
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ reports: mockReports }),
      })
      // PUT
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: "updated" }),
      });

    render(<StaffMaintenance />);

    const row = await screen.findByText("Gym").then((el) => el.closest("tr"));
    fireEvent.click(within(row).getByRole("button", { name: "In Progress" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("updated"));
    // Status cell now shows "in progress"
    expect(within(row).getByText("in progress")).toBeInTheDocument();
  });

  it("updateRequestStatus failure shows toast.error and leaves status unchanged", async () => {
    const mockReports = [
      {
        id: "r2",
        facilityName: "Pool",
        reportedBy: "Bob",
        description: "Leaky faucet",
        reportedAt: "2025-05-06T15:30Z",
        status: "open",
      },
    ];

    global.fetch = jest
      .fn()
      // GET
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ reports: mockReports }),
      })
      // PUT fails
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: "fail" }),
      });

    render(<StaffMaintenance />);

    const row = await screen.findByText("Pool").then((el) => el.closest("tr"));
    fireEvent.click(within(row).getByRole("button", { name: "Closed" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("fail"));
    // Status remains "open"
    expect(within(row).getByText("open")).toBeInTheDocument();
  });

  it("GET failure triggers toast.error", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve("boom"),
    });

    render(<StaffMaintenance />);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to load reports: Failed to fetch reports"
      )
    );
  });
});
