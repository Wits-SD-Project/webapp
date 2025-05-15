import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import StaffUpcomingBookings from "../pages/dashboards/StaffUpcomingBookings";

// ───── Sidebar stub ─────
jest.mock("../components/StaffSideBar.js", () => () => <aside>sidebar</aside>);

// ───── router navigate spy ─────
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// ───── freeze time at 2025-05-05 ─────
beforeAll(() => {
  jest.useFakeTimers().setSystemTime(new Date("2025-05-05T09:00:00Z"));
});
afterAll(() => {
  jest.useRealTimers();
});

// ───── firebase auth/db stub ─────
jest.mock("../firebase", () => ({
  auth: { currentUser: { uid: "staff1" } },
  db: {},
}));

// ───── Firestore dynamic mock ─────
import * as firestore from "firebase/firestore";
jest.mock("firebase/firestore", () => ({
  collection: jest.fn((db, name) => name),
  query: jest.fn((ref, ...conds) => ({ ref, conds })),
  where: jest.fn((ref, op, val) => ({ ref, op, val })),
  getDocs: jest.fn(),
}));

describe("StaffUpcomingBookings", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const docs = [
    // past + approved → filtered out
    {
      data: () => ({
        facilityName: "Gym",
        userName: "Alice",
        date: "2025-05-04",
        slot: "09:00-10:00",
        duration: "1h",
        facilityStaff: "staff1",
        status: "approved",
      }),
    },
    // today + approved → include
    {
      data: () => ({
        facilityName: "Pool",
        userName: "Bob",
        date: "2025-05-05",
        slot: "10:00-11:00",
        duration: "1h",
        facilityStaff: "staff1",
        status: "approved",
      }),
    },
    // future + approved → include
    {
      data: () => ({
        facilityName: "Court",
        userName: "Carol",
        date: "2025-05-06",
        slot: "11:00-12:00",
        duration: "1h",
        facilityStaff: "staff1",
        status: "approved",
      }),
    },
    // future + pending → filtered by status
    {
      data: () => ({
        facilityName: "Field",
        userName: "Dan",
        date: "2025-05-07",
        slot: "12:00-13:00",
        duration: "1h",
        facilityStaff: "staff1",
        status: "pending",
      }),
    },
    // correct date/status but wrong staff → filtered by staff
    {
      data: () => ({
        facilityName: "Hall",
        userName: "Eve",
        date: "2025-05-06",
        slot: "13:00-14:00",
        duration: "1h",
        facilityStaff: "other",
        status: "approved",
      }),
    },
  ];

  it("renders only future approved bookings sorted by date", async () => {
    // set getDocs to return our docs
    firestore.getDocs.mockResolvedValue({ docs });

    render(<StaffUpcomingBookings />);

    // wait for the first body row to appear
    const rows = await screen.findAllByRole("row");
    // 1 header + 2 data rows
    expect(rows).toHaveLength(3);

    const [header, row1, row2] = rows;
    expect(row1).toHaveTextContent("Pool");
    expect(row1).toHaveTextContent("Bob");
    expect(row1).toHaveTextContent("2025-05-05");
    expect(row1).toHaveTextContent("10:00-11:00");

    expect(row2).toHaveTextContent("Court");
    expect(row2).toHaveTextContent("Carol");
    expect(row2).toHaveTextContent("2025-05-06");
  });

  it("Back button navigates to /staff-dashboard", () => {
    // still need a resolved getDocs, even if empty
    firestore.getDocs.mockResolvedValue({ docs: [] });

    render(<StaffUpcomingBookings />);
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/staff-dashboard");
  });

  it("renders no data rows when none match filter", async () => {
    // supply only past or wrong-status docs
    firestore.getDocs.mockResolvedValue({
      docs: [
        { data: () => ({ ...docs[0].data(), facilityStaff: "staff1" }) }, // past-approved
        { data: () => ({ ...docs[3].data(), status: "pending" }) }, // future-pending
      ],
    });

    render(<StaffUpcomingBookings />);
    const rows = await screen.findAllByRole("row");
    // only header
    expect(rows).toHaveLength(1);
  });
});
