// src/pages/dashboards/__tests__/UserDashboard.test.js
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import UserDashboard from "../UserDashboard";
// Firebase functions are mocked below
import {
  db,
  auth,
  collection,
  getDocs,
  query,
  where,
  addDoc,
} from "../../../firebase";
import { toast } from "react-toastify";

// Mock dependencies
const mockAuthInstance = { currentUser: null }; // Create a mutable mock auth object
jest.mock("../../../components/Navbar", () => () => <nav>Mock Navbar</nav>);
jest.mock("../../../firebase", () => {
  const originalModule = jest.requireActual("../../../firebase"); // Keep other exports if needed
  return {
    __esModule: true,
    ...originalModule, // Spread original exports
    auth: mockAuthInstance, // Export the mock instance
    getAuth: jest.fn(() => mockAuthInstance), // Mock getAuth to return it
    // Mock other Firestore functions as needed for this test file
    collection: jest.fn((db, path) => ({
      path,
      type: "collection",
      _key: path,
    })), // Basic mock with a key for identification
    getDocs: jest.fn(), // Will be implemented per test case
    query: jest.fn((collRef, ...constraints) => ({
      // Mock query to return an object representing the query
      _query: true, // Mark it as a query object
      _collectionRef: collRef,
      _constraints: constraints,
    })),
    where: jest.fn((field, op, value) => ({ type: "where", field, op, value })), // Mock where constraint
    addDoc: jest.fn(), // Mock addDoc
    db: { type: "mock-db" }, // Mock the db instance itself if needed
  };
});
jest.mock("react-toastify");

