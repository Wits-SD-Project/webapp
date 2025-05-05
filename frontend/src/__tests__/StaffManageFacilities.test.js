//  src/__tests__/StaffManageFacilities.test.js
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import ManageFacilities from "../pages/dashboards/StaffManageFacilities";

/* ───────────────────────────── component stubs ─────────────────────── */
jest.mock("../components/StaffSideBar.js", () => () => <aside>sidebar</aside>);

// toast spies
jest.mock("react-toastify", () => {
  const toast = { success: jest.fn(), error: jest.fn() };
  return { toast };
});
import { toast as mockToast } from "react-toastify";

// modal stub – exposes its open/close via a test‑id
const mockOnSubmit = jest.fn();
jest.mock(
  "../pages/dashboards/FalicityFormModal",
  () =>
    ({ open, onClose, onSubmit }) =>
      open ? (
        <div data-testid="modal">
          <button onClick={() => onSubmit({ name: "Tmp" })}>submit‑stub</button>
          <button onClick={onClose}>close‑stub</button>
        </div>
      ) : null
);

// firebase token
jest.mock("../firebase", () => ({
  getAuthToken: () => Promise.resolve("TEST_TOKEN"),
}));

// static assets → strings
jest.mock("../assets/clock.png", () => "clock.png");
jest.mock("../assets/edit.png", () => "edit.png");
jest.mock("../assets/bin.png", () => "bin.png");

// react‑router navigate spy
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

/* ───────────────────────── mock data & helpers ─────────────────────── */
const facilities = [
  {
    id: "fac1",
    name: "Court 1",
    type: "Tennis",
    isOutdoors: "Yes",
    availability: "Available",
  },
  {
    id: "fac2",
    name: "Pool",
    type: "Swimming",
    isOutdoors: "No",
    availability: "Closed",
  },
];

const ok = (body) => ({
  ok: true,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});
const err = (msg) => ({
  ok: false,
  json: () => Promise.resolve({ error: msg }),
  text: () => Promise.resolve(msg),
});

/**
 * Build a fetch mock with optional first‑call failure
 */
const makeFetch = ({ failFirst = false } = {}) =>
  jest.fn((url, { method = "GET", body } = {}) => {
    /* ───── initial GET ───── */
    if (url.endsWith("/staff-facilities") && method === "GET") {
      return Promise.resolve(failFirst ? err("boom") : ok({ facilities }));
    }

    /* ───── PUT update ───── */
    if (url.includes("/updateFacility/") && method === "PUT") {
      const id = url.split("/").pop();
      const incoming = JSON.parse(body);
      return Promise.resolve(
        ok({ message: "updated", facility: { id, ...incoming } })
      );
    }

    /* ───── POST create (modal stub) ───── */
    if (url.endsWith("/facilities/upload") && method === "POST") {
      const incoming = JSON.parse(body);
      return Promise.resolve(
        ok({
          message: "created",
          facility: { id: "facX", ...incoming },
        })
      );
    }

    /* ───── DELETE ───── */
    if (url.endsWith("/facilities/fac2") && method === "DELETE") {
      return Promise.resolve(ok({ message: "deleted" }));
    }

    return Promise.resolve(err("bad"));
  });

/* ───────────────────────────── specs ───────────────────────────────── */
describe("StaffManageFacilities dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = () => render(<ManageFacilities />);

  test("renders list with status pills", async () => {
    global.fetch = makeFetch();
    renderPage();

    expect(await screen.findByText("Court 1")).toBeInTheDocument();
    expect(screen.getByText("Pool")).toBeInTheDocument();
    expect(screen.getByText("Available")).toHaveClass("status available");
    expect(screen.getByText("Closed")).toHaveClass("status closed");
  });

  test("edit → cancel restores original values", async () => {
    global.fetch = makeFetch();
    renderPage();

    const row = await screen
      .findByText("Court 1")
      .then((el) => el.closest("tr"));
    fireEvent.click(within(row).getByAltText("edit"));

    const typeInput = within(row).getByDisplayValue("Tennis");
    fireEvent.change(typeInput, { target: { value: "Padel" } });

    fireEvent.click(within(row).getByText("Cancel"));

    expect(screen.getByText("Tennis")).toBeInTheDocument(); // rolled back
    expect(screen.queryByText("Padel")).not.toBeInTheDocument();
  });

  test("edit → save issues PUT and shows success toast", async () => {
    global.fetch = makeFetch();
    renderPage();

    const row = await screen
      .findByText("Court 1")
      .then((el) => el.closest("tr"));
    fireEvent.click(within(row).getByAltText("edit"));

    fireEvent.change(within(row).getByDisplayValue("Court 1"), {
      target: { value: "Center Court" },
    });
    fireEvent.click(within(row).getByText("Save"));

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith("updated")
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching("/updateFacility/fac1"),
      expect.objectContaining({ method: "PUT" })
    );
    expect(screen.getByText("Center Court")).toBeInTheDocument();
  });

  test("delete confirms then removes row & toasts", async () => {
    global.fetch = makeFetch();
    jest.spyOn(window, "confirm").mockImplementation(() => true);

    renderPage();
    const row = await screen.findByText("Pool").then((el) => el.closest("tr"));
    fireEvent.click(within(row).getByAltText("delete"));

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith(
        "Facility deleted successfully"
      )
    );
    expect(screen.queryByText("Pool")).not.toBeInTheDocument();
  });

  test("🕒 timeslot icon navigates with correct params", async () => {
    global.fetch = makeFetch();
    renderPage();

    const row = await screen
      .findByText("Court 1")
      .then((el) => el.closest("tr"));
    fireEvent.click(within(row).getByAltText("timeslots"));

    expect(mockNavigate).toHaveBeenCalledWith("/staff-edit-time-slots/fac1", {
      state: { facilityName: "Court 1" },
    });
  });

  test("Add New Facility button opens modal and POSTs on submit", async () => {
    global.fetch = makeFetch();
    renderPage();

    fireEvent.click(screen.getByText("Add New Facility"));
    expect(screen.getByTestId("modal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("submit‑stub")); // stubbed modal submit

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith("Facility created")
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching("/facilities/upload"),
      expect.objectContaining({ method: "POST" })
    );
  });

  test("initial fetch failure shows toast.error", async () => {
    global.fetch = makeFetch({ failFirst: true });
    renderPage();

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load facilities")
      )
    );
  });
});
