/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

/* ───────────────── mocks come first ────────────────── */

/* toast */
const mockToast = { success: jest.fn(), error: jest.fn() }; // ① create it
jest.mock("react-toastify", () => {
  return {
    toast: {
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

/* router */
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

/* sidebar */
jest.mock("../../../components/SideBar", () => () => (
  <aside data-testid="sidebar" />
));

/* firebase token helper */
jest.mock("../../../firebase", () => ({
  getAuthToken: jest.fn(() => Promise.resolve("FAKE_TOKEN")),
}));

/* static assets */
jest.mock("../../../assets/clock.png", () => "clock-img");
jest.mock("../../../assets/edit.png", () => "edit-img");
jest.mock("../../../assets/bin.png", () => "bin-img");

/* ───────────── component under test ──────────────── */
import ManageFacilities from "../StaffManageFacilities";

/* ───────────── helpers & setup ───────────────────── */

const flushPromises = () => new Promise((r) => setTimeout(r, 0));

/** build a fetch stub for every test */
const makeServer = () => {
  let facilities = [
    {
      id: "fac1",
      name: "Main Court",
      type: "Basketball",
      isOutdoors: "No",
      availability: "Available",
    },
    {
      id: "fac2",
      name: "Soccer Pitch",
      type: "Soccer",
      isOutdoors: "Yes",
      availability: "Closed",
    },
  ];

  return jest.spyOn(global, "fetch").mockImplementation((url, opts = {}) => {
    /* GET list (initial load) */
    if (url.endsWith("/staff-facilities") && opts.method === "GET") {
      return Promise.resolve(
        new Response(JSON.stringify({ facilities }), { status: 200 })
      );
    }

    /* POST create */
    if (url.endsWith("/upload") && opts.method === "POST") {
      const body = JSON.parse(opts.body);
      const newFac = {
        id: "server-" + Date.now(),
        ...body,
        isOutdoors: body.isOutdoors ? "Yes" : "No",
        availability: body.availability ?? "Available",
      };
      facilities.push(newFac);
      return Promise.resolve(
        new Response(JSON.stringify({ facility: newFac, message: "created" }), {
          status: 200,
        })
      );
    }

    /* PUT update */
    if (/\/updateFacility\/.+/.test(url) && opts.method === "PUT") {
      const body = JSON.parse(opts.body);
      facilities = facilities.map((f) =>
        f.id === body.id ? { ...f, ...body } : f
      );
      return Promise.resolve(
        new Response(JSON.stringify({ facility: body, message: "updated" }), {
          status: 200,
        })
      );
    }

    /* DELETE */
    if (opts.method === "DELETE") {
      const id = url.split("/").pop();
      facilities = facilities.filter((f) => f.id !== id);
      return Promise.resolve(new Response("{}", { status: 200 }));
    }

    return Promise.reject(new Error("unhandled fetch " + url));
  });
};

/* stub confirm so we can auto-accept */
beforeAll(() => {
  jest.spyOn(window, "confirm").mockImplementation(() => true);
});

/* reset between tests */
let fetchSpy;
beforeEach(() => {
  fetchSpy = makeServer();
  jest.clearAllMocks();
});
afterEach(() => fetchSpy.mockRestore());

/* shorthand render */
const renderPage = () => render(<ManageFacilities />);

/* ─────────────────────── tests ─────────────────────── */

describe("Staff – ManageFacilities page", () => {
  test("loads & lists facilities (GET)", async () => {
    renderPage();
    expect(await screen.findByText("Main Court")).toBeInTheDocument();
    expect(screen.getByText("Soccer Pitch")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching("/staff-facilities"),
      expect.objectContaining({ method: "GET" })
    );
  });

  test("navigates to timeslot page when clock icon clicked", async () => {
    renderPage();
    const row = await screen.findByText("Main Court");
    await userEvent.click(
      within(row.closest("tr")).getByRole("img", { name: /timeslots/i })
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      "/staff-edit-time-slots/fac1",
      expect.any(Object)
    );
  });

  test("adds a new blank row, saves, & issues POST", async () => {
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: /add new facility/i })
    );

    // fill the inputs in the new (last) row
    const rows = screen.getAllByRole("row");
    const lastRowCells = within(rows[rows.length - 1]);
    await userEvent.type(
      lastRowCells.getByPlaceholderText(/facility name/i),
      "Tennis Court"
    );
    await userEvent.type(lastRowCells.getByPlaceholderText(/type/i), "Tennis");

    await userEvent.click(lastRowCells.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching("/upload"),
        expect.objectContaining({ method: "POST" })
      )
    );
    // after save the editable inputs disappear
    expect(screen.getByText("Tennis Court")).toBeInTheDocument();
  });

  test("edit existing row → save issues PUT", async () => {
    renderPage();
    // click pencil on first row
    await userEvent.click(
      within(await screen.findByText("Main Court").closest("tr")).getByRole(
        "img",
        {
          name: /edit/i,
        }
      )
    );
    const nameInput = screen.getByDisplayValue("Main Court");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Court A");
    await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching("/updateFacility/"),
        expect.objectContaining({ method: "PUT" })
      )
    );
    expect(await screen.findByText("Court A")).toBeInTheDocument();
    expect(mockToast.success).toHaveBeenCalled();
  });

  test("cancel on new row removes it", async () => {
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: /add new facility/i })
    );
    const rowsBefore = screen.getAllByRole("row").length;
    // cancel on that row
    const lastRowCells = within(screen.getAllByRole("row").pop());
    await userEvent.click(
      lastRowCells.getByRole("button", { name: /cancel/i })
    );
    expect(screen.getAllByRole("row").length).toBe(rowsBefore - 1);
  });

  test("delete icon confirms & sends DELETE", async () => {
    renderPage();
    const soccerRow = await screen.findByText("Soccer Pitch");
    await userEvent.click(
      within(soccerRow.closest("tr")).getByRole("img", { name: /delete/i })
    );

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching("/facilities/fac2"),
        expect.objectContaining({ method: "DELETE" })
      )
    );
    expect(soccerRow).not.toBeInTheDocument();
  });
});
