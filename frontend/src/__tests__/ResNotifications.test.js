/* eslint-disable testing-library/no-node-access */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResNotifications from "../pages/dashboards/ResNotifications";

/* ─── sidebar stub ─── */
jest.mock("../components/ResSideBar.js", () => () => <aside>sidebar</aside>);

/* ─── mock firebase entry‑point used in code:  ../../firebase ─── */
let auth; // we expose these for later expectations if needed
let db;
jest.mock("../firebase", () => {
  const user = { uid: "u1", email: "user@example.com" };
  auth = { currentUser: user };
  db = { mock: true };
  return { auth, db };
});

/* Firestore helpers */
const bookingData = {
  createdAt: new Date("2025-05-06T08:00Z"),
  facilityName: "Pool",
  slot: "09:00 - 10:00",
  status: "approved",
  type: "booking",
  userName: "user@example.com",
};
const eventData = {
  createdAt: new Date("2025-05-07T12:00Z"),
  type: "event",
  userName: "user@example.com",
  eventName: "Gala",
  facility: "Hall A",
  startTime: new Date("2025-05-07T18:00Z").toISOString(),
  endTime: new Date("2025-05-07T20:00Z").toISOString(),
};

/* Firestore query mocks */
const mockGetDocs = jest.fn(async () => ({
  docs: [{ data: () => bookingData }, { data: () => eventData }],
}));
const mockCollection = jest.fn(() => ({}));
const mockQuery = jest.fn(() => ({}));
const mockWhere = jest.fn(() => ({}));

jest.mock("../../firebase", () => ({
  auth,
  db,
}));

jest.mock("firebase/firestore", () => ({
  collection: (...args) => mockCollection(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  getDocs: (...args) => mockGetDocs(...args),
}));

/* ─── helper ─── */
const renderPage = () => render(<ResNotifications />);

/* ─── tests ─── */
describe("Resident notifications page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders booking & event rows, correct Firestore query", async () => {
    renderPage();

    // Booking row
    expect(
      await screen.findByText(/Pool.*09:00.*approved/i)
    ).toBeInTheDocument();

    // Event row
    expect(screen.getByText(/New event: Gala/i)).toBeInTheDocument();

    // Firestore filters by user email
    expect(mockWhere).toHaveBeenCalledWith("userName", "==", mockUser.email);
  });

  test("search filters rows by query string", async () => {
    renderPage();
    await screen.findByText(/Pool/); // rows ready

    const search = screen.getByPlaceholderText("Search");
    fireEvent.change(search, { target: { value: "Pool" } });

    // booking row visible, event row hidden
    expect(screen.getByText(/Pool/)).toBeInTheDocument();
    expect(screen.queryByText(/Gala/)).not.toBeInTheDocument();

    // switch to 'Gala'
    fireEvent.change(search, { target: { value: "Gala" } });
    expect(screen.getByText(/Gala/)).toBeInTheDocument();
    expect(screen.queryByText(/Pool/)).not.toBeInTheDocument();
  });
});
