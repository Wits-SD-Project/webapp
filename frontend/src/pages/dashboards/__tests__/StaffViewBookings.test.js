import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import StaffViewBookings from "../StaffViewBookings";

/* ---- mocks --------------------------------------------------- */
jest.mock("../../../components/SideBar", () => ({ activeItem }) => (
  <div>Mock Sidebar - Active: {activeItem}</div>
));

/*  1️⃣  Mock *our* firebase wrapper  */
jest.mock("../../../firebase", () => require("../../../__mocks__/firebase"));

/*  2️⃣  Mock the direct `firebase/firestore` import that the component uses */
jest.mock("firebase/firestore", () => require("../../../__mocks__/firebase"));

/* grab all mocked fns we’ll need assertions for */
const firebase = require("../../../__mocks__/firebase");
const { collection, getDocs, updateDoc, resetFirebaseMock } = firebase;

/* ---- test data ----------------------------------------------- */
const mockBookings = [
  {
    id: "b1",
    facilityName: "Court 1",
    facilityType: "Tennis",
    userName: "User A",
    slot: "10:00 - 11:00",
    duration: "1 hr",
    status: "pending",
  },
  {
    id: "b2",
    facilityName: "Pool",
    facilityType: "",
    user: "User B",
    datetime: "14:00 - 15:00",
    duration: "1 hr",
    status: "approved",
  },
];

const mockFacilityDoc = {
  id: "fac1",
  data: () => ({
    name: "Court 1",
    timeslots: [
      { start: "10:00", end: "11:00", isBooked: false },
      { start: "11:00", end: "12:00", isBooked: false },
    ],
  }),
};

/* ---- helpers -------------------------------------------------- */
const renderComponent = () =>
  render(
    <MemoryRouter>
      <StaffViewBookings />
    </MemoryRouter>
  );

/* ---- setup ---------------------------------------------------- */
beforeEach(() => {
  resetFirebaseMock();

  /* shape returned by our mocked `collection()` */
  const bookingsCol = collection(firebase.db, "bookings");
  const facilitiesCol = collection(firebase.db, "facilities-test");

  /* tailor `getDocs` responses for each collection */
  getDocs.mockImplementation(async (colRef) => {
    if (colRef === bookingsCol) {
      return {
        docs: mockBookings.map((b) => ({ id: b.id, data: () => b })),
        empty: mockBookings.length === 0,
      };
    }
    if (colRef === facilitiesCol) {
      return { docs: [mockFacilityDoc], empty: false };
    }
    return { docs: [], empty: true };
  });
});

/* ------------------------------------------------------------------ */
/*                               TESTS                                */
/* ------------------------------------------------------------------ */
describe("StaffViewBookings Component", () => {
  test("renders base UI and fetches bookings", async () => {
    renderComponent();

    /* static UI */
    expect(screen.getByText(/mock sidebar/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /view bookings/i })
    ).toBeInTheDocument();

    /* data fetch & first row */
    expect(await screen.findByText("Court 1")).toBeInTheDocument();

    /* confirm Firestore was queried */
    expect(getDocs).toHaveBeenCalledWith(
      expect.objectContaining({ _path: "bookings" })
    );
  });

  test("shows all booking fields including fallbacks", async () => {
    renderComponent();

    await screen.findByText("Court 1"); // wait until data loaded
    expect(screen.getByText("Tennis")).toBeInTheDocument();
    expect(screen.getByText("10:00 - 11:00")).toBeInTheDocument();

    expect(screen.getByText("Pool")).toBeInTheDocument();
    /* fallback dashes for empty facilityType */
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  test("approving a booking updates both docs", async () => {
    renderComponent();
    const user = userEvent.setup();

    const cell = await screen.findByText("User A");
    const row = cell.closest("tr");
    await user.click(within(row).getByRole("button", { name: /approve/i }));

    /* two separate updateDoc calls (booking + facility) */
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledTimes(2);
    });
    /* booking status */
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "approved" })
    );
    /* facility slot */
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        timeslots: expect.arrayContaining([
          expect.objectContaining({
            start: "10:00",
            end: "11:00",
            isBooked: true,
            bookedBy: "User A",
          }),
        ]),
      })
    );
  });

  test("rejecting a booking only updates the booking doc", async () => {
    renderComponent();
    const user = userEvent.setup();

    const cell = await screen.findByText("User A");
    const row = cell.closest("tr");
    await user.click(within(row).getByRole("button", { name: /reject/i }));

    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "rejected" })
    );
  });

  test("handles empty bookings list gracefully", async () => {
    /* next call returns empty */
    getDocs.mockResolvedValueOnce({ docs: [], empty: true });

    renderComponent();
    await waitFor(() => expect(getDocs).toHaveBeenCalled());

    /* table body should still be in the document, just empty */
    expect(
      screen.getByRole("table", { name: /bookings/i })
    ).toBeInTheDocument();
  });
});