describe("UserDashboard Component", () => {
  const mockFacilities = [
    { id: "fac1", name: "Tennis Court Alpha", type: "Sport" },
    { id: "fac2", name: "Swimming Pool Beta", type: "Leisure" },
  ];
  const mockSlots = {
    fac1: [
      {
        day: "Monday",
        start: "10:00",
        end: "11:00",
        isBooked: false,
        facilityId: "fac1",
      },
      {
        day: "Tuesday",
        start: "14:00",
        end: "15:00",
        isBooked: true, // Simulate a booked slot
        facilityId: "fac1",
      },
      {
        day: "Monday",
        start: "11:00",
        end: "12:00",
        isBooked: false,
        facilityId: "fac1",
      },
    ],
    fac2: [
      {
        day: "Friday",
        start: "08:00",
        end: "09:00",
        isBooked: false,
        facilityId: "fac2",
      },
    ],
  };

  const mockUser = {
    uid: "resident1",
    displayName: "Resident User",
    email: "resident@test.com",
  };

  const renderComponent = () => {
    render(
      <MemoryRouter>
        <UserDashboard />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset and mock auth currentUser using the instance from the mock
    const {
      auth,
      getDocs: mockGetDocsFirebase,
      addDoc: mockAddDocFirebase,
    } = require("../../../firebase"); // Import the mocked auth and functions
    auth.currentUser = mockUser;

    // Reset and Mock Firestore getDocs calls
    mockGetDocsFirebase.mockImplementation(async (queryOrCollectionRef) => {
      // Check if it's a collection ref or query object based on our mock structure
      const isQuery = queryOrCollectionRef._query;
      const collectionPath = isQuery
        ? queryOrCollectionRef._collectionRef.path
        : queryOrCollectionRef.path;

      if (collectionPath === "facilities-test") {
        return {
          docs: mockFacilities.map((f) => ({ id: f.id, data: () => f })),
          empty: mockFacilities.length === 0,
        };
      }
      if (collectionPath === "timeslots-test" && isQuery) {
        // Simulate the query based on facilityId constraint
        const facilityIdConstraint = queryOrCollectionRef._constraints?.find(
          (c) => c.type === "where" && c.field === "facilityId"
        );
        const facilityId = facilityIdConstraint?.value;
        const slotsForFacility = mockSlots[facilityId] || [];
        return {
          docs: slotsForFacility.map((s, index) => ({
            id: `slot-${facilityId}-${index}`,
            data: () => s,
          })),
          empty: slotsForFacility.length === 0,
        };
      }
      if (collectionPath === "bookings") {
        // For handleBooking check if needed
        return { docs: [], empty: true }; // Default for bookings
      }
      console.warn(
        `Unhandled getDocs call for path/query:`,
        queryOrCollectionRef
      );
      return { docs: [], empty: true }; // Default empty
    });

    // Reset and mock addDoc
    mockAddDocFirebase.mockResolvedValue({ id: "new-booking-id" }); // Mock successful booking add
  });

  test("renders Navbar and loading state initially", () => {
    // Reset getDocs mock for initial render (no data yet)
    const { getDocs: mockGetDocsFirebase } = require("../../../firebase");
    mockGetDocsFirebase.mockResolvedValueOnce({ docs: [], empty: true });
    renderComponent();
    expect(screen.getByText("Mock Navbar")).toBeInTheDocument();
    expect(screen.getByText(/loading facilities/i)).toBeInTheDocument();
  });

  test("fetches and displays facilities and available slots", async () => {
    renderComponent();
    const {
      getDocs: mockGetDocsFirebase,
      collection: mockCollectionFirebase,
      query: mockQueryFirebase,
      where: mockWhereFirebase,
    } = require("../../../firebase");

    // Wait for facilities and slots to load
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Tennis Court Alpha" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Swimming Pool Beta" })
      ).toBeInTheDocument();
    });

    // Check slots for Tennis Court Alpha
    // Use getAllByText carefully if the text appears multiple times
    expect(screen.getAllByText("Monday")[0]).toBeInTheDocument(); // First Monday
    expect(screen.getAllByText("10:00")[0]).toBeInTheDocument(); // First 10:00
    expect(screen.getAllByText("11:00")[0]).toBeInTheDocument(); // First 11:00
    expect(
      screen.getAllByRole("button", { name: "Book" })[0]
    ).toBeInTheDocument(); // First book button

    expect(screen.getAllByText("Monday")[1]).toBeInTheDocument(); // Second Monday
    expect(screen.getAllByText("11:00")[1]).toBeInTheDocument(); // Second 11:00
    expect(screen.getByText("12:00")).toBeInTheDocument(); // 12:00
    expect(
      screen.getAllByRole("button", { name: "Book" })[1]
    ).toBeInTheDocument(); // Second book button

    // Ensure the booked slot (Tuesday 14:00) is NOT displayed because its isBooked is true
    expect(screen.queryByText("14:00")).not.toBeInTheDocument();

    // Check slots for Swimming Pool Beta
    expect(screen.getByText("Friday")).toBeInTheDocument();
    expect(screen.getByText("08:00")).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Book" })[2] // Now the third button overall
    ).toBeInTheDocument();

    // Verify Firestore calls
    expect(mockGetDocsFirebase).toHaveBeenCalledWith(
      expect.objectContaining({ path: "facilities-test" })
    );
    // Expect calls for timeslots for each facility
    expect(mockGetDocsFirebase).toHaveBeenCalledWith(
      expect.objectContaining({
        _query: true,
        _collectionRef: expect.objectContaining({ path: "timeslots-test" }),
        _constraints: expect.arrayContaining([
          expect.objectContaining({ field: "facilityId", value: "fac1" }),
        ]),
      })
    );
    expect(mockGetDocsFirebase).toHaveBeenCalledWith(
      expect.objectContaining({
        _query: true,
        _collectionRef: expect.objectContaining({ path: "timeslots-test" }),
        _constraints: expect.arrayContaining([
          expect.objectContaining({ field: "facilityId", value: "fac2" }),
        ]),
      })
    );
  });

  test("handles booking button click", async () => {
    const { addDoc: mockAddDocFirebase } = require("../../../firebase");
    const alertMock = jest.spyOn(window, "alert").mockImplementation(() => {});
    renderComponent();
    const user = userEvent.setup();

    // Wait for rendering
    const bookButtons = await screen.findAllByRole("button", { name: "Book" });
    expect(bookButtons.length).toBe(3); // Two for Tennis, one for Pool

    // Click the first book button (Monday 10:00 - 11:00 for Tennis Court Alpha)
    await user.click(bookButtons[0]);

    // Check if addDoc was called correctly
    await waitFor(() => {
      expect(mockAddDocFirebase).toHaveBeenCalledTimes(1);
      expect(mockAddDocFirebase).toHaveBeenCalledWith(
        expect.objectContaining({ path: "bookings" }), // Check collection reference
        expect.objectContaining({
          facilityName: "Tennis Court Alpha",
          userName: mockUser.displayName,
          slot: "10:00 - 11:00",
          duration: "1 hr", // Calculated duration
          status: "pending",
          // date and createdAt are harder to assert exactly, check presence
          date: expect.any(String),
          createdAt: expect.any(String),
        })
      );
      // Check date format (optional, more specific)
      expect(mockAddDocFirebase.mock.calls[0][1].date).toMatch(
        /^\d{4}-\d{2}-\d{2}$/
      );
    });

    // Check for alert message
    expect(alertMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "Booking request submitted for Tennis Court Alpha"
      ) // More flexible check
    );

    alertMock.mockRestore();
  });

  test("handles booking error", async () => {
    const { addDoc: mockAddDocFirebase } = require("../../../firebase");
    const error = new Error("Firestore booking failed");
    mockAddDocFirebase.mockRejectedValueOnce(error); // Simulate failure
    const alertMock = jest.spyOn(window, "alert").mockImplementation(() => {});
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    renderComponent();
    const user = userEvent.setup();
    const bookButtons = await screen.findAllByRole("button", { name: "Book" });

    await user.click(bookButtons[0]);

    await waitFor(() => {
      expect(mockAddDocFirebase).toHaveBeenCalledTimes(1);
    });

    expect(alertMock).toHaveBeenCalledWith("Failed to book the timeslot.");
    expect(consoleSpy).toHaveBeenCalledWith("Error booking timeslot:", error);

    alertMock.mockRestore();
    consoleSpy.mockRestore();
  });

  // Add test case for when user is not logged in (auth.currentUser is null)
  test("handles booking attempt when not logged in", async () => {
    const { auth, addDoc: mockAddDocFirebase } = require("../../../firebase");
    auth.currentUser = null; // Simulate logged out
    const alertMock = jest.spyOn(window, "alert").mockImplementation(() => {});
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    renderComponent();
    const user = userEvent.setup();
    const bookButtons = await screen.findAllByRole("button", { name: "Book" });

    await user.click(bookButtons[0]);

    await waitFor(() => {
      expect(mockAddDocFirebase).not.toHaveBeenCalled(); // Should not attempt to book
    });

    expect(alertMock).toHaveBeenCalledWith("Failed to book the timeslot.");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error booking timeslot:",
      expect.any(Error)
    );
    // Check the specific error message if possible
    expect(consoleSpy.mock.calls[0][1].message).toBe("User not logged in");

    alertMock.mockRestore();
    consoleSpy.mockRestore();
    auth.currentUser = mockUser; // Restore for other tests
  });
});
