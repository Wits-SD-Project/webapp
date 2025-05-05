// src/__tests__/StaffViewBookings.test.js
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import ViewBookings from "../pages/dashboards/StaffViewBookings";

/* ───── Sidebar stub ───── */
jest.mock("../components/StaffSideBar.js", () => () => <aside>sidebar</aside>);

/* ───── firebase auth/db stub ───── */
jest.mock("../firebase", () => ({
  auth: { currentUser: { uid: "staff1" } },
  db: {},
}));

/* ───── Firestore mocks ───── */
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
  doc,
} from "firebase/firestore";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((db, name) => name),
  query: jest.fn((...args) => args),
  where: jest.fn((...args) => args),
  getDocs: jest.fn(),
  updateDoc: jest.fn(() => Promise.resolve()),
  addDoc: jest.fn(() => Promise.resolve()),
  doc: jest.fn((db, col, id) => ({ path: `${col}/${id}` })),
}));

describe("StaffViewBookings", () => {
  let bookingsDocs, facilitiesDocs, getDocsCall;

  beforeEach(() => {
    jest.clearAllMocks();
    getDocsCall = 0;

    bookingsDocs = [
      {
        id: "b1",
        data: () => ({
          facilityName: "Gym",
          userName: "Alice",
          slot: "09:00-10:00",
          date: "2025-05-06",
          duration: "1h",
          status: "pending",
        }),
      },
      {
        id: "b2",
        data: () => ({
          facilityName: "Pool",
          user: "Bob",
          datetime: "2025-05-07T11:00",
          slot: "11:00-12:00",
          date: "2025-05-07",
          duration: "1h",
          status: "approved",
        }),
      },
    ];

    facilitiesDocs = [
      {
        id: "f1",
        data: () => ({
          name: "Gym",
          timeslots: [{ start: "09:00", end: "10:00", isBooked: false }],
        }),
      },
    ];

    getDocs.mockImplementation(() => {
      getDocsCall++;
      // first call: bookings, second call: facilities
      return Promise.resolve({
        docs: getDocsCall === 1 ? bookingsDocs : facilitiesDocs,
      });
    });
  });

  const renderPage = () => render(<ViewBookings />);

  test("no bookings → only header row", async () => {
    // override to return no bookings
    getDocs.mockResolvedValueOnce({ docs: [] });
    renderPage();
    await waitFor(() => expect(getDocs).toHaveBeenCalledTimes(1));
    const rows = screen.getAllByRole("row");
    // only the <thead> row
    expect(rows).toHaveLength(1);
    expect(screen.queryByText("Approve")).toBeNull();
    expect(screen.queryByText("View")).toBeNull();
  });

  test("renders bookings sorted (pending first), buttons & search work", async () => {
    renderPage();
    // wait for bookings load
    const rows = await screen.findAllByRole("row");
    // header + 2 bookings
    expect(rows).toHaveLength(3);

    // Pending (Gym) should be row1
    const [_, pendingRow, approvedRow] = rows;
    expect(pendingRow).toHaveTextContent("Gym");
    expect(pendingRow).toHaveTextContent("Alice");
    expect(pendingRow).toHaveTextContent("pending");
    // should have Approve & Reject
    expect(
      within(pendingRow).getByRole("button", { name: "Approve" })
    ).toBeInTheDocument();
    expect(
      within(pendingRow).getByRole("button", { name: "Reject" })
    ).toBeInTheDocument();

    // Approved (Pool) should be row2
    expect(approvedRow).toHaveTextContent("Pool");
    expect(approvedRow).toHaveTextContent("Bob");
    expect(approvedRow).toHaveTextContent("approved");
    // only View
    expect(
      within(approvedRow).getByRole("button", { name: "View" })
    ).toBeInTheDocument();

    // search by facilityName
    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "Pool" },
    });
    expect(screen.queryByText("Gym")).toBeNull();
    expect(screen.getByText("Pool")).toBeInTheDocument();

    // search by status (case-insensitive)
    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "pending" },
    });
    expect(screen.getByText("Gym")).toBeInTheDocument();
    expect(screen.queryByText("Pool")).toBeNull();

    // clear search
    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "" },
    });
    expect(screen.getByText("Gym")).toBeInTheDocument();
    expect(screen.getByText("Pool")).toBeInTheDocument();
  });

  test("view-only button does not trigger any firestore calls", async () => {
    renderPage();
    const approvedRow = (await screen.findAllByRole("row"))[2];
    fireEvent.click(within(approvedRow).getByRole("button", { name: "View" }));
    expect(updateDoc).not.toHaveBeenCalled();
    expect(addDoc).not.toHaveBeenCalled();
  });

  test("approve pending booking → booking + notification + facility update", async () => {
    renderPage();
    const pendingRow = (await screen.findAllByRole("row"))[1];
    fireEvent.click(
      within(pendingRow).getByRole("button", { name: "Approve" })
    );

    // should call booking update
    await waitFor(() =>
      expect(updateDoc).toHaveBeenCalledWith(
        { path: "bookings/b1" },
        { status: "approved" }
      )
    );

    // should create notification
    expect(addDoc).toHaveBeenCalledWith(
      "notifications",
      expect.objectContaining({
        userName: "Alice",
        facilityName: "Gym",
        status: "approved",
      })
    );

    // second getDocs for facilities
    expect(getDocsCall).toBe(2);

    // should update facility timeslot
    await waitFor(() =>
      expect(updateDoc).toHaveBeenCalledWith(
        { path: "facilities-test/f1" },
        expect.objectContaining({
          timeslots: expect.arrayContaining([
            expect.objectContaining({ isBooked: true, bookedBy: "Alice" }),
          ]),
        })
      )
    );

    // UI row should now reflect 'approved'
    expect(pendingRow).toHaveTextContent("approved");
  });

  test("approve branch: no matching facility → only booking+notification", async () => {
    // make facilities empty
    facilitiesDocs = [];
    renderPage();
    const pendingRow = (await screen.findAllByRole("row"))[1];
    fireEvent.click(
      within(pendingRow).getByRole("button", { name: "Approve" })
    );

    // booking update + notification
    await waitFor(() =>
      expect(updateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: "bookings/b1" }),
        { status: "approved" }
      )
    );
    expect(addDoc).toHaveBeenCalled();

    // because no facilityDoc, no second updateDoc
    // total updateDoc calls should be exactly 1
    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
  });

  test("reject pending booking → booking + notification only", async () => {
    renderPage();
    const pendingRow = (await screen.findAllByRole("row"))[1];
    fireEvent.click(within(pendingRow).getByRole("button", { name: "Reject" }));

    await waitFor(() =>
      expect(updateDoc).toHaveBeenCalledWith(
        { path: "bookings/b1" },
        { status: "rejected" }
      )
    );
    expect(addDoc).toHaveBeenCalledWith(
      "notifications",
      expect.objectContaining({
        facilityName: "Gym",
        status: "rejected",
      })
    );
    // no facility update on reject
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(pendingRow).toHaveTextContent("rejected");
  });

  test("fallback to `user` when `userName` is missing", async () => {
    // override bookings to only one with no userName
    bookingsDocs = [
      {
        id: "b3",
        data: () => ({
          facilityName: "Track",
          user: "Carl",
          slot: "07:00-08:00",
          date: "2025-05-08",
          duration: "1h",
          status: "pending",
        }),
      },
    ];
    getDocs.mockResolvedValueOnce({ docs: bookingsDocs });
    // facilities for branch
    getDocs.mockResolvedValueOnce({ docs: facilitiesDocs });

    renderPage();
    const pendingRow = (await screen.findAllByRole("row"))[1];
    fireEvent.click(
      within(pendingRow).getByRole("button", { name: "Approve" })
    );

    // notification uses "Carl"
    await waitFor(() =>
      expect(addDoc).toHaveBeenCalledWith(
        "notifications",
        expect.objectContaining({ userName: "Carl" })
      )
    );
  });
});
