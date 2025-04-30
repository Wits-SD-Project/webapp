import { useEffect, useState } from "react";
import Sidebar from "../../components/StaffSideBar.js";
import "../../styles/staffMaintenance.css";
import { getAuthToken } from "../../firebase";
import { toast } from "react-toastify";

export default function StaffMaintenance() {
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(
          "http://localhost:8080/api/facilities/staff-maintenance-requests",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch reports");

        const data = await res.json();
        setMaintenanceRequests(data.reports.map((f) => ({ ...f})));
      } catch (err) {
        console.log(err);
        toast.error("Failed to load reports: " + err.message);
      }
    };

    fetchReports();
  }, []);

  const updateRequestStatus = async (id, newStatus) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(
        `http://localhost:8080/api/facilities/updateReportStatus/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status:newStatus
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      setMaintenanceRequests(prev => 
        prev.map(request => 
          request.id === id ? { ...request, status: newStatus } : request
        )
      );
      toast.success(data.message);
    } catch (err) {
      console.error("Update facility error:", err);
      toast.error(err.message || "Failed to update facility");
    }

  };

  return (
    <main className="staff-maintenance">
      <div className="container">
        <Sidebar activeItem="maintenance" />

        <main className="main-content">
          <header className="page-header">
            <h1>Maintenance Requests</h1>
            <input type="search" placeholder="Search" className="search-box" />
          </header>

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
                {maintenanceRequests.map((request, index) => (
                  <tr key={index}>
                    <td>{request.facilityName}</td>
                    <td>{request.reportedBy}</td>
                    <td>{request.description}</td>
                    <td>
                      {(() => {
                        const date = new Date(request.reportedAt);
                        return date.getFullYear() +
                          '-' + String(date.getMonth() + 1).padStart(2, '0') +
                          '-' + String(date.getDate()).padStart(2, '0') +
                          ' ' + String(date.getHours()).padStart(2, '0') +
                          ':' + String(date.getMinutes()).padStart(2, '0');
                      })()}
                    </td>

                    <td className={`status ${request.status.toLowerCase().replace(' ', '-')}`}>
                      {request.status}
                    </td>
                    <td className="actions">
                      {request.status !== "in progress" && request.status !== "closed" && (
                        <button 
                          className="in-progress"
                          onClick={() => updateRequestStatus(request.id, "in progress")}
                        >
                          In Progress
                        </button>
                      )}
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