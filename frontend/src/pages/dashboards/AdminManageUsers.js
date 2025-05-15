// src/pages/admin/AdminDashboard.js
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Box,
  Typography,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
} from "@mui/material";
import Sidebar from "../../components/AdminSideBar.js";
import "../../styles/adminManageUsers.css";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/admin/users");
        const text = await res.text();
        if (!res.ok) throw new Error(text || res.statusText);
        const data = JSON.parse(text);

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
    };

    fetchUsers();
  }, []);

  const handleToggle = async (user, endpoint, flagKey) => {
    try {
      const res = await fetch(`http://localhost:8080/api/admin/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });

      // read raw text first
      const text = await res.text();
      if (!res.ok) throw new Error(text || res.statusText);

      // parse json
      const data = JSON.parse(text);

      setUsers((prev) =>
        prev.map((u) =>
          u.email !== user.email ? u : { ...u, [flagKey]: data[flagKey] }
        )
      );

      toast.success(data.message);
    } catch (err) {
      console.error(`${endpoint} error:`, err);
      toast.error(err.message);
    }
  };

  const toggleApproval = (u) => handleToggle(u, "toggle-approval", "approved");
  const toggleAccepted = (u) => handleToggle(u, "toggle-accepted", "accepted");

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
