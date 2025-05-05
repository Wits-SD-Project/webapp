/* eslint-disable testing-library/no-node-access */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResMaintenance from "../pages/dashboards/ResMaintenance";

/* ───────── component & sidebar ───────── */
jest.mock("../components/ResSideBar.js", () => () => <aside>sidebar</aside>);

/* ───────── firebase‑auth mock (truly fixed) ───────── */
jest.mock("firebase/auth", () => {
  // define inside the factory so it exists when the factory runs
  const user = { uid: "u1", email: "user@example.com" };
  return { getAuth: () => ({ currentUser: user }) };
});

/* ───────── toast mock ───────── */
jest.mock("react-toastify", () => {
  const toast = { success: jest.fn(), error: jest.fn() };
  return { toast };
});
import { toast as mockToast } from "react-toastify";

/* ───────── Firestore mocks ───────── */
const mockAddDoc = jest.fn(() => Promise.resolve({ id: "rep1" }));

let getDocsCall = 0;
const facilityDocs = [
  { id: "fac1", data: () => ({ name: "Gym", created_by: "staff1" }) },
];
const emptySnap = { docs: [], forEach: jest.fn() };
const reportSnap = {
  docs: [
    {
      id: "rep1",
      data: () => ({
        facilityName: "Gym",
        description: "Broken treadmill",
        status: "opened",
        createdAt: new Date("2025‑05‑05T08:00Z"),
      }),
    },
  ],
  forEach: jest.fn(),
};

const mockGetDocs = jest.fn(() => {
  getDocsCall += 1;
  if (getDocsCall === 1) return Promise.resolve({ docs: facilityDocs });
  if (getDocsCall === 2) return Promise.resolve(emptySnap);
  return Promise.resolve(reportSnap);
});

jest.mock("firebase/firestore", () => {
  const db = { type: "firestore-db-mock" };
  return {
    /* DB accessor */
    getFirestore: () => db,

    /* builder helpers */
    collection: (...path) => path.join("/"),
    query: (...args) => args,
    where: (...args) => args,

    /* data funcs */
    getDocs: (...args) => mockGetDocs(...args),
    addDoc: (...args) => mockAddDoc(...args),
  };
});

/* ───────── helpers ───────── */
const renderPage = () => render(<ResMaintenance />);

/* ───────── tests ───────── */
describe("Resident maintenance page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDocsCall = 0;
    jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  test("loads facilities and shows empty‑state", async () => {
    renderPage();
    expect(
      await screen.findByRole("option", { name: "Gym" })
    ).toBeInTheDocument();
    expect(screen.getByText(/no maintenance reports yet/i)).toBeInTheDocument();
  });

  test("submits a report, addDoc called, table refreshes", async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText(/Facility/i), {
      target: { value: "fac1" },
    });
    fireEvent.change(screen.getByLabelText(/Issue Description/i), {
      target: { value: "Broken treadmill" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Submit Report/i }));

    await waitFor(() =>
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          facilityId: "fac1",
          description: "Broken treadmill",
        })
      )
    );
    expect(
      screen.getByRole("cell", { name: "Broken treadmill" })
    ).toBeInTheDocument();
  });

  test("search box filters the reports table", async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText(/Facility/i), {
      target: { value: "fac1" },
    });
    fireEvent.change(screen.getByLabelText(/Issue Description/i), {
      target: { value: "Broken treadmill" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Submit Report/i }));
    await screen.findByText("Broken treadmill");

    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "opened" },
    });
    expect(screen.getByText("Broken treadmill")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "xyz" },
    });
    expect(screen.queryByText("Broken treadmill")).not.toBeInTheDocument();
  });

  test("shows alert when form fields missing", async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: /Submit Report/i })
    );
    expect(window.alert).toHaveBeenCalledWith(
      "Please select a facility and describe the issue"
    );
  });
});
