import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResNotifications from "../../pages/dashboards/ResNotifications";
import { MemoryRouter } from "react-router-dom";
import { auth } from "../../firebase";
import { act } from "react-dom/test-utils";

// Mock the useAuth context
jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    setAuthUser: jest.fn(),
  }),
}));

// Mock Firebase Firestore
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
}));

describe("ResNotifications Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOnSnapshot = (data, error = null) => {
    const { onSnapshot } = require("firebase/firestore");
    onSnapshot.mockImplementation((_, onNext, onError) => {
      if (error) {
        onError(error);
      } else {
        onNext({ docs: data });
      }
      return jest.fn(); // Mock unsubscribe function
    });
  };

  test("renders loading state initially", () => {
    auth.currentUser = { email: "test@example.com" };

    render(
      <MemoryRouter>
        <ResNotifications />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading notifications.../i)).toBeInTheDocument();
  });

  test("displays error message if fetching notifications fails", async () => {
    auth.currentUser = { email: "test@example.com" };
    mockOnSnapshot([], new Error("Test error"));

    render(
      <MemoryRouter>
        <ResNotifications />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/failed to load notifications/i)
      ).toBeInTheDocument();
    });
  });

  test("renders notifications properly when data is fetched", async () => {
    auth.currentUser = { email: "test@example.com" };

    const mockNotifications = [
      {
        id: "1",
        data: () => ({
          createdAt: { toDate: () => new Date(Date.now() - 1000) },
          type: "event",
          eventName: "Event 1",
          facilityName: "Facility A",
          startTime: "2023-01-01T10:00:00Z",
          endTime: "2023-01-01T12:00:00Z",
        }),
      },
    ];

    mockOnSnapshot(mockNotifications);

    render(
      <MemoryRouter>
        <ResNotifications />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/new event: event 1 at facility a/i)
      ).toBeInTheDocument();
    });
  });

  test("filters notifications based on search query", async () => {
    auth.currentUser = { email: "test@example.com" };

    const mockNotifications = [
      {
        id: "1",
        data: () => ({
          createdAt: { toDate: () => new Date(Date.now() - 1000) },
          type: "event",
          eventName: "Event 1",
          facilityName: "Facility A",
          startTime: "2023-01-01T10:00:00Z",
          endTime: "2023-01-01T12:00:00Z",
        }),
      },
      {
        id: "2",
        data: () => ({
          createdAt: { toDate: () => new Date(Date.now() - 1000) },
          type: "booking",
          facilityName: "Facility B",
          slot: "9:00 AM - 10:00 AM",
          status: "confirmed",
        }),
      },
    ];

    mockOnSnapshot(mockNotifications);

    render(
      <MemoryRouter>
        <ResNotifications />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/new event: event 1 at facility a/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/your booking for facility b/i)
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/search notifications/i), {
      target: { value: "event" },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/new event: event 1 at facility a/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/your booking for facility b/i)
      ).not.toBeInTheDocument();
    });
  });

  test("handles no notifications gracefully", async () => {
    auth.currentUser = { email: "test@example.com" };

    mockOnSnapshot([]);

    render(
      <MemoryRouter>
        <ResNotifications />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no new notifications/i)).toBeInTheDocument();
    });
  });

  test("renders separate sections for new and old notifications", async () => {
    auth.currentUser = { email: "test@example.com" };

    const mockNotifications = [
      {
        id: "1",
        data: () => ({
          createdAt: { toDate: () => new Date(Date.now() - 1000) },
          type: "event",
          eventName: "Event 1",
          facilityName: "Facility A",
          startTime: "2023-01-01T10:00:00Z",
          endTime: "2023-01-01T12:00:00Z",
        }),
      },
      {
        id: "2",
        data: () => ({
          createdAt: {
            toDate: () => new Date(Date.now() - 48 * 60 * 60 * 1000),
          },
          type: "booking",
          facilityName: "Facility B",
          slot: "9:00 AM - 10:00 AM",
          status: "confirmed",
        }),
      },
    ];

    mockOnSnapshot(mockNotifications);

    render(
      <MemoryRouter>
        <ResNotifications />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/new event: event 1 at facility a/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/your booking for facility b/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/new notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/past notifications/i)).toBeInTheDocument();
    });
  });

  test("handles case when user is not logged in", async () => {
    auth.currentUser = null;

    render(
      <MemoryRouter>
        <ResNotifications />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.queryByText(/loading notifications/i)
      ).not.toBeInTheDocument();
    });
  });
});
