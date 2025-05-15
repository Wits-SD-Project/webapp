import React from "react";
import { render, screen } from "@testing-library/react";
import ResEvents from "../pages/dashboards/ResEvents";

// ───── Sidebar stub ─────
jest.mock("../components/ResSideBar", () => () => <aside>sidebar</aside>);

// ───── firebase stub ─────
jest.mock("../firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "user1" } },
}));

// ───── firestore mocks ─────
import { collection, onSnapshot } from "firebase/firestore";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((db, name) => name),
  onSnapshot: jest.fn(),
}));

describe("ResEvents component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows empty state when there are no events", () => {
    // simulate onSnapshot callback with no docs
    onSnapshot.mockImplementation((ref, cb) => {
      cb({ docs: [] });
      return () => {};
    });

    render(<ResEvents />);

    expect(
      screen.getByText("No upcoming events available.")
    ).toBeInTheDocument();
  });

  it("renders a list of events with proper fields", () => {
    const docs = [
      {
        id: "evt1",
        data: () => ({
          eventName: "Gala",
          startTime: "2025-05-01T10:00:00Z",
          endTime: "2025-05-01T12:00:00Z",
          facility: "Hall A",
          description: "Annual charity gala",
        }),
      },
      {
        id: "evt2",
        data: () => ({
          eventName: "Fair",
          startTime: "2025-06-10T09:00:00Z",
          endTime: "2025-06-10T11:00:00Z",
          facility: "Exhibit Hall",
          // no description
        }),
      },
    ];

    onSnapshot.mockImplementation((ref, cb) => {
      cb({ docs });
      return () => {};
    });

    render(<ResEvents />);

    // should not show empty-state
    expect(
      screen.queryByText("No upcoming events available.")
    ).not.toBeInTheDocument();

    // event names
    expect(screen.getByText("Gala")).toBeInTheDocument();
    expect(screen.getByText("Fair")).toBeInTheDocument();

    // facility labels
    expect(screen.getByText(/Facility: Hall A/)).toBeInTheDocument();
    expect(screen.getByText(/Facility: Exhibit Hall/)).toBeInTheDocument();

    // descriptions: only the first has one
    expect(screen.getByText("Annual charity gala")).toBeInTheDocument();
    expect(screen.queryByText("Event description:")).not.toBeInTheDocument();

    // date/time strings appear somewhere in the list items
    const galaItem = screen.getByText("Gala").closest("li");
    expect(galaItem).toHaveTextContent("Gala");
    expect(galaItem).toHaveTextContent("Hall A");
    // times are localized strings but should include the year
    expect(galaItem).toHaveTextContent("2025");
  });
});
