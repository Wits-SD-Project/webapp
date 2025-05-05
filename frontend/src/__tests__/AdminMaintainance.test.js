import React from "react";
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import AdminMaintenance from "../pages/dashboards/AdminMaintenance"; // ← adjust if folder differs

/* ─────────────────────────── global mocks ──────────────────────────── */
/* router / sidebar kept minimal so we don't drag in CSS / images */
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("../components/AdminSideBar", () => () => <aside>side‑bar</aside>);

/* auth context supplies a deterministic name */
jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({ authUser: { name: "Test Admin" } }),
}));

/* silence framer‑motion warnings by no‑oping motion + AnimatePresence */
jest.mock("framer-motion", () => ({
  motion: {
    div: (props) => <div {...props} />,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

/* lock the JS clock →  1 May 2025 10:00 UTC  */
beforeAll(() => {
  jest.useFakeTimers().setSystemTime(new Date("2025-05-01T10:00:00Z"));
});
afterAll(() => jest.useRealTimers());

/* helper to grab a specific calendar cell by its number */
const getCalendarCell = (dayNumber) =>
  screen
    .getAllByText(String(dayNumber), { exact: false })
    .find(
      (el) =>
        el.classList.contains("calendar-day") &&
        !el.classList.contains("other-month")
    );

/* ─────────────────────────── the tests ─────────────────────────────── */
describe("AdminMaintenance", () => {
  beforeEach(() => {
    /* render fresh component each test */
    render(<AdminMaintenance />);
  });

  it("triggers alert when day clicked without facility chosen", () => {
    /* jest replaces global alert for inspection */
    const spy = jest.spyOn(window, "alert").mockImplementation(() => {});
    fireEvent.click(getCalendarCell(2)); // click 2 May 2025
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/select a facility/i)
    );
    spy.mockRestore();
  });

  it("schedules then deletes a new maintenance event", async () => {
    /* 1. pick facility */
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Swimming Pool" },
    });

    /* 2. open modal by clicking 2 May 2025 (future) */
    fireEvent.click(getCalendarCell(2));
    expect(
      screen.getByRole("heading", { name: /schedule maintenance/i })
    ).toBeInTheDocument();

    /* 3. fill start / end times and confirm */
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: "08:00" },
    });
    fireEvent.change(screen.getByLabelText(/end time/i), {
      target: { value: "10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /schedule/i }));

    /* 4. event should now appear in the list */
    const newCard = await screen.findByText(/swimming pool maintenance/i);
    expect(newCard).toBeInTheDocument();

    /* 5. delete it and confirm dialog */
    jest.spyOn(window, "confirm").mockReturnValueOnce(true);
    const deleteBtn = within(newCard.closest(".event-item")).getByRole(
      "button",
      { name: /delete/i }
    );
    fireEvent.click(deleteBtn);

    /* 6. card disappears */
    await waitFor(() =>
      expect(
        screen.queryByText(/swimming pool maintenance/i)
      ).not.toBeInTheDocument()
    );
  });
});
