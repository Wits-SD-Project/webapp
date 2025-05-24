// Import React hooks for state and lifecycle management
import { useEffect, useState } from "react";
// Import sidebar navigation component
import Sidebar from "../../components/StaffSideBar.js";
// Import component styles
import "../../styles/staffMaintenance.css";
// Import authentication and notification utilities
import { getAuthToken } from "../../firebase";
import { toast } from "react-toastify";

export default function StaffMaintenance() {
  // State management for maintenance requests
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);

  /**
   * useEffect hook for initial data fetching
   * Runs once when component mounts (empty dependency array)
   */
  useEffect(() => {
    const fetchReports = async () => {
      try {
        // Get authentication token
        const token = await getAuthToken();
        
        // Fetch maintenance requests from backend API
        const res = await fetch(
          "http://localhost:8080/api/facilities/staff-maintenance-requests",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Handle non-successful responses
        if (!res.ok) throw new Error("Failed to fetch reports");

        // Process and store response data
        const data = await res.json();
        setMaintenanceRequests(data.reports.map((f) => ({ ...f })));
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load reports: " + err.message);
      }
    };

    fetchReports();
  }, []);

  /**
   * Update the status of a maintenance request
   * @param {string} id - The ID of the request to update
   * @param {string} newStatus - The new status to set
   */
  const updateRequestStatus = async (id, newStatus) => {
    try {
      const token = await getAuthToken();
      
      // Send status update to backend
      const res = await fetch(
        `http://localhost:8080/api/facilities/updateReportStatus/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      // Update local state with new status
      setMaintenanceRequests(prev => 
        prev.map(request => 
          request.id === id ? { ...request, status: newStatus } : request
        )
      );
      
      // Show success notification
      toast.success(data.message);
    } catch (err) {
      console.error("Update facility error:", err);
      toast.error(err.message || "Failed to update facility");
    }
  };

  // Component render
  return (
    <main className="staff-maintenance">
      <div className="container">
        {/* Sidebar navigation */}
        <Sidebar activeItem="maintenance" />

        {/* Main content area */}
        <main className="main-content">
          {/* Page header with search box */}
          <header className="page-header">
            <h1>Maintenance Requests</h1>
            <input 
              type="search" 
              placeholder="Search" 
              className="search-box" 
            />
          </header>

          {/* Maintenance requests table */}
          <section className="table-section">
            <table className="maintenance-table">
              <thead>
                <tr>
                  <th>Facility Name</th>
                  <th>Reported By</th>
                  <th>Description</th>
                  <th>Reported At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Render each maintenance request as a table row */}
                {maintenanceRequests.map((request, index) => (
                  <tr key={index}>
                    <td>{request.facilityName}</td>
                    <td>{request.reportedBy}</td>
                    <td>{request.description}</td>
                    <td>
                      {/* Format timestamp as YYYY-MM-DD HH:MM */}
                      {(() => {
                        const date = new Date(request.reportedAt);
                        return date.getFullYear() +
                          '-' + String(date.getMonth() + 1).padStart(2, '0') +
                          '-' + String(date.getDate()).padStart(2, '0') +
                          ' ' + String(date.getHours()).padStart(2, '0') +
                          ':' + String(date.getMinutes()).padStart(2, '0');
                      })()}
                    </td>

                    {/* Status cell with dynamic class for styling */}
                    <td className={`status ${request.status.toLowerCase().replace(' ', '-')}`}>
                      {request.status}
                    </td>
                    
                    {/* Action buttons with conditional rendering */}
                    <td className="actions">
                      {/* Show "In Progress" button only if not already in progress/closed */}
                      {request.status !== "in progress" && request.status !== "closed" && (
                        <button 
                          className="in-progress"
                          onClick={() => updateRequestStatus(request.id, "in progress")}
                        >
                          In Progress
                        </button>
                      )}
                      
                      {/* Show "Closed" button unless already closed */}
                      {request.status !== "closed" && (
                        <button 
                          className="closed"
                          onClick={() => updateRequestStatus(request.id, "closed")}
                        >
                          Closed
                        </button>
                      )}
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
