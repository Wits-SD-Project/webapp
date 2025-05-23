// StaffManageFacilities.test.js

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { BrowserRouter } from "react-router-dom";
import { toast } from "react-toastify";
import ManageFacilities from "../../pages/dashboards/StaffManageFacilities";
import { getAuthToken } from "../../firebase";

// Mock dependencies
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

jest.mock("../../firebase", () => ({
  getAuthToken: jest.fn(),
}));

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock components
jest.mock("../../components/StaffSideBar.js", () => {
  return function DummySidebar({ activeItem }) {
    return <div data-testid="sidebar" data-active={activeItem}></div>;
  };
});

jest.mock("../../components/FalicityFormModal", () => {
  return function DummyFacilityModal({ open, onClose, onSubmit }) {
    return open ? (
      <div data-testid="facility-modal">
        <button
          onClick={() =>
            onSubmit({
              name: "Test Facility",
              type: "Tennis",
              isOutdoors: "Yes",
              availability: "Available",
            })
          }
        >
          Submit
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null;
  };
});

jest.mock("../../components/FeatureFormModal.js", () => {
  return function DummyFeatureModal({
    open,
    onClose,
    onSubmit,
    isEditMode,
    facilityType,
  }) {
    return open ? (
      <div
        data-testid="feature-modal"
        data-edit-mode={isEditMode}
        data-facility-type={facilityType}
      >
        <button
          onClick={() =>
            onSubmit({
              description: "Test description",
              features: ["Feature 1", "Feature 2"],
            })
          }
        >
          Submit
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null;
  };
});

// Mock assets
jest.mock("../../assets/clock.png", () => "clock-icon-mock");
jest.mock("../../assets/edit.png", () => "edit-icon-mock");
jest.mock("../../assets/bin.png", () => "bin-icon-mock");

// Mock fetch
global.fetch = jest.fn();
global.window.confirm = jest.fn();

describe("StaffManageFacilities Component", () => {
  const mockFacilities = [
    {
      id: "1",
      name: "Tennis Court",
      type: "Tennis",
      isOutdoors: "Yes",
      availability: "Available",
      description: "Tennis court description",
      features: ["Net", "Lights"],
    },
    {
      id: "2",
      name: "Swimming Pool",
      type: "Pool",
      isOutdoors: "No",
      availability: "Closed",
      description: "Swimming pool description",
      features: ["Heated", "Olympic size"],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    getAuthToken.mockResolvedValue("mock-token");
    global.fetch.mockReset();
  });

  test("renders loading state initially", async () => {
    // Mock fetch to delay response
    global.fetch.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <BrowserRouter>
        <ManageFacilities />
      </BrowserRouter>
    );

    expect(screen.getByText("Loading facilities...")).toBeInTheDocument();
  });

  test("fetches and displays facilities on load", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Tennis Court")).toBeInTheDocument();
      expect(screen.getByText("Swimming Pool")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${process.env.REACT_APP_API_BASE_URL}/api/facilities/staff-facilities`,
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer mock-token",
        },
      })
    );
  });

  test("handles fetch error", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network error"));

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load facilities")
      );
    });
  });

  test("opens facility modal when add button is clicked", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText("Add New Facility"));
      expect(screen.getByTestId("facility-modal")).toBeInTheDocument();
    });
  });

  test("submits facility form and opens feature modal", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText("Add New Facility"));
    });

    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(screen.getByTestId("feature-modal")).toBeInTheDocument();
    });
  });

  test("completes facility creation with features", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    // Mock the facility creation API call
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        facility: {
          id: "3",
          name: "Test Facility",
          type: "Tennis",
          isOutdoors: "Yes",
          availability: "Available",
          description: "Test description",
          features: ["Feature 1", "Feature 2"],
        },
      }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    // Open facility modal
    await waitFor(() => {
      fireEvent.click(screen.getByText("Add New Facility"));
    });

    // Submit facility form
    fireEvent.click(screen.getByText("Submit"));

    // Submit feature form
    await waitFor(() => {
      expect(screen.getByTestId("feature-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_API_BASE_URL}/api/facilities/upload`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer mock-token",
          }),
        })
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Facility created successfully"
      );
    });
  });

  test("handles facility creation error", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    // Mock facility creation error
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Creation failed" }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    // Open facility modal
    await waitFor(() => {
      fireEvent.click(screen.getByText("Add New Facility"));
    });

    // Submit facility form
    fireEvent.click(screen.getByText("Submit"));

    // Submit feature form
    await waitFor(() => {
      expect(screen.getByTestId("feature-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Creation failed");
    });
  });

  test("toggles edit mode for a facility", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    // Find the edit button for the first facility
    const editButtons = await screen.findAllByAltText("edit");
    fireEvent.click(editButtons[0]);

    // Should show input fields instead of text
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("Tennis Court");
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  test("updates facility data", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    // Mock update API call
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        facility: {
          ...mockFacilities[0],
          name: "Updated Tennis Court",
        },
      }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    // Enter edit mode
    const editButtons = await screen.findAllByAltText("edit");
    fireEvent.click(editButtons[0]);

    // Change the name
    const nameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(nameInput, { target: { value: "Updated Tennis Court" } });

    // Save changes
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_API_BASE_URL}/api/facilities/updateFacility/1`,
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("Updated Tennis Court"),
        })
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Facility updated successfully"
      );
    });
  });

  test("cancels editing a facility", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    // Enter edit mode
    const editButtons = await screen.findAllByAltText("edit");
    fireEvent.click(editButtons[0]);

    // Change the name
    const nameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(nameInput, { target: { value: "Changed name" } });

    // Cancel editing
    fireEvent.click(screen.getByText("Cancel"));

    // Should show original name
    expect(screen.getByText("Tennis Court")).toBeInTheDocument();
    expect(screen.queryByText("Changed name")).not.toBeInTheDocument();
  });

  test("deletes a facility after confirmation", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    // Mock delete API call
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Facility deleted" }),
    });

    // Mock confirmation dialog
    window.confirm.mockReturnValueOnce(true);

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    // Click delete button
    const deleteButtons = await screen.findAllByAltText("delete");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        "Are you sure you want to delete this facility?"
      );
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_API_BASE_URL}/api/facilities/1`,
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            Authorization: "Bearer mock-token",
          }),
        })
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Facility deleted successfully"
      );
    });
  });

  test("cancels facility deletion when confirmation is rejected", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    // Mock confirmation dialog to return false
    window.confirm.mockReturnValueOnce(false);

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    // Click delete button
    const deleteButtons = await screen.findAllByAltText("delete");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      // Delete API should not be called
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only the initial facilities fetch
    });
  });

  test("handles delete error", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    // Mock delete API call with error
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Delete failed" }),
    });

    // Mock confirmation dialog
    window.confirm.mockReturnValueOnce(true);

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    // Click delete button
    const deleteButtons = await screen.findAllByAltText("delete");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Delete failed");
    });
  });

  test("opens edit features modal", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    // Click edit features button
    const editFeaturesButtons = await screen.findAllByText("Edit Features");
    fireEvent.click(editFeaturesButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId("feature-modal")).toBeInTheDocument();
      expect(screen.getByTestId("feature-modal")).toHaveAttribute(
        "data-edit-mode",
        "true"
      );
      expect(screen.getByTestId("feature-modal")).toHaveAttribute(
        "data-facility-type",
        "Tennis"
      );
    });
  });

  test("updates facility features", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    // Mock update features API call
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        facility: {
          ...mockFacilities[0],
          description: "Updated description",
          features: ["Updated feature 1", "Updated feature 2"],
        },
      }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    // Click edit features button
    const editFeaturesButtons = await screen.findAllByText("Edit Features");
    fireEvent.click(editFeaturesButtons[0]);

    // Submit updated features
    await waitFor(() => {
      expect(screen.getByTestId("feature-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_API_BASE_URL}/api/facilities/updateFacility/1`,
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("Test description"),
        })
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Facility features updated successfully"
      );
    });
  });

  test("handles update features error", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    // Mock update features API call with error
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Update failed" }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    // Click edit features button
    const editFeaturesButtons = await screen.findAllByText("Edit Features");
    fireEvent.click(editFeaturesButtons[0]);

    // Submit updated features
    await waitFor(() => {
      expect(screen.getByTestId("feature-modal")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update failed");
    });
  });

  test("renders different availability status classes", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      const availableStatus = screen.getByText("Available");
      const closedStatus = screen.getByText("Closed");

      expect(availableStatus.className).toContain("status available");
      expect(closedStatus.className).toContain("status closed");
    });
  });

  test("navigates to time slot editing when clock icon is clicked", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    const navigateMock = jest.fn();
    jest
      .spyOn(require("react-router-dom"), "useNavigate")
      .mockReturnValue(navigateMock);

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    // Click clock icon
    const clockIcons = await screen.findAllByAltText("timeslots");
    fireEvent.click(clockIcons[0]);

    expect(navigateMock).toHaveBeenCalledWith(
      "/staff-edit-time-slots/1",
      expect.objectContaining({
        state: { facilityName: "Tennis Court" },
      })
    );
  });

  test("handles field changes in edit mode", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ facilities: mockFacilities }),
    });

    await act(async () => {
      render(
        <BrowserRouter>
          <ManageFacilities />
        </BrowserRouter>
      );
    });

    // Enter edit mode
    const editButtons = await screen.findAllByAltText("edit");
    fireEvent.click(editButtons[0]);

    // Change the name
    const nameInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(nameInput, { target: { value: "New Name" } });

    // Change the type
    const typeInput = screen.getAllByRole("textbox")[1];
    fireEvent.change(typeInput, { target: { value: "New Type" } });

    // Change the isOutdoors select
    const outdoorSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(outdoorSelect, { target: { value: "No" } });

    // Change the availability select
    const availabilitySelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(availabilitySelect, { target: { value: "Closed" } });

    // Verify changes
    expect(nameInput).toHaveValue("New Name");
    expect(typeInput).toHaveValue("New Type");
    expect(outdoorSelect).toHaveValue("No");
    expect(availabilitySelect).toHaveValue("Closed");
  });
});
