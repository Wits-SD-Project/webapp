// Import necessary React hooks, components, and libraries
import { useEffect, useState } from "react";
import { toast } from "react-toastify"; // For displaying notifications
import Sidebar from "../../components/AdminSideBar.js"; // Admin sidebar component
import { getAuthToken } from "../../firebase.js"; // Firebase authentication helper
import "../../styles/adminManageUsers.css"; // Component-specific styles

// Main AdminDashboard component for managing users
export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

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

        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
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

  async function handleToggle(user, endpoint, flagKey, removeOnFalse = false, actionLabel = "") {
    const confirmed = window.confirm(`Are you sure?\n\nDo you want to ${actionLabel.toLowerCase()} for ${user.email}?`);
    if (!confirmed) return;

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

      const actionRecord = `${new Date().toLocaleString()}: ${actionLabel} for ${user.email}`;
      setAuditLog((prev) => [...prev, actionRecord]);

      if (removeOnFalse && !data[flagKey]) {
        setUsers((prev) => prev.filter((u) => u.email !== user.email));
      } else if (flagKey === "approved") {
        setUsers((prev) =>
          prev.map((u) =>
            u.email === user.email ? { ...u, approved: true, accepted: true } : u
          )
        );
      }

      toast.success(data.message || "Saved");
    } catch (err) {
      console.error(`${endpoint} error:`, err);
      toast.error(err.message);
    }
  }

  const approveUser = (u) => handleToggle(u, "toggle-approval", "approved", false, "Approved and Granted Access");
  const rejectUser = (u) => handleToggle(u, "toggle-approval", "approved", true, "Rejected Access");
  const revokeAccess = (u) => handleToggle(u, "toggle-accepted", "accepted", true, "Revoked Access");

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
                    <td className="status approved">{user.approved ? "Yes" : "No"}</td>
                    <td className="status approved">{user.accepted ? "Yes" : "No"}</td>
                    <td className="actions">
                      {!user.approved && !user.accepted ? (
                        <>
                          <button className="approve" onClick={() => approveUser(user)}>
                            Accept
                          </button>
                          <button className="reject" onClick={() => rejectUser(user)}>
                            Reject
                          </button>
                        </>
                      ) : (
                        <button className="reject" onClick={() => revokeAccess(user)}>
                          Revoke Access
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="audit-log" style={{ marginTop: "2rem" }}>
            <h3>Audit Log</h3>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {auditLog.map((log, idx) => (
                <li key={idx} style={{ fontSize: "0.9rem", marginBottom: "0.25rem" }}>{log}</li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </main>
  );
}
