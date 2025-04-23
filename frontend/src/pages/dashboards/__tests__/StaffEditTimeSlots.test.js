// frontend/src/pages/dashboards/__tests__/StaffEditTimeSlots.test.js
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import StaffEditTimeSlots from "../StaffEditTimeSlots"; // Adjust path
import { toast } from "react-toastify";
import { getAuthToken } from "../../../firebase"; // Use mocked getAuthToken

// Mock dependencies
jest.mock("../../../components/SideBar", () => () => <div>Mock Sidebar</div>);
jest.mock("../../../firebase"); // Mocks getAuthToken
jest.mock("react-toastify");

// Mock react-router-dom hooks used
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: "facility123" }), // Mock facility ID from URL
}));

// Mock global fetch
global.fetch = jest.fn();

describe("StaffEditTimeSlots Component", () => {
  const facilityId = "facility123";
  const mockToken = "mock-staff-token";

  const mockInitialSlotsData = {
    timeslots: [
      { day: "Monday", start: "09:00", end: "10:00" },
      { day: "Wednesday", start: "14:00", end: "15:00" },
      { day: "Wednesday", start: "16:00", end: "17:00" },
    ],
  };

  const renderComponent = () => {
    // Wrap in Routes to provide context for useParams
    render(
      <MemoryRouter initialEntries={[`/staff-edit-time-slots/${facilityId}`]}>
        <Routes>
          <Route
            path="/staff-edit-time-slots/:id"
            element={<StaffEditTimeSlots />}
          />
        </Routes>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    fetch.mockClear();
    toast.success.mockClear();
    toast.error.mockClear();
    getAuthToken.mockResolvedValue(mockToken); // Mock token retrieval
    // Mock initial fetch for timeslots
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockInitialSlotsData,
    });
  });

  test("renders sidebar, header, and fetches initial timeslots", async () => {
    renderComponent();
    expect(screen.getByText("Mock Sidebar")).toBeInTheDocument();
    // Facility name fetch is commented out in the component, so header might be just "Time Slots" initially
    expect(
      screen.getByRole("heading", { name: /time slots/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back to facilities/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();

    // Check initial fetch call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:8080/api/facilities/timeslots`,
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: `Bearer ${mockToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ facilityId: facilityId }),
        })
      );
    });

    // Check if initial slots are rendered
    await waitFor(() => {
      expect(screen.getByText("09:00 - 10:00")).toBeInTheDocument(); // Monday slot
      expect(screen.getByText("14:00 - 15:00")).toBeInTheDocument(); // Wednesday slot 1
      expect(screen.getByText("16:00 - 17:00")).toBeInTheDocument(); // Wednesday slot 2
    });
  });

  test("handles error during initial timeslot fetch", async () => {
    getAuthToken.mockResolvedValueOnce(mockToken);
    const errorMsg = "Failed to load timeslots";
    // Reset fetch mock for error scenario
    fetch.mockReset();
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: errorMsg }),
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
      expect(toast.error).toHaveBeenCalledWith(errorMsg);
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    consoleSpy.mockRestore();
  });

  test("opens and closes the time picker modal", async () => {
    renderComponent();
    const user = userEvent.setup();

    // Wait for initial load
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    // Find the 'Add' icon for Monday (assuming it's identifiable, maybe by row)
    const mondayRow = screen.getByRole("row", { name: /monday/i });
    const addButton = within(mondayRow).getByAltText(/add slot/i);

    // Modal should not be visible initially
    expect(
      screen.queryByRole("heading", { name: /add time slot for monday/i })
    ).not.toBeInTheDocument();

    // Click add button
    await user.click(addButton);

    // Modal should now be visible
    expect(
      await screen.findByRole("heading", { name: /add time slot for monday/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();

    // Click cancel button
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    // Modal should be closed
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /add time slot for monday/i })
      ).not.toBeInTheDocument();
    });
  });

  test("adds a new valid timeslot", async () => {
    renderComponent();
    const user = userEvent.setup();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1)); // Wait for initial load

    // --- Open modal for Tuesday ---
    const tuesdayRow = screen.getByRole("row", { name: /tuesday/i });
    const addTuesdayButton = within(tuesdayRow).getByAltText(/add slot/i);
    await user.click(addTuesdayButton);
    const modalTitle = await screen.findByRole("heading", {
      name: /add time slot for tuesday/i,
    });
    expect(modalTitle).toBeInTheDocument();

    // --- Enter times ---
    // Using fireEvent for time inputs as userEvent can be tricky with them
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "10:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "11:00" },
    });

    // Mock the backend update call (fetch no. 2)
    const updateResponse = { success: true };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updateResponse,
    });

    // --- Click Save ---
    const saveButton = screen.getByRole("button", { name: /save slot/i });
    await user.click(saveButton);

    // Check backend update call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2); // Initial load + update
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:8080/api/facilities/${facilityId}/timeslots`,
        expect.objectContaining({
          method: "PUT",
          headers: {
            Authorization: `Bearer ${mockToken}`,
            "Content-Type": "application/json",
          },
          // Verify the body contains the new structure including the added slot
          body: expect.stringContaining('"Tuesday":["10:00 - 11:00"]'),
        })
      );
    });

    // Check toast message
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Timeslots updated successfully"
      );
    });

    // Check if new slot is rendered in the table for Tuesday
    await waitFor(() => {
      expect(within(tuesdayRow).getByText("10:00 - 11:00")).toBeInTheDocument();
    });

    // Check if modal is closed
    expect(
      screen.queryByRole("heading", { name: /add time slot for tuesday/i })
    ).not.toBeInTheDocument();
  });

  test("shows error if start time is after end time", async () => {
    renderComponent();
    const user = userEvent.setup();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    const mondayRow = screen.getByRole("row", { name: /monday/i });
    const addButton = within(mondayRow).getByAltText(/add slot/i);
    await user.click(addButton);
    await screen.findByRole("heading", { name: /add time slot for monday/i });

    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "11:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "10:00" },
    }); // End before start

    const saveButton = screen.getByRole("button", { name: /save slot/i });
    await user.click(saveButton);

    expect(toast.error).toHaveBeenCalledWith(
      "End time must be after start time"
    );
    expect(fetch).toHaveBeenCalledTimes(1); // Only initial fetch, no update call
    // Modal should remain open
    expect(
      screen.getByRole("heading", { name: /add time slot for monday/i })
    ).toBeInTheDocument();
  });

  test("shows error if slot overlaps with existing slot", async () => {
    renderComponent();
    const user = userEvent.setup();
    // Wait for initial load which includes '09:00 - 10:00' for Monday
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByText("09:00 - 10:00")).toBeInTheDocument()
    );

    const mondayRow = screen.getByRole("row", { name: /monday/i });
    const addButton = within(mondayRow).getByAltText(/add slot/i);
    await user.click(addButton);
    await screen.findByRole("heading", { name: /add time slot for monday/i });

    // Attempt to add an overlapping slot (09:30 - 10:30)
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "09:30" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "10:30" },
    });

    const saveButton = screen.getByRole("button", { name: /save slot/i });
    await user.click(saveButton);

    expect(toast.error).toHaveBeenCalledWith(
      "Overlaps with existing slot: 09:00 - 10:00"
    );
    expect(fetch).toHaveBeenCalledTimes(1); // Only initial fetch
    expect(
      screen.getByRole("heading", { name: /add time slot for monday/i })
    ).toBeInTheDocument(); // Modal still open
  });

  test("shows error if slot is a duplicate", async () => {
    renderComponent();
    const user = userEvent.setup();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1)); // Wait for initial load
    await waitFor(() =>
      expect(screen.getByText("09:00 - 10:00")).toBeInTheDocument()
    );

    const mondayRow = screen.getByRole("row", { name: /monday/i });
    const addButton = within(mondayRow).getByAltText(/add slot/i);
    await user.click(addButton);
    await screen.findByRole("heading", { name: /add time slot for monday/i });

    // Attempt to add the exact same slot
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "10:00" },
    });

    const saveButton = screen.getByRole("button", { name: /save slot/i });
    await user.click(saveButton);

    expect(toast.error).toHaveBeenCalledWith("This slot already exists");
    expect(fetch).toHaveBeenCalledTimes(1); // Only initial fetch
    expect(
      screen.getByRole("heading", { name: /add time slot for monday/i })
    ).toBeInTheDocument(); // Modal still open
  });

  test("deletes an existing timeslot", async () => {
    renderComponent();
    const user = userEvent.setup();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1)); // Wait for initial load

    // Find the Monday slot and its delete button
    const mondaySlotPill = await screen.findByText("09:00 - 10:00");
    expect(mondaySlotPill).toBeInTheDocument();
    const deleteButton = within(mondaySlotPill.closest("span")).getByAltText(
      /delete/i
    ); // Find delete icon within the slot pill

    // Mock the DELETE request
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Timeslot deleted successfully" }),
    });

    // Click delete
    await user.click(deleteButton);

    // Check backend DELETE call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2); // Initial load + delete
      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:8080/api/facilities/${facilityId}/timeslots`,
        expect.objectContaining({
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${mockToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ day: "Monday", start: "09:00", end: "10:00" }),
        })
      );
    });

    // Check toast message
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Timeslot deleted successfully"
      );
    });

    // Check that the slot is removed from the UI
    await waitFor(() => {
      expect(screen.queryByText("09:00 - 10:00")).not.toBeInTheDocument();
    });
  });

  test("handles error during timeslot delete", async () => {
    renderComponent();
    const user = userEvent.setup();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1)); // Wait for initial load

    const mondaySlotPill = await screen.findByText("09:00 - 10:00");
    const deleteButton = within(mondaySlotPill.closest("span")).getByAltText(
      /delete/i
    );

    // Mock failed DELETE request
    const errorMsg = "Failed to delete slot from API";
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: errorMsg }),
    });

    // Spy on console.error
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await user.click(deleteButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMsg);
    });

    // Slot should still be in the UI
    expect(screen.getByText("09:00 - 10:00")).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith("Delete error:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  // Add tests for other validation cases (e.g., empty start/end time)
  // Add tests for handling backend update errors
});
