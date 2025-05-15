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

// ───── hoisted Firebase mock ─────
let _mockGetIdToken;
let _mockAuth;
jest.mock("../firebase", () => {
  // initialize the mock user and token generator
  _mockGetIdToken = jest.fn(() => Promise.resolve("JWT"));
  _mockAuth = { currentUser: { getIdToken: _mockGetIdToken } };
  return { auth: _mockAuth, db: {} };
});

// ───── Firestore stubs ─────
jest.mock("firebase/firestore", () => ({
  collection: () => {},
  query: () => {},
  where: () => {},
  onSnapshot: () => () => {},
}));

// ───── jsPDF + autoTable stubs ─────
const mockSave = jest.fn();
const mockText = jest.fn();
const mockDoc = { save: mockSave, text: mockText };
jest.mock("jspdf", () => {
  return jest.fn(() => mockDoc);
});
import jsPDF from "jspdf";

jest.mock("jspdf-autotable", () => jest.fn());
import autoTable from "jspdf-autotable";

describe("AdminDashboard", () => {
  const summaryOk = { openCount: 5, closedCount: 7 };
  const summaryRes = { ok: true, json: () => Promise.resolve(summaryOk) };
  const summaryFail = {
    ok: false,
    json: () => Promise.resolve({ message: "Summary failed" }),
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
  const reportsOk = { ok: true, json: () => Promise.resolve({ reports }) };
  const reportsFail = {
    ok: false,
    json: () => Promise.resolve({ message: "Fetch failed" }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // default fetch: summary then reports
    global.fetch = jest.fn((url) => {
      if (url.endsWith("/maintenance-summary"))
        return Promise.resolve(summaryRes);
      if (url.endsWith("/maintenance-reports"))
        return Promise.resolve(reportsOk);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it("renders user, shows summary and nav buttons", async () => {
    render(<AdminDashboard />);

    // display username
    expect(screen.getByText("SuperAdmin")).toBeInTheDocument();

    // initial summary fetch
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/admin/maintenance-summary",
      expect.objectContaining({
        headers: { Authorization: "Bearer JWT" },
      })
    );

    // wait for summary to appear
    await waitFor(() => {
      expect(screen.getByText("Open Issues: 5")).toBeInTheDocument();
      expect(screen.getByText("Closed Issues: 7")).toBeInTheDocument();
    });

    // navigation
    fireEvent.click(screen.getByRole("button", { name: /View all/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/admin-manage-events");

    fireEvent.click(screen.getAllByRole("button", { name: /View all/i })[1]);
    expect(mockNavigate).toHaveBeenCalledWith("/admin-manage-users");
  });

  it("exports maintenance PDF on success", async () => {
    render(<AdminDashboard />);

    // click export
    fireEvent.click(screen.getByRole("button", { name: /Export as PDF/i }));

    // reports fetch
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/admin/maintenance-reports",
      expect.objectContaining({
        headers: { Authorization: "Bearer JWT" },
      })
    );

    // wait for jsPDF usage
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

  it("logs an error when PDF export fetch fails", async () => {
    console.error = jest.fn();
    // override only the reports endpoint to fail
    global.fetch = jest.fn((url) =>
      url.endsWith("/maintenance-reports")
        ? Promise.resolve(reportsFail)
        : Promise.resolve(summaryRes)
    );

    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: /Export as PDF/i }));

    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "PDF export error:",
        "Fetch failed"
      )
    );
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("no-ops PDF export when no user is logged in", () => {
    _mockAuth.currentUser = null;
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: /Export as PDF/i }));
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("maintenance-reports")
    );
  });

  it("warns once on mount if no user for token effect", () => {
    console.warn = jest.fn();
    _mockAuth.currentUser = null;
    render(<AdminDashboard />);
    expect(console.warn).toHaveBeenCalledWith(
      "No user is currently logged in."
    );
  });
});
