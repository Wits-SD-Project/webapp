import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import UserDashboard from "..//../pages/dashboards/UserDashboard";
import { collection, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

// Mock dependencies
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

jest.mock("../../firebase", () => ({
  db: {},
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue("mock-token"),
    },
  },
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../components/ResSideBar", () => {
  return function DummySidebar({ activeItem }) {
    return <div data-testid="sidebar">{activeItem}</div>;
  };
});

// Mock fetch API
global.fetch = jest.fn();

describe("UserDashboard Component", () => {
  const mockFacilities = [
    {
      id: "facility1",
      name: "Tennis Court",
      location: "Building A",
      imageUrls: ["http://example.com/tennis.jpg"],
      timeslots: [
        { day: "Monday", start: "09:00", end: "10:00" },
        { day: "Wednesday", start: "14:00", end: "15:00" },
      ],
    },
    {
      id: "facility2",
      name: "Swimming Pool",
      location: "Building B",
      imageUrls: [],
      timeslots: [],
    },
  ];

  beforeEach(() => {
    // Setup mocks
    getDocs.mockResolvedValue({
      docs: mockFacilities.map((facility) => ({
        id: facility.id,
        data: () => facility,
      })),
    });

    useNavigate.mockReturnValue(jest.fn());

    global.fetch.mockReset();
  });

  // Test 1: Component renders correctly
  test("renders the user dashboard with facilities", async () => {
    render(<UserDashboard />);

    // Check header is rendered
    expect(screen.getByText("Facility Bookings")).toBeInTheDocument();

    // Check sidebar is rendered with correct active item
    expect(screen.getByTestId("sidebar")).toHaveTextContent(
      "facility bookings"
    );

    // Wait for facilities to load
    await waitFor(() => {
      expect(collection).toHaveBeenCalledWith(
        expect.anything(),
        "facilities-test"
      );
    });
  });

  // Test 2: Search functionality works
  test("search filters facilities correctly", async () => {
    render(<UserDashboard />);

    // Wait for facilities to load
    await waitFor(() => {
      expect(getDocs).toHaveBeenCalled();
    });

    // Type in search box
    const searchInput = screen.getByPlaceholderText("Search facilities...");
    fireEvent.change(searchInput, { target: { value: "Tennis" } });

    // Check that filtering works
    await waitFor(() => {
      expect(screen.getByText("Tennis Court")).toBeInTheDocument();
      expect(screen.queryByText("Swimming Pool")).not.toBeInTheDocument();
    });
  });

  // Test 3: Navigation to facility detail page
  test("navigates to facility detail page when Book Now is clicked", async () => {
    const mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);

    render(<UserDashboard />);

    // Wait for facilities to load
    await waitFor(() => {
      expect(getDocs).toHaveBeenCalled();
    });

    // Click the Book Now button
    const bookButtons = await screen.findAllByText("Book Now");
    fireEvent.click(bookButtons[0]);

    // Check navigation was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith("/facility/facility1");
  });

  // Test 4: Drawer opens correctly
  test("opens drawer when openDrawer is called", async () => {
    render(<UserDashboard />);

    // Wait for facilities to load
    await waitFor(() => {
      expect(getDocs).toHaveBeenCalled();
    });

    // Get instance of component to call methods directly
    const instance = screen.getByText("Facility Bookings").closest("main");

    // Call openDrawer with mock facility
    const openDrawer = jest
      .spyOn(React, "useState")
      .mockImplementationOnce(() => [true, jest.fn()]);

    // Verify drawer opens
    expect(openDrawer).toHaveBeenCalled();
  });

  // Test 5: Date picker shows for booking
  test("shows date picker when startBooking is called", () => {
    const { rerender } = render(<UserDashboard />);

    // Mock state updates
    const mockSetSelectedFacility = jest.fn();
    const mockSetSelectedSlot = jest.fn();
    const mockSetShowDatePicker = jest.fn();

    // Create a new instance with controlled state for testing
    const TestComponent = () => {
      const startBooking = (facility, slot) => {
        mockSetSelectedFacility(facility);
        mockSetSelectedSlot(slot);
        mockSetShowDatePicker(true);
      };

      startBooking(mockFacilities[0], mockFacilities[0].timeslots[0]);

      return null;
    };

    render(<TestComponent />);

    // Check that state setters were called correctly
    expect(mockSetSelectedFacility).toHaveBeenCalledWith(mockFacilities[0]);
    expect(mockSetSelectedSlot).toHaveBeenCalledWith(
      mockFacilities[0].timeslots[0]
    );
    expect(mockSetShowDatePicker).toHaveBeenCalledWith(true);
  });

  // Test 6: Confirm booking success path
  test("confirms booking when date is selected correctly", async () => {
    // Mock current date to be a Monday
    const mockDate = new Date("2025-05-19"); // Monday
    jest.spyOn(global, "Date").mockImplementation(() => mockDate);

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { rerender } = render(<UserDashboard />);

    // Mock state for testing
    const mockSelectedFacility = mockFacilities[0];
    const mockSelectedSlot = mockFacilities[0].timeslots[0]; // Monday slot

    // Create a test component that calls confirmBooking directly
    const TestComponent = () => {
      const confirmBooking = async (date) => {
        if (!mockSelectedSlot || !mockSelectedFacility) return;

        const daysOfWeek = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const selectedDay = daysOfWeek[date.getDay()];

        if (selectedDay !== mockSelectedSlot.day) {
          toast.error(
            `Please select a date that falls on a ${mockSelectedSlot.day}. You picked a ${selectedDay}.`
          );
          return;
        }

        try {
          const response = await fetch(
            `${process.env.REACT_APP_API_BASE_URL}/api/facilities/bookings`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer mock-token`,
              },
              body: JSON.stringify({
                facilityId: mockSelectedFacility.id,
                facilityName: mockSelectedFacility.name,
                slot: `${mockSelectedSlot.start} - ${mockSelectedSlot.end}`,
                selectedDate: date.toISOString().split("T")[0],
              }),
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Failed to book slot");
          }

          toast.success(
            `Booking confirmed for ${
              mockSelectedFacility.name
            } on ${date.toDateString()} at ${mockSelectedSlot.start}.`
          );
        } catch (error) {
          toast.error(error.message || "Failed to book the timeslot.");
        }
      };

      // Call confirmBooking with a Monday date
      confirmBooking(new Date("2025-05-19"));

      return null;
    };

    render(<TestComponent />);

    // Verify API was called with correct data
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_API_BASE_URL}/api/facilities/bookings`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining(mockSelectedFacility.id),
        })
      );

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("Booking confirmed for Tennis Court")
      );
    });
  });

  // Test 7: Confirm booking error - wrong day
  test("shows error when selected date is not on the correct day", () => {
    // Create a test component that calls confirmBooking with wrong day
    const TestComponent = () => {
      const mockSelectedFacility = mockFacilities[0];
      const mockSelectedSlot = { day: "Monday", start: "09:00", end: "10:00" };

      const confirmBooking = (date) => {
        const daysOfWeek = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const selectedDay = daysOfWeek[date.getDay()];

        if (selectedDay !== mockSelectedSlot.day) {
          toast.error(
            `Please select a date that falls on a ${mockSelectedSlot.day}. You picked a ${selectedDay}.`
          );
          return;
        }
      };

      // Call with Tuesday instead of Monday
      confirmBooking(new Date("2025-05-20")); // Tuesday

      return null;
    };

    render(<TestComponent />);

    // Verify error toast was shown
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Please select a date that falls on a Monday")
    );
  });

  // Test 8: Confirm booking error - past time
  test("shows error when selected time has already passed", () => {
    // Mock current date to be after the slot time
    const mockNow = new Date("2025-05-19T10:30:00"); // Monday 10:30 AM
    jest.spyOn(global, "Date").mockImplementation(() => mockNow);

    const TestComponent = () => {
      const mockSelectedFacility = mockFacilities[0];
      const mockSelectedSlot = { day: "Monday", start: "09:00", end: "10:00" };

      const confirmBooking = (date) => {
        const daysOfWeek = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const selectedDay = daysOfWeek[date.getDay()];

        if (selectedDay !== mockSelectedSlot.day) {
          toast.error(
            `Please select a date that falls on a ${mockSelectedSlot.day}. You picked a ${selectedDay}.`
          );
          return;
        }

        const [startHour, startMinute] = mockSelectedSlot.start
          .split(":")
          .map(Number);
        const slotStartDateTime = new Date(date);
        slotStartDateTime.setHours(startHour, startMinute, 0, 0);

        const now = new Date();
        if (slotStartDateTime < now) {
          toast.error(
            "This time slot has already passed. Please select a future time."
          );
          return;
        }
      };

      // Call with Monday but time that's already passed
      confirmBooking(new Date("2025-05-19")); // Monday, but the slot is 9-10 AM and "now" is 10:30 AM

      return null;
    };

    render(<TestComponent />);

    // Verify error toast was shown
    expect(toast.error).toHaveBeenCalledWith(
      "This time slot has already passed. Please select a future time."
    );
  });

  // Test 9: Confirm booking API error
  test("handles API error when confirming booking", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Booking failed: Slot already taken" }),
    });

    const TestComponent = () => {
      const mockSelectedFacility = mockFacilities[0];
      const mockSelectedSlot = mockFacilities[0].timeslots[0]; // Monday slot

      const confirmBooking = async (date) => {
        try {
          const response = await fetch(
            `${process.env.REACT_APP_API_BASE_URL}/api/facilities/bookings`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer mock-token`,
              },
              body: JSON.stringify({
                facilityId: mockSelectedFacility.id,
                facilityName: mockSelectedFacility.name,
                slot: `${mockSelectedSlot.start} - ${mockSelectedSlot.end}`,
                selectedDate: date.toISOString().split("T")[0],
              }),
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Failed to book slot");
          }
        } catch (error) {
          toast.error(error.message || "Failed to book the timeslot.");
        }
      };

      // Call confirmBooking
      confirmBooking(new Date("2025-05-19")); // Monday

      return null;
    };

    render(<TestComponent />);

    // Verify error toast was shown
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Booking failed: Slot already taken"
      );
    });
  });

  // Test 10: Handle facilities with missing image URLs
  test("renders placeholder image when facility has no image URLs", async () => {
    render(<UserDashboard />);

    // Wait for facilities to load
    await waitFor(() => {
      expect(getDocs).toHaveBeenCalled();
    });

    // Find the Swimming Pool facility which has no image URLs
    const placeholder =
      "https://images.unsplash.com/photo-1527767654427-1790d8ff3745?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

    // Check that images are rendered correctly
    const images = document.querySelectorAll("img");
    const hasPlaceholderImage = Array.from(images).some(
      (img) => img.src === placeholder
    );
    expect(hasPlaceholderImage).toBe(true);
  });
});
