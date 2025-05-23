// src/__tests__/AdminManageUsers.test.js
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";

/* ——— stub sidebar ——— */
jest.mock("../../components/AdminSideBar.js", () => () => (
  <aside>sidebar</aside>
));

/* ——— stub toast ——— */
const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("react-toastify", () => ({ toast: mockToast }));

/* ——— component import (works whether transpiled or raw) ——— */
import Mod from "../../pages/dashboards/AdminManageUsers";
const AdminManageUsers = Mod.default ?? Mod;

/* ——— helpers ——— */
const jsonText = (obj) => JSON.stringify(obj);

/** create a Response‑like stub that AdminManageUsers expects */
const makeRes = ({ ok = true, body }) => ({
  ok,
  statusText: ok ? "OK" : "Bad",
  text: () => Promise.resolve(body),
});

describe("AdminManageUsers", () => {
  afterEach(() => jest.clearAllMocks());

  const usersFixture = [
    {
      email: "ann@example.com",
      role: "resident",
      approved: false,
      accepted: false,
    },
    {
      email: "bob@example.com",
      role: "staff",
      approved: true,
      accepted: false,
    },
  ];

  const setupFetch = (handlers) =>
    (global.fetch = jest.fn((url, opts = {}) => {
      const key =
        (opts.method ? opts.method + " " : "") +
        url.replace(`${process.env.REACT_APP_API_BASE_URL}/api/`, "");
      return handlers[key]();
    }));

  test("empty‑state when no users returned", async () => {
    setupFetch({
      "admin/users": () => makeRes({ body: jsonText([]) }),
    });

    render(<AdminManageUsers />);

    expect(await screen.findByText(/No users found\./i)).toBeInTheDocument();
  });

  test("renders rows, toggles approval and access, disables button pre‑approval", async () => {
    /* -------- initial GET + subsequent POST replies -------- */
    setupFetch({
      "admin/users": () => makeRes({ body: jsonText(usersFixture) }),
      "POST admin/toggle-approval": () =>
        makeRes({ body: jsonText({ approved: true, message: "approved" }) }),
      "POST admin/toggle-accepted": () =>
        makeRes({ body: jsonText({ accepted: true, message: "accepted" }) }),
    });

    render(<AdminManageUsers />);

    /* wait for rows */
    const rows = await screen.findAllByRole("row");
    expect(rows).toHaveLength(3); // header + 2 users

    const annRow = rows[1];
    const bobRow = rows[2];

    // ----- Ann: not approved, buttons -----
    expect(within(annRow).getByText("No")).toBeInTheDocument();
    const annApproveBtn = within(annRow).getByRole("button", {
      name: /approve/i,
    });
    const annAccessBtn = within(annRow).getByRole("button", {
      name: /grant access/i,
    });
    expect(annAccessBtn).toBeDisabled();

    // click "Approve"
    fireEvent.click(annApproveBtn);

    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith("approved")
    );
    expect(within(annRow).getByText("Yes")).toBeInTheDocument();
    expect(annAccessBtn).not.toBeDisabled(); // now enabled

    // click "Grant access"
    fireEvent.click(annAccessBtn);
    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith("accepted")
    );
    expect(within(annRow).getAllByText("Yes")).toHaveLength(2);

    // ----- Bob: already approved, grant access -----
    expect(within(bobRow).getByText("Yes")).toBeInTheDocument(); // approved
    const bobAccessBtn = within(bobRow).getByRole("button", {
      name: /grant access/i,
    });
    expect(bobAccessBtn).not.toBeDisabled();

    fireEvent.click(bobAccessBtn);
    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith("accepted")
    );
    expect(within(bobRow).getAllByText("Yes")).toHaveLength(2);
  });

  test("initial fetch error branch shows toast.error", async () => {
    setupFetch({
      "admin/users": () => makeRes({ ok: false, body: "boom" }),
    });

    render(<AdminManageUsers />);

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load users")
      )
    );
  });

  test("toggle endpoint error branch shows toast.error and leaves state unchanged", async () => {
    setupFetch({
      "admin/users": () => makeRes({ body: jsonText(usersFixture) }),
      "POST admin/toggle-approval": () => makeRes({ ok: false, body: "fail" }),
    });

    render(<AdminManageUsers />);

    const annRow = await screen.findByRole("row", {
      name: /ann@example\.com/i,
    });
    const approveBtn = within(annRow).getByRole("button", { name: /approve/i });

    fireEvent.click(approveBtn);

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("fail"));

    // still “No” because state should not flip on failure
    expect(within(annRow).getByText("No")).toBeInTheDocument();
  });
});
