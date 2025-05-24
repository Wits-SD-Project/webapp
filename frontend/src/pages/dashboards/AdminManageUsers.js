// Import necessary React hooks, components, and libraries
import { useEffect, useState } from "react";
import { toast } from "react-toastify"; // For displaying notifications
import Sidebar from "../../components/AdminSideBar.js"; // Admin sidebar component
import { getAuthToken } from "../../firebase.js"; // Firebase authentication helper
import "../../styles/adminManageUsers.css"; // Component-specific styles

// Main AdminDashboard component for managing users
export default function AdminDashboard() {
  // State to store the list of users
  const [users, setUsers] = useState([]);

  // ─────────────────────────── Fetch user list ────────────────────────────
  /**
   * Fetches the list of users from the backend when the component mounts
   * Handles both successful and failed responses
   */
  useEffect(() => {
    async function fetchUsers() {
      try {
        // Get authentication token
        const token = await getAuthToken();

        // Make API request to get users
        const res = await fetch("http://localhost:8080/api/admin/users", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        // Handle non-successful responses
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || res.statusText);
        }

        // Parse successful response
        const data = await res.json();

        // Update users state with normalized boolean values for flags
        setUsers(
          data.map((u) => ({
            ...u,
            approved: !!u.approved, // Convert to boolean
            accepted: !!u.accepted, // Convert to boolean
          }))
        );
      } catch (err) {
        console.error("fetchUsers error:", err);
        toast.error("Failed to load users: " + err.message);
      }
    }

    // Execute the fetch operation
    fetchUsers();
  }, []); // Empty dependency array means this runs once on mount

  // ────────────────────── Toggle helpers (approve / accept) ───────────────
  /**
   * Generic toggle handler for user status flags (approval/acceptance)
   * @param {Object} user - The user object being modified
   * @param {string} endpoint - API endpoint to call
   * @param {string} flagKey - The user property to update (approved/accepted)
   */
  async function handleToggle(user, endpoint, flagKey) {
    try {
      // Get authentication token
      const token = await getAuthToken();

      // Make API request to toggle user status
      const res = await fetch(`http://localhost:8080/api/admin/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user.email }), // Send user email as identifier
      });

      // Parse response
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || res.statusText);

      // Update users state with the new status
      setUsers((prev) =>
        prev.map((u) =>
          u.email === user.email ? { ...u, [flagKey]: data[flagKey] } : u
        )
      );

      // Show success notification
      if (data.message) toast.success(data.message);
      else toast.success("Saved"); // fallback message
    } catch (err) {
      console.error(`${endpoint} error:`, err);
      toast.error(err.message); // Show error notification
    }
  }

  // Specific toggle handlers that use the generic handleToggle
  const toggleApproval = (u) => handleToggle(u, "toggle-approval", "approved");
  const toggleAccepted = (u) => handleToggle(u, "toggle-accepted", "accepted");

  // ─────────────────────────────── Render ────────────────────────────────
  return (
    <main className="admin-dashboard">
      <div className="container">
        {/* Admin sidebar with "manage users" item highlighted */}
        <Sidebar activeItem="manage users" />

        {/* Main content area */}
        <main className="main-content">
          {/* Page header with title and search box */}
          <header className="page-header">
            <h1>Manage Users</h1>
            <input type="search" placeholder="Search" className="search-box" />
          </header>

          {/* Table section displaying all users */}
          <section className="table-section">
            <table className="admin-table">
              {/* Table header */}
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Approved?</th>
                  <th>Access Granted?</th>
                  <th>Actions</th>
                </tr>
              </thead>

              {/* Table body */}
              <tbody>
                {/* Empty state message */}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} align="center">
                      No users found.
                    </td>
                  </tr>
                )}

                {/* Map through all users and display them in rows */}
                {users.map((user) => (
                  <tr key={user.email}>
                    {/* User email */}
                    <td>{user.email}</td>
                    
                    {/* User role */}
                    <td>{user.role}</td>
                    
                    {/* Approval status with conditional styling */}
                    <td
                      className={`status ${
                        user.approved ? "approved" : "rejected"
                      }`}
                    >
                      {user.approved ? "Yes" : "No"}
                    </td>
                    
                    {/* Access status with conditional styling */}
                    <td
                      className={`status ${
                        user.accepted ? "approved" : "rejected"
                      }`}
                    >
                      {user.accepted ? "Yes" : "No"}
                    </td>
                    
                    {/* Action buttons */}
                    <td className="actions">
                      {/* Approve/Revoke button */}
                      <button
                        className={user.approved ? "reject" : "approve"}
                        onClick={() => toggleApproval(user)}
                      >
                        {user.approved ? "Revoke" : "Approve"}
                      </button>
                      
                      {/* Grant/Revoke Access button (disabled if not approved) */}
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
