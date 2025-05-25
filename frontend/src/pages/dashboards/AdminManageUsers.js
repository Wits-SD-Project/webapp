// Import necessary React hooks, components, and libraries
import { useEffect, useState } from "react";
import { toast } from "react-toastify"; // For displaying notifications
import Sidebar from "../../components/AdminSideBar.js"; // Admin sidebar component
import { getAuthToken } from "../../firebase.js"; // Firebase authentication helper
import "../../styles/adminManageUsers.css"; // Component-specific styles

// Custom Confirmation Modal Component
// This component displays a modal dialog for user confirmation.
const ConfirmationModal = ({ message, onConfirm, onCancel, isOpen }) => {
  if (!isOpen) return null; // If modal is not open, render nothing

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <p>{message}</p>
        <div className="modal-actions">
          <button onClick={onConfirm} className="modal-button confirm">Confirm</button>
          <button onClick={onCancel} className="modal-button cancel">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// Main AdminDashboard component for managing users
export default function AdminDashboard() {
  const [users, setUsers] = useState([]); // State to store the list of users
  const [auditLog, setAuditLog] = useState([]); // State to store audit log entries

  // State for managing the confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmActionDetails, setConfirmActionDetails] = useState(null); // Stores details of the action to be confirmed
  const [confirmUser, setConfirmUser] = useState(null); // Stores the user object for the pending action
  const [confirmMessage, setConfirmMessage] = useState(""); // Message to display in the modal

  // useEffect hook to fetch users when the component mounts
  useEffect(() => {
    async function fetchUsers() {
      try {
        const token = await getAuthToken(); // Get Firebase authentication token
        const res = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/admin/users`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) {
          // If response is not OK, throw an error
          const errorText = await res.text();
          throw new Error(errorText);
        }

        const data = await res.json(); // Parse the JSON response
        setUsers(
          data.map((u) => ({
            ...u,
            approved: !!u.approved, // Ensure boolean value
            accepted: !!u.accepted, // Ensure boolean value
          }))
        );
      } catch (err) {
        console.error("fetchUsers error:", err);
        toast.error("Failed to load users: " + err.message); // Display error notification
      }
    }
    fetchUsers(); // Call the fetch users function
  }, []); // Empty dependency array means this runs once on mount

  /**
   * Handles the initial click on an action button, setting up the confirmation modal.
   * @param {object} user - The user object to perform the action on.
   * @param {string} actionLabel - A descriptive label for the action (e.g., "Approved and Granted Access").
   * @param {string} action - The specific action type (e.g., "approve", "reject", "revoke", "giveAccess").
   */
  const handleToggle = (user, actionLabel = "", action) => {
    setConfirmUser(user); // Store the user for the modal
    setConfirmActionDetails({ actionLabel, action }); // Store action details
    setConfirmMessage(`Are you sure?\n\nDo you want to ${actionLabel.toLowerCase()} for ${user.email}?`); // Set modal message
    setShowConfirmModal(true); // Show the confirmation modal
  };

  /**
   * Executes the toggle action after user confirmation from the modal.
   * This function contains the actual API call and state update logic.
   */
  const executeToggle = async () => {
    setShowConfirmModal(false); // Close the modal
    if (!confirmUser || !confirmActionDetails) return; // If no user or action details, do nothing

    const { actionLabel, action } = confirmActionDetails;
    const user = confirmUser;

    try {
      const token = await getAuthToken(); // Get authentication token
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/admin/toggle-approval`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: user.email, action: action }), // Send user email and action to backend
        }
      );

      const data = await res.json(); // Parse the JSON response
      if (!res.ok) {
        // If response is not OK, throw an error
        throw new Error(data.message || res.statusText);
      }

      // Add action to audit log
      const actionRecord = `${new Date().toLocaleString()}: ${actionLabel} for ${user.email}`;
      setAuditLog((prev) => [...prev, actionRecord]);

      // Update frontend state based on the action performed
      setUsers((prev) =>
        prev.map((u) => {
          if (u.email === user.email) {
            if (action === "approve") {
              return { ...u, approved: true, accepted: true };
            } else if (action === "reject") {
              // For reject, we remove the user from the list
              return null; // Mark for filtering out
            } else if (action === "revoke") {
              return { ...u, accepted: false }; // Keep approved true, set accepted to false
            } else if (action === "giveAccess") {
              return { ...u, accepted: true }; // Set accepted to true
            }
          }
          return u;
        }).filter(Boolean) // Filter out nulls (rejected users)
      );

      toast.success(data.message || "Saved"); // Display success notification
    } catch (err) {
      console.error(`Toggle error:`, err);
      toast.error(err.message); // Display error notification
    } finally {
      // Reset modal state after action is attempted
      setConfirmUser(null);
      setConfirmActionDetails(null);
      setConfirmMessage("");
    }
  };

  /**
   * Handles canceling the confirmation modal.
   */
  const handleCancelConfirm = () => {
    setShowConfirmModal(false); // Hide the modal
    setConfirmUser(null); // Clear user details
    setConfirmActionDetails(null); // Clear action details
    setConfirmMessage(""); // Clear modal message
  };

  // Helper functions for specific actions, calling handleToggle with appropriate parameters
  const approveUser = (u) => handleToggle(u, "Approve and Grant Access", "approve");
  const rejectUser = (u) => handleToggle(u, "Reject Access", "reject");
  const revokeAccess = (u) => handleToggle(u, "Revoke Access", "revoke");
  const giveAccess = (u) => handleToggle(u, "Grant Access", "approve"); // New function for giving access

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
                      {/* Conditional rendering of action buttons based on user status */}
                      {/* Case 1: New user (not approved, not accepted) */}
                      {!user.approved && !user.accepted && (
                        <>
                          <button className="approve" onClick={() => approveUser(user)}>
                            Accept
                          </button>
                          <button className="reject" onClick={() => rejectUser(user)}>
                            Reject
                          </button>
                        </>
                      )}

                      {/* Case 2: User approved but access revoked (approved: true, accepted: false) */}
                      {user.approved && !user.accepted && (
                        <button className="approve" onClick={() => giveAccess(user)}>
                          Give Access
                        </button>
                      )}

                      {/* Case 3: User approved and access granted (approved: true, accepted: true) */}
                      {user.approved && user.accepted && (
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

      {/* Confirmation Modal component rendered at the end of the main component */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        message={confirmMessage}
        onConfirm={executeToggle}
        onCancel={handleCancelConfirm}
      />
    </main>
  );
}