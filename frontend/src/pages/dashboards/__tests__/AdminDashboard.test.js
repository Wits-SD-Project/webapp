/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

/* ──────────── global mocks ──────────── */

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

/* strip-down Navbar to keep DOM small */
jest.mock("../../../components/Navbar", () => () => (
  <nav data-testid="navbar" />
));

/* MUI is already JSDOM-compatible; no mock needed */

/* ─────────── component ─────────── */
import AdminDashboard from "../AdminDashboard";

/* ─────────── helpers ─────────── */

const flush = () => new Promise((r) => setTimeout(r, 0));

/**
 * Creates a spy on global.fetch with rudimentary
 * in-memory “DB” + endpoints used in the page.
 */
const createFetchStub = () => {
  let users = [
    {
      email: "alice@example.com",
      role: "staff",
      approved: false,
      accepted: false,
    },
    {
      email: "bob@example.com",
      role: "resident",
      approved: true,
      accepted: true,
    },
  ];

  return jest.spyOn(global, "fetch").mockImplementation((url, opts = {}) => {
    /* ---------- GET all ---------- */
    if (
      url.endsWith("/api/admin/users") &&
      (!opts.method || opts.method === "GET")
    ) {
      return Promise.resolve(
        new Response(JSON.stringify(users), { status: 200 })
      );
    }

    /* ---------- POST toggle-approval ---------- */
    if (url.includes("/toggle-approval") && opts.method === "POST") {
      const { email } = JSON.parse(opts.body);
      users = users.map((u) =>
        u.email === email ? { ...u, approved: !u.approved } : u
      );
      const changed = users.find((u) => u.email === email);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            approved: changed.approved,
            message: "toggled approval",
          }),
          { status: 200 }
        )
      );
    }

    /* ---------- POST toggle-accepted ---------- */
    if (url.includes("/toggle-accepted") && opts.method === "POST") {
      const { email } = JSON.parse(opts.body);
      users = users.map((u) =>
        u.email === email ? { ...u, accepted: !u.accepted } : u
      );
      const changed = users.find((u) => u.email === email);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            accepted: changed.accepted,
            message: "toggled accepted",
          }),
          { status: 200 }
        )
      );
    }

    return Promise.reject(new Error("Unhandled fetch: " + url));
  });
};

/* ─────────── tests ─────────── */

describe("AdminDashboard", () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = createFetchStub();
    jest.clearAllMocks();
  });

  afterEach(() => fetchSpy.mockRestore());

  const renderPage = () => render(<AdminDashboard />);

  test("loads and lists users (GET)", async () => {
    renderPage();

    expect(await screen.findByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching("/api/admin/users"),
      expect.any(Object)
    );
  });

  test("approval button toggles state & issues POST", async () => {
    const user = userEvent.setup();
    renderPage();

    /* alice is initially unapproved -> button should read 'Approve' */
    const aliceRow = await screen.findByText("alice@example.com");
    const approveBtn = within(aliceRow.closest("tr")).getByRole("button", {
      name: /approve/i,
    });
    expect(approveBtn).toBeEnabled();

    await user.click(approveBtn);

    /* POST issued */
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching("/toggle-approval"),
        expect.objectContaining({ method: "POST" })
      )
    );

    /* UI updated to Yes + button text changes */
    expect(within(aliceRow.closest("tr")).getByText("Yes")).toBeInTheDocument();
    expect(
      within(aliceRow.closest("tr")).getByRole("button", { name: /revoke/i })
    ).toBeInTheDocument();

    expect(mockToast.success).toHaveBeenCalled();
  });

  test("grant access button disabled until approved, then works", async () => {
    const user = userEvent.setup();
    renderPage();

    /* alice row again */
    const aliceRow = await screen.findByText("alice@example.com");
    const approveBtn = within(aliceRow.closest("tr")).getByRole("button", {
      name: /approve/i,
    });
    const accessBtnInitial = within(aliceRow.closest("tr")).getByRole(
      "button",
      { name: /grant access/i }
    );

    expect(accessBtnInitial).toBeDisabled();

    /* approve first */
    await user.click(approveBtn);
    await flush(); // wait for state

    const accessBtn = within(aliceRow.closest("tr")).getByRole("button", {
      name: /grant access/i,
    });
    expect(accessBtn).toBeEnabled();

    await user.click(accessBtn);

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching("/toggle-accepted"),
        expect.objectContaining({ method: "POST" })
      )
    );

    /* cell should now say Yes */
    const acceptedCell = within(aliceRow.closest("tr")).getAllByText("Yes")[1]; // second Yes is accepted
    expect(acceptedCell).toBeInTheDocument();
  });

  test("revoke access toggles back & toast shown", async () => {
    const user = userEvent.setup();
    renderPage();

    /* bob already has access */
    const bobRow = await screen.findByText("bob@example.com");
    const revokeAccessBtn = within(bobRow.closest("tr")).getByRole("button", {
      name: /revoke access/i,
    });

    await user.click(revokeAccessBtn);

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching("/toggle-accepted"),
        expect.objectContaining({ method: "POST" })
      )
    );

    /* accepted cell now 'No' */
    expect(
      within(bobRow.closest("tr")).getAllByText("No")[1]
    ).toBeInTheDocument();
    expect(mockToast.success).toHaveBeenCalled();
  });
});
