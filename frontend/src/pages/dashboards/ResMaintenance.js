import { useEffect, useState } from "react";
import Sidebar from "../../components/ResSideBar.js";
import "../../styles/resMaintenance.css";
import { getAuthToken } from "../../firebase";
import { getAuth } from "firebase/auth";

export default function ResMaintenance() {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [maintenanceReports, setMaintenanceReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const auth = getAuth();

  const fetchMaintenanceReports = async () => {
    try {
      const token = await getAuthToken();

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/admin/maintenance-reports`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch maintenance reports");
      }

      const data = await response.json();
      setMaintenanceReports(data.reports || []); // Set the array of reports
    } catch (error) {
      console.error("Error fetching maintenance reports:", error);
      setMaintenanceReports([]); // Prevent UI errors
    }
  };

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const token = await getAuthToken();
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/admin/facilities`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch facilities");
        }

        const data = await response.json();
        setFacilities(data.facilities); // ✅ this is now an array
      } catch (error) {
        console.error("Error fetching facilities:", error);
        setFacilities([]); // fallback to empty array to prevent .map crash
      }
    };

    fetchFacilities();
    fetchMaintenanceReports();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFacilityId || !issueDescription) {
      alert("Please select a facility and describe the issue");
      return;
    }

    try {
      const selectedFacility = facilities.find(
        (f) => f.id === selectedFacilityId
      );

      if (!selectedFacility) {
        alert("Selected facility not found");
        return;
      }

      const token = await getAuthToken();

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/admin/maintenance-reports`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            facilityId: selectedFacilityId,
            facilityName: selectedFacility.name,
            description: issueDescription,
            facilityStaff: selectedFacility.created_by || "",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to submit maintenance report");
      }

      // Refresh the user's reports
      fetchMaintenanceReports(); // reuse your API-based fetchMaintenanceReports

      // Reset form
      setSelectedFacilityId("");
      setIssueDescription("");
    } catch (error) {
      console.error("Error adding maintenance report: ", error);
      alert("Failed to submit report. Please try again.");
    }
  };

  const formatCreatedAt = (createdAt) => {
    if (!createdAt) return "No date";

    const date = new Date(createdAt);
    if (isNaN(date.getTime())) return "Invalid date";

    return new Intl.DateTimeFormat("en-ZA", {
      weekday: "long", // Monday
      day: "numeric", // 5
      month: "long", // May
      year: "numeric", // 2025
      hour: "numeric", // 3
      minute: "2-digit", // 45
      hour12: true, // PM
    }).format(date);
  };

  return (
    <main className="res-maintenance">
      <div className="container">
        <Sidebar activeItem="maintenance" />

        <main className="main-content">
          <header className="page-header">
            <h1>My Maintenance Reports</h1>
            <input
              type="search"
              placeholder="Search reports..."
              className="search-box"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </header>

          <section className="report-form">
            <h2>Create New Maintenance Report</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="facility">Facility:</label>
                <select
                  id="facility"
                  value={selectedFacilityId}
                  onChange={(e) => setSelectedFacilityId(e.target.value)}
                  required
                >
                  <option value="">Select a facility</option>
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="issue">Issue Description:</label>
                <textarea
                  id="issue"
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="submit-button">
                Submit Report
              </button>
            </form>
          </section>

          <section className="table-section">
            {maintenanceReports.length === 0 ? (
              <p>You have no maintenance reports yet.</p>
            ) : (
              <table className="maintenance-table">
                <thead>
                  <tr>
                    <th>Facility</th>
                    <th>Issue Description</th>
                    <th>Status</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceReports
                    .filter((report) => {
                      const query = searchQuery.toLowerCase();
                      return (
                        report.facilityName?.toLowerCase().includes(query) ||
                        report.description?.toLowerCase().includes(query) ||
                        report.status?.toLowerCase().includes(query)
                      );
                    })
                    .map((report) => (
                      <tr key={report.id}>
                        <td>{report.facilityName}</td>
                        <td>{report.description}</td>
                        <td className={`status ${report.status.toLowerCase()}`}>
                          {report.status}
                        </td>
                        <td>{formatCreatedAt(report.createdAt)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </section>
        </main>
      </div>
    </main>
  );
}
