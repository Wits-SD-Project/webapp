/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

/* ────────────────  mocks come first!  ───────────────── */

/* 🔸 toast -------------------------------------------------- */
const mockToast = { success: jest.fn(), error: jest.fn() }; // ① create it
jest.mock("react-toastify", () => {
  return {
    toast: {
      success: jest.fn(),
      error: jest.fn(),
    },
  };
});

/* 🔸 router ------------------------------------------------- */
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  /* only the hooks we use */
  useParams: () => ({ id: "fac-123" }),
  useNavigate: () => mockNavigate,
}));

/* 🔸 sidebar ------------------------------------------------ */
jest.mock("../../../components/SideBar", () => () => (
  <aside data-testid="sidebar" />
));

/* 🔸 firebase wrapper -------------------------------------- */
jest.mock("../../../firebase", () => ({
  getAuthToken: jest.fn(() => Promise.resolve("FAKE_TOKEN")),
}));

/* 🔸 static assets ----------------------------------------- */
jest.mock("../../../assets/add.png", () => "add-icon");
jest.mock("../../../assets/bin.png", () => "bin-icon");

/* ────────────────  now import the component  ────────────── */
import EditTimeSlots from "../StaffEditTimeSlots";

/* ────────────────  helpers & set-up  ────────────────────── */

const mockFetch = (impl) =>
  jest.spyOn(global, "fetch").mockImplementation(impl);

const flushPromises = () => new Promise(setImmediate);

let serverSlots;
beforeEach(() => {
  jest.clearAllMocks();

  serverSlots = [
    { day: "Monday", start: "10:00", end: "11:00" },
    { day: "Wednesday", start: "12:00", end: "13:00" },
  ];

  mockFetch((url, opts = {}) => {
    if (url.endsWith("/timeslots") && opts.method === "POST") {
      return Promise.resolve(
        new Response(JSON.stringify({ timeslots: serverSlots }), {
          status: 200,
        })
      );
    }
    if (opts.method === "PUT") {
      const body = JSON.parse(opts.body);
      serverSlots = Object.entries(body.timeslots).flatMap(([day, arr]) =>
        arr.map((s) => {
          const [start, end] = s.split(" - ");
          return { day, start, end };
        })
      );
      return Promise.resolve(new Response("{}", { status: 200 }));
    }
    if (opts.method === "DELETE") {
      const { day, start, end } = JSON.parse(opts.body);
      serverSlots = serverSlots.filter(
        (s) => !(s.day === day && s.start === start && s.end === end)
      );
      return Promise.resolve(new Response("{}", { status: 200 }));
    }
    return Promise.reject(new Error("unhandled fetch"));
  });
});

afterEach(() => global.fetch.mockRestore());

const renderPage = () => render(<EditTimeSlots />);

/* ─────────────────────────── tests ─────────────────────────── */

describe("Staff – EditTimeSlots page", () => {
  test("initial fetch fills Monday & Wednesday rows", async () => {
    renderPage();
    expect(await screen.findByText("10:00 - 11:00")).toBeInTheDocument();
    expect(screen.getByText("12:00 - 13:00")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toMatch("/timeslots");
  });

  test("adding a valid slot calls PUT & updates UI", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(screen.getByText("Tuesday").closest("tr")).getByRole("img", {
        name: /add slot/i,
      })
    );

    const startInput = screen.getByLabelText(/start time/i);
    const endInput = screen.getByLabelText(/end time/i);
    await user.type(startInput, "10:30");
    await user.type(endInput, "11:30");
    await user.click(screen.getByRole("button", { name: /save slot/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringMatching("/facilities/.+/timeslots"),
        expect.objectContaining({ method: "PUT" })
      )
    );
    expect(await screen.findByText("09:00 - 10:00")).toBeInTheDocument();
  });

  test("duplicate slot shows toast.error & no PUT", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(screen.getByText("Monday").closest("tr")).getByRole("img", {
        name: /add slot/i,
      })
    );
    const startInput = screen.getByLabelText(/start time/i);
    const endInput = screen.getByLabelText(/end time/i);
    await user.type(startInput, "10:30");
    await user.type(endInput, "11:30");

    await user.click(screen.getByRole("button", { name: /save slot/i }));

    await flushPromises();
    expect(mockToast.error).toHaveBeenCalledWith("This slot already exists");
    expect(global.fetch).toHaveBeenCalledTimes(1); // only initial POST
  });

  test("overlapping slot shows toast.error & no PUT", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      within(screen.getByText("Monday").closest("tr")).getByRole("img", {
        name: /add slot/i,
      })
    );
    const startInput = screen.getByLabelText(/start time/i);
    const endInput = screen.getByLabelText(/end time/i);
    await user.type(startInput, "10:30");
    await user.type(endInput, "11:30");
    await user.click(screen.getByRole("button", { name: /save slot/i }));

    await flushPromises();
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining("Overlaps with existing slot")
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("delete icon removes pill & issues DELETE", async () => {
    const user = userEvent.setup();
    renderPage();

    const pill = await screen.findByText("10:00 - 11:00");
    await user.click(within(pill).getByRole("img", { name: /delete/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching("/facilities/.+/timeslots"),
        expect.objectContaining({ method: "DELETE" })
      )
    );
    expect(pill).not.toBeInTheDocument();
  });

  test("back button navigates to Manage-Facilities page", async () => {
    renderPage();
    await userEvent.click(
      await screen.findByRole("button", { name: /back to facilities/i })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/staff-manage-facilities");
  });
});
