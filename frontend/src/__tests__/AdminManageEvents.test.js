/* eslint-disable testing-library/no-node-access */
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import AdminManageEvents from "../pages/dashboards/AdminManageEvents";

/* ───────────── component + asset stubs ───────────── */
jest.mock("../components/AdminSideBar.js", () => () => <aside>sidebar</aside>);
jest.mock("../assets/edit.png", () => "edit.png");
jest.mock("../assets/bin.png", () => "bin.png");

/* toast spies */
jest.mock("react-toastify", () => {
  const toast = { success: jest.fn(), error: jest.fn() };
  return { toast };
});
import { toast as mockToast } from "react-toastify";

/* firebase token */
jest.mock("../firebase", () => ({
  getAuthToken: () => Promise.resolve("TEST_TOKEN"),
  db: {}, // dummy db for firestore
}));

/* Firestore functions (addDoc, getDocs, query, collection, where) */
const mockAddDoc = jest.fn(() => Promise.resolve());
const mockGetDocs = jest.fn(() =>
  Promise.resolve({
    forEach: (cb) =>
      [
        { data: () => ({ email: "res1@example.com", role: "resident" }) },
        { data: () => ({ email: "res2@example.com", role: "resident" }) },
      ].forEach((d) => cb(d)),
  })
);
jest.mock("firebase/firestore", () => ({
  addDoc: (...args) => mockAddDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  collection: (...args) => args,
  query: (...args) => args,
  where: (...args) => args,
}));

/* helpers to craft Response‑likes */
const ok = (body) => ({
  ok: true,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(JSON.stringify(body)),
});
const err = (msg) => ({
  ok: false,
  json: () => Promise.resolve({ message: msg }),
  text: () => Promise.resolve(msg),
});

/* mock data */
const facilities = [{ id: "fac1", name: "Hall A" }];
const events = [
  {
    id: "evt1",
    eventName: "Fair",
    facility: { id: "fac1", name: "Hall A" },
    description: "Career fair",
    startTime: new Date("2025-05-01T08:00Z").toISOString(),
    endTime: new Date("2025-05-01T10:00Z").toISOString(),
  },
];

/* build fetch mock */
function makeFetch({ failFacilities = false } = {}) {
  return jest.fn((url, { method = "GET", body } = {}) => {
    /* facilities */
    if (url.includes("/admin/facilities") && method === "GET") {
      return Promise.resolve(
        failFacilities ? err("boom") : ok({ success: true, facilities })
      );
    }
    /* events list */
    if (url.includes("/admin/events") && method === "GET") {
      return Promise.resolve(ok({ events }));
    }
    /* create */
    if (url.endsWith("/admin/events") && method === "POST") {
      const incoming = JSON.parse(body);
      return Promise.resolve(
        ok({
          message: "created",
          event: { ...incoming, id: "evtX", facility: facilities[0] },
        })
      );
    }
    /* update */
    if (url.includes("/admin/events/evt1") && method === "PUT") {
      const incoming = JSON.parse(body);
      return Promise.resolve(
        ok({
          message: "updated",
          event: { ...incoming, id: "evt1", facility: facilities[0] },
        })
      );
    }
    /* delete */
    if (url.includes("/admin/events/evt1") && method === "DELETE") {
      return Promise.resolve(ok({ message: "deleted" }));
    }
    return Promise.resolve(err("unknown"));
  });
}

/* ───────────────────────────── specs ──────────────────────────────── */
describe("AdminManageEvents dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, "confirm").mockImplementation(() => true);
  });

  const renderPage = () => render(<AdminManageEvents />);

  test("renders events table with data", async () => {
    global.fetch = makeFetch();
    renderPage();
    expect(await screen.findByText("Fair")).toBeInTheDocument();
    expect(screen.getByText("Hall A")).toBeInTheDocument();
    expect(screen.getByText("Career fair")).toBeInTheDocument();
  });

  test("Add New Event → cancel rolls back row", async () => {
    global.fetch = makeFetch();
    renderPage();

    fireEvent.click(await screen.findByText("Add New Event"));
    const newRow = screen.getAllByRole("row").pop();
    expect(
      within(newRow).getByPlaceholderText("Event Name")
    ).toBeInTheDocument();

    fireEvent.click(within(newRow).getByText("Cancel"));
    expect(screen.queryByPlaceholderText("Event Name")).not.toBeInTheDocument();
  });

  test("Add New Event → save triggers POST + success toast", async () => {
    global.fetch = makeFetch();
    renderPage();

    fireEvent.click(await screen.findByText("Add New Event"));
    const newRow = screen.getAllByRole("row").pop();

    fireEvent.change(within(newRow).getByPlaceholderText("Event Name"), {
      target: { value: "Expo" },
    });
    fireEvent.change(within(newRow).getByPlaceholderText("Event Description"), {
      target: { value: "Big expo" },
    });

    // choose facility
    const select = within(newRow).getByRole("combobox");
    fireEvent.change(select, { target: { value: "fac1" } });

    fireEvent.click(within(newRow).getByText("Save"));

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith("created")
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching("/admin/events"),
      expect.objectContaining({ method: "POST" })
    );
    expect(screen.getByText("Expo")).toBeInTheDocument();
    expect(mockAddDoc).toHaveBeenCalled(); // notification loop
  });

  test("edit existing event → save triggers PUT", async () => {
    global.fetch = makeFetch();
    renderPage();

    const row = await screen.findByText("Fair").then((el) => el.closest("tr"));

    fireEvent.click(within(row).getByAltText("edit"));
    fireEvent.change(within(row).getByDisplayValue("Fair"), {
      target: { value: "Job Fair" },
    });
    fireEvent.click(within(row).getByText("Save"));

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith("updated")
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching("/admin/events/evt1"),
      expect.objectContaining({ method: "PUT" })
    );
    expect(screen.getByText("Job Fair")).toBeInTheDocument();
  });

  test("delete existing event removes row and toasts", async () => {
    global.fetch = makeFetch();
    renderPage();

    const row = await screen.findByText("Fair").then((el) => el.closest("tr"));
    fireEvent.click(within(row).getByAltText("delete"));

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith("deleted")
    );
    expect(screen.queryByText("Fair")).not.toBeInTheDocument();
  });

  test("Block Time Slot row toggles visibility", async () => {
    global.fetch = makeFetch();
    renderPage();

    fireEvent.click(await screen.findByText("Block Time Slot"));
    expect(screen.getByText(/block/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() =>
      expect(screen.queryByText(/block/)).not.toBeInTheDocument()
    );
  });

  test("facilities fetch error logs to console", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = makeFetch({ failFacilities: true });

    renderPage();

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to fetch facilities:"),
        expect.any(Error)
      )
    );
    spy.mockRestore();
  });
});
