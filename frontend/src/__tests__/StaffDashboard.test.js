import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import StaffDashboard from "../pages/dashboards/StaffDashboard";

/* ───── sidebar stub ───── */
jest.mock("../components/StaffSideBar.js", () => () => <aside>sidebar</aside>);

/* framer‑motion → render children */
jest.mock("framer-motion", () => ({
  motion: new Proxy({}, { get: () => (p) => <>{p.children}</> }),
  AnimatePresence: ({ children }) => <>{children}</>,
}));

/* react‑router spy */
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

/* Auth context */
jest.mock("../context/AuthContext.js", () => ({
  useAuth: () => ({ authUser: { name: "Sam" } }),
}));

/* firebase entry‑point (define inside factory) */
jest.mock("../firebase", () => {
  const auth = { currentUser: { uid: "staff1", email: "staff@test.com" } };
  const db = {}; // simple stub
  return { auth, db };
});

/* Firestore mocks */
const makeSnapshot = (docs) => ({
  forEach: (cb) => docs.forEach((d) => cb({ data: () => d })),
});
const mockCollection = jest.fn((_, path) => path);
const mockQuery = jest.fn(() => "query");
const mockWhere = jest.fn(() => "where");

const mockOnSnapshot = jest.fn((q, cb) => {
  // initial emission
  cb(
    makeSnapshot([
      /* approved, future */
      { status: "approved", date: "2025-05-07", facilityStaff: "staff1" },
      { status: "approved", date: "2025-05-10", facilityStaff: "staff1" },
      /* pending */
      { status: "pending", date: "2025-05-06", facilityStaff: "staff1" },
      { status: "pending", date: "2025-05-08", facilityStaff: "staff1" },
    ])
  );
  return jest.fn(); // unsubscribe
});

jest.mock("firebase/firestore", () => ({
  collection: (...args) => mockCollection(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
}));

/* helpers */
const renderPage = () => render(<StaffDashboard />);

describe("StaffDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    /* freeze “today” at 2025‑05‑05 */
    jest.useFakeTimers().setSystemTime(new Date("2025-05-05T09:00:00Z"));
  });
  afterEach(() => jest.useRealTimers());

  test("shows counts, days‑until, and navigates", async () => {
    renderPage();

    // upcoming 2, next in 2 days (2025‑05‑07 - 2025‑05‑05)
    expect(
      await screen.findByText(/You have 2 upcoming bookings/)
    ).toHaveTextContent("in 2 day");

    // pending 2
    expect(
      screen.getByText(/2 booking requests awaiting your approval/)
    ).toBeInTheDocument();

    // navigation buttons
    fireEvent.click(
      screen.getByRole("button", { name: /View all/i, exact: false })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/staff-upcoming-bookings");

    fireEvent.click(screen.getAllByRole("button", { name: /View all/i })[1]);
    expect(mockNavigate).toHaveBeenCalledWith("/staff-view-bookings");
  });

  test("filters only pending status for pending count", () => {
    // emit snapshot with mix of statuses
    mockOnSnapshot.mockImplementationOnce((q, cb) => {
      cb(
        makeSnapshot([
          { status: "pending", date: "2025-05-06", facilityStaff: "staff1" },
          { status: "approved", date: "2025-05-04", facilityStaff: "staff1" },
          { status: "rejected", date: "2025-05-05", facilityStaff: "staff1" },
        ])
      );
      return jest.fn();
    });

    renderPage();
    expect(
      screen.getByText(/1 booking requests awaiting your approval/)
    ).toBeInTheDocument();
  });
});
