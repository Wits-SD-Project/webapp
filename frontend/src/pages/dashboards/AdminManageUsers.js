import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Sidebar from "../../components/AdminSideBar.js";
import { getAuthToken } from "../../firebase.js";
import "../../styles/adminManageUsers.css";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);

  // ─────────────────────────── Fetch user list ────────────────────────────
  useEffect(() => {
    async function fetchUsers() {
      try {
        const token = await getAuthToken();

        const res = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/admin/users`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }

        const data = await res.json(); // always JSON

        setUsers(
          data.map((u) => ({
            ...u,
            approved: !!u.approved,
            accepted: !!u.accepted,
          }))
        );
      } catch (err) {
        console.error("fetchUsers error:", err);
        toast.error("Failed to load users: " + err.message);
      }
    }

    fetchUsers();
  }, []);

  // ────────────────────── Toggle helpers (approve / accept) ───────────────
  async function handleToggle(user, endpoint, flagKey) {
    try {
      const token = await getAuthToken();

      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/admin/${endpoint}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: user.email }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || res.statusText);

      setUsers((prev) =>
        prev.map((u) =>
          u.email === user.email ? { ...u, [flagKey]: data[flagKey] } : u
        )
      );

      if (data.message) toast.success(data.message);
      else toast.success("Saved"); // fallback
    } catch (err) {
      console.error(`${endpoint} error:`, err);
      toast.error(err.message);
    }
  }

  const toggleApproval = (u) => handleToggle(u, "toggle-approval", "approved");
  const toggleAccepted = (u) => handleToggle(u, "toggle-accepted", "accepted");

  // ─────────────────────────────── Render ────────────────────────────────
  return (
    <main className="admin-dashboard">
      <div className="container">
        <Sidebar activeItem="manage users" />

        <main className="main-content">
          <header className="page-header">
            <h1>Manage Users</h1>
            <input type="search" placeholder="Search" className="search-box" />
          </header>

          <section className="table-section">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Approved?</th>
                  <th>Access Granted?</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} align="center">
                      No users found.
                    </td>
                  </tr>
                )}

                {users.map((user) => (
                  <tr key={user.email}>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td
                      className={`status ${
                        user.approved ? "approved" : "rejected"
                      }`}
                    >
                      {user.approved ? "Yes" : "No"}
                    </td>
                    <td
                      className={`status ${
                        user.accepted ? "approved" : "rejected"
                      }`}
                    >
                      {user.accepted ? "Yes" : "No"}
                    </td>
                    <td className="actions">
                      <button
                        className={user.approved ? "reject" : "approve"}
                        onClick={() => toggleApproval(user)}
                      >
                        {user.approved ? "Revoke" : "Approve"}
                      </button>
                      <button
                        className={user.accepted ? "reject" : "approve"}
                        disabled={!user.approved}
                        onClick={() => toggleAccepted(user)}
                      >
                        {user.accepted ? "Revoke Access" : "Grant Access"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
      </div>
    </main>
  );
}
