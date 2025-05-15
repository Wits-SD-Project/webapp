/* eslint-disable testing-library/no-node-access */
import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import EditTimeSlots from "../pages/dashboards/StaffEditTimeSlots";

/* ─────────── mocks ─────────── */
jest.mock("../components/StaffSideBar.js", () => () => <aside>sidebar</aside>);
jest.mock("../assets/add.png", () => "add.png");
jest.mock("../assets/bin.png", () => "bin.png");

jest.mock("react-toastify", () => {
  const toast = { success: jest.fn(), error: jest.fn() };
  return { toast };
});
import { toast as mockToast } from "react-toastify";

jest.mock("../firebase", () => ({
  getAuthToken: () => Promise.resolve("TOKEN"),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ id: "fac1" }),
  useNavigate: () => mockNavigate,
}));

/* helper responses */
const ok = (body) => ({
  ok: true,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});
const timeslots = [
  { day: "Monday", start: "09:00", end: "10:00" },
  { day: "Wednesday", start: "14:00", end: "15:00" },
];
/* fetch mock */
function makeFetch() {
  return jest.fn((url, { method = "GET", body } = {}) => {
    /* initial POST → timeslots */
    if (url.endsWith("/facilities/timeslots") && method === "POST") {
      return Promise.resolve(ok({ timeslots }));
    }
    /* PUT on add‑slot */
    if (url.endsWith("/facilities/fac1/timeslots") && method === "PUT") {
      return Promise.resolve(ok({ message: "updated" }));
    }
    /* DELETE */
    if (url.endsWith("/facilities/fac1/timeslots") && method === "DELETE") {
      return Promise.resolve(ok({ message: "deleted" }));
    }
    return Promise.resolve(ok({}));
  });
}

/* ─────────── tests ─────────── */
describe("StaffEditTimeSlots", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = () => render(<EditTimeSlots />);

  it("renders fetched slots by day", async () => {
    global.fetch = makeFetch();
    renderPage();

    expect(await screen.findByText("09:00 - 10:00")).toBeInTheDocument();
    expect(screen.getByText("14:00 - 15:00")).toBeInTheDocument();
  });

  it("adds a new slot and updates backend", async () => {
    global.fetch = makeFetch();
    renderPage();

    // click + on Tuesday
    const row = await screen
      .findByText("Tuesday")
      .then((el) => el.closest("tr"));
    fireEvent.click(within(row).getByAltText("Add slot"));

    // modal appears
    const modal = screen.getByText(/Add Time Slot for Tuesday/i).closest("div");
    fireEvent.change(within(modal).getByLabelText(/Start Time/i), {
      target: { value: "10:00" },
    });
    fireEvent.change(within(modal).getByLabelText(/End Time/i), {
      target: { value: "11:00" },
    });
    fireEvent.click(within(modal).getByText("Save Slot"));

    // toast + PUT called
    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith(
        "Timeslots updated successfully"
      )
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching("/facilities/fac1/timeslots"),
      expect.objectContaining({ method: "PUT" })
    );
    // new pill visible
    expect(screen.getByText("10:00 - 11:00")).toBeInTheDocument();
  });

  it("deletes a slot and updates backend", async () => {
    global.fetch = makeFetch();
    renderPage();

    const pill = await screen.findByText("09:00 - 10:00");
    fireEvent.click(within(pill).getByAltText("Delete"));

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith(
        "Timeslot deleted successfully"
      )
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching("/facilities/fac1/timeslots"),
      expect.objectContaining({ method: "DELETE" })
    );
    expect(screen.queryByText("09:00 - 10:00")).not.toBeInTheDocument();
  });

  it("back button navigates to facilities list", async () => {
    global.fetch = makeFetch();
    renderPage();

    fireEvent.click(await screen.findByText(/Back to Facilities/));
    expect(mockNavigate).toHaveBeenCalledWith("/staff-manage-facilities");
  });
});
