import { useEffect, useState } from "react";
import Sidebar from "../../components/StaffSideBar.js";
import "../../styles/staffMaintenance.css";

export default function StaffMaintenance() {
  // Dummy data for maintenance requests - delete after testing
  const [maintenanceRequests, setMaintenanceRequests] = useState([
    {
      id: 1,
      facilityName: "Basketball Court",
      reportedBy: "John Doe",
      description: "Net is torn and needs replacement",
      status: "opened",
      reportedAt: "2023-05-15 10:30 AM"
    },
    {
      id: 2,
      facilityName: "Swimming Pool",
      reportedBy: "Sarah Smith",
      description: "Leak in the pool filtration system",
      status: "in progress",
      reportedAt: "2023-05-14 02:15 PM"
    },
    {
      id: 3,
      facilityName: "Tennis Court",
      reportedBy: "Mike Johnson",
      description: "Crack in the court surface",
      status: "opened",
      reportedAt: "2023-05-16 09:45 AM"
    },
    {
      id: 4,
      facilityName: "Gymnasium",
      reportedBy: "Emily Wilson",
      description: "Treadmill not functioning properly",
      status: "closed",
      reportedAt: "2023-05-10 04:20 PM"
    },
    {
      id: 5,
      facilityName: "Squash Court",
      reportedBy: "David Brown",
      description: "Lighting flickering in court 2",
      status: "opened",
      reportedAt: "2023-05-16 11:10 AM"
    },
    {
        id: 6,
        facilityName: "Basketball Court",
        reportedBy: "John Doe",
        description: "Net is torn and needs replacement",
        status: "opened",
        reportedAt: "2023-05-15 10:30 AM"
      },
      {
        id: 7,
        facilityName: "Swimming Pool",
        reportedBy: "Sarah Smith",
        description: "Leak in the pool filtration system",
        status: "in progress",
        reportedAt: "2023-05-14 02:15 PM"
      },
      {
        id: 8,
        facilityName: "Tennis Court",
        reportedBy: "Mike Johnson",
        description: "Crack in the court surface",
        status: "opened",
        reportedAt: "2023-05-16 09:45 AM"
      },
      {
        id: 9,
        facilityName: "Gymnasium",
        reportedBy: "Emily Wilson",
        description: "Treadmill not functioning properly",
        status: "closed",
        reportedAt: "2023-05-10 04:20 PM"
      },
      {
        id: 10,
        facilityName: "Squash Court",
        reportedBy: "David Brown",
        description: "Lighting flickering in court 2",
        status: "opened",
        reportedAt: "2023-05-16 11:10 AM"
      }
  ]);

  const updateRequestStatus = (id, newStatus) => {
    setMaintenanceRequests(prev => 
      prev.map(request => 
        request.id === id ? { ...request, status: newStatus } : request
      )
    );
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
                    <td>{request.reportedAt}</td>
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