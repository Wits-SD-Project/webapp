// src/__tests__/ResDashboard.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResDashboard from "../pages/dashboards/ResDashboard";

// ───── Sidebar stub ─────
jest.mock("../components/ResSideBar.js", () => () => <aside>sidebar</aside>);

// ───── router stub ─────
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// ───── AuthContext stub ─────
jest.mock("../context/AuthContext.js", () => ({
  useAuth: () => ({ authUser: { name: "Alice" } }),
}));

// ───── firebase/auth + db stub ─────
jest.mock("../firebase", () => ({
  auth: { currentUser: { uid: "u1", email: "alice@example.com" } },
  db: {},
}));

// ───── Firestore mocks ─────
import { collection, onSnapshot } from "firebase/firestore";
jest.mock("firebase/firestore", () => ({
  collection: jest.fn((db, name) => name),
  onSnapshot: jest.fn(),
}));

describe("ResDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it("shows username, notification & event counts, banner, and navigates correctly", async () => {
    const eventDocs = [
      { data: () => ({ foo: "bar" }) },
      { data: () => ({ foo: "baz" }) },
      { data: () => ({ foo: "qux" }) },
    ];
    const notifDocs = [
      { data: () => ({ userName: "alice@example.com", read: false }) },
      { data: () => ({ userName: "alice@example.com", read: false }) },
      { data: () => ({ userName: "alice@example.com", read: true }) },
      { data: () => ({ userName: "bob@example.com", read: false }) },
    ];

    // banner should show
    localStorage.setItem("lastSeenEventCount", "0");

    onSnapshot.mockImplementation((ref, cb) => {
      if (ref === "admin-events") cb({ docs: eventDocs });
      else if (ref === "notifications") cb({ docs: notifDocs });
      return () => {};
    });

    render(<ResDashboard />);

    expect(screen.getByText("Alice")).toBeInTheDocument();

    // wait for unread count to update
    await waitFor(() =>
      expect(screen.getByText(/2 new notification/)).toBeInTheDocument()
    );

    // wait for event count
    await waitFor(() =>
      expect(
        screen.getByText(/There are 3 upcoming events/)
      ).toBeInTheDocument()
    );

    expect(
      screen.getByText(/A new event has been posted!/)
    ).toBeInTheDocument();

    // click notification "View all"
    fireEvent.click(screen.getByRole("button", { name: /View all/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/res-notifications");

    // click events "View all"
    const buttons = screen.getAllByRole("button", { name: /View all/i });
    fireEvent.click(buttons[1]);
    expect(localStorage.getItem("lastSeenEventCount")).toBe("3");
    expect(mockNavigate).toHaveBeenCalledWith("/res-events");

    // banner hides after 8s
    jest.advanceTimersByTime(8000);
    await waitFor(() =>
      expect(
        screen.queryByText(/A new event has been posted!/)
      ).not.toBeInTheDocument()
    );
  });

  it("does not show banner when event count ≤ lastSeenEventCount", async () => {
    localStorage.setItem("lastSeenEventCount", "5");
    onSnapshot.mockImplementation((ref, cb) => {
      if (ref === "admin-events") cb({ docs: [{ data: () => ({}) }] });
      else if (ref === "notifications") cb({ docs: [] });
      return () => {};
    });

    render(<ResDashboard />);
    expect(
      screen.queryByText(/A new event has been posted!/)
    ).not.toBeInTheDocument();
  });

  it("filters notifications correctly by user and read flag", async () => {
    const mixedNotifs = [
      { data: () => ({ userName: "alice@example.com", read: false }) },
      { data: () => ({ userName: "alice@example.com", read: false }) },
      { data: () => ({ userName: "alice@example.com", read: false }) },
      { data: () => ({ userName: "bob@example.com", read: false }) },
      { data: () => ({ userName: "alice@example.com", read: true }) },
    ];

    onSnapshot.mockImplementation((ref, cb) => {
      if (ref === "admin-events") cb({ docs: [] });
      else if (ref === "notifications") cb({ docs: mixedNotifs });
      return () => {};
    });

    render(<ResDashboard />);

    await waitFor(() =>
      expect(screen.getByText(/3 new notification/)).toBeInTheDocument()
    );
  });
});
