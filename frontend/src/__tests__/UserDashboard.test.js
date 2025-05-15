// src/__tests__/AdminDashboard.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminDashboard from "../pages/dashboards/AdminDashboard";

// ───── Sidebar stub ─────
jest.mock("../components/AdminSideBar.js", () => () => <aside>sidebar</aside>);

// ───── router stub ─────
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// ───── AuthContext stub ─────
jest.mock("../context/AuthContext.js", () => ({
  useAuth: () => ({ authUser: { name: "SuperAdmin" } }),
}));

// ───── firebase stub (inline auth) ─────
jest.mock("../firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn(() => Promise.resolve("JWT")),
    },
  },
  db: {},
}));

// ───── Firestore stubs ─────
jest.mock("firebase/firestore", () => ({
  collection: () => {},
  query: () => {},
  where: () => {},
  onSnapshot: () => () => {},
}));

// ───── jspdf + autotable stubs ─────
const mockSave = jest.fn();
const mockText = jest.fn();
const mockDoc = { save: mockSave, text: mockText };
jest.mock("jspdf", () => jest.fn(() => mockDoc));
jest.mock("jspdf-autotable", () => jest.fn());

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

describe("AdminDashboard", () => {
  const summary = { openCount: 5, closedCount: 7 };
  const summaryRes = { ok: true, json: () => Promise.resolve(summary) };
  const summaryErr = {
    ok: false,
    json: () => Promise.resolve({ message: "Fail" }),
  };

  const reports = [
    {
      facilityName: "Court A",
      description: "Light broken",
      status: "open",
      createdAt: "2025-01-01",
    },
    {
      facilityName: "Field B",
      description: "",
      status: "closed",
      createdAt: "2025-02-02",
    },
  ];
  const reportsRes = { ok: true, json: () => Promise.resolve({ reports }) };
  const reportsErr = {
    ok: false,
    json: () => Promise.resolve({ message: "Fetch fail" }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url) => {
      if (url.endsWith("/maintenance-summary"))
        return Promise.resolve(summaryRes);
      if (url.endsWith("/maintenance-reports"))
        return Promise.resolve(reportsRes);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it("renders username, summary and nav buttons", async () => {
    render(<AdminDashboard />);

    // username
    expect(screen.getByText("SuperAdmin")).toBeInTheDocument();

    // summary fetch
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/admin/maintenance-summary",
      expect.any(Object)
    );

    // wait for summary display
    await waitFor(() => {
      expect(screen.getByText("Open Issues: 5")).toBeInTheDocument();
      expect(screen.getByText("Closed Issues: 7")).toBeInTheDocument();
    });

    // navs
    fireEvent.click(screen.getByRole("button", { name: /View all/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/admin-manage-events");
    fireEvent.click(screen.getAllByRole("button", { name: /View all/i })[1]);
    expect(mockNavigate).toHaveBeenCalledWith("/admin-manage-users");
  });

  it("successfully exports PDF", async () => {
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: /Export as PDF/i }));

    // we should have fetched reports
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/admin/maintenance-reports",
      expect.any(Object)
    );

    // jsPDF constructor + text + autoTable + save
    await waitFor(() => expect(jsPDF).toHaveBeenCalled());
    expect(mockText).toHaveBeenCalledWith("Maintenance Report", 14, 15);
    expect(autoTable).toHaveBeenCalledWith(
      mockDoc,
      expect.objectContaining({
        head: [["Facility", "Description", "Status", "Created At"]],
        body: [
          ["Court A", "Light broken", "open", "2025-01-01"],
          ["Field B", "-", "closed", "2025-02-02"],
        ],
      })
    );
    expect(mockSave).toHaveBeenCalledWith("Maintenance_Report.pdf");
  });

  it("logs error when PDF export fails", async () => {
    console.error = jest.fn();
    // make reports fetch fail
    global.fetch = jest.fn((url) =>
      url.endsWith("/maintenance-reports")
        ? Promise.resolve(reportsErr)
        : Promise.resolve(summaryRes)
    );
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: /Export as PDF/i }));

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "PDF export error:",
        "Fetch fail"
      );
    });
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("no-ops export when no user", () => {
    // simulate no user
    const { auth } = require("../firebase");
    auth.currentUser = null;
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: /Export as PDF/i }));
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/maintenance-reports")
    );
  });

  it("warns when no user on mount", () => {
    console.warn = jest.fn();
    const { auth } = require("../firebase");
    auth.currentUser = null;
    render(<AdminDashboard />);
    expect(console.warn).toHaveBeenCalledWith(
      "No user is currently logged in."
    );
  });
});
