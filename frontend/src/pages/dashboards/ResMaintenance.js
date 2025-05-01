
import { useEffect, useState } from "react";
import Sidebar from "../../components/ResSideBar.js";
import "../../styles/resMaintenance.css";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

export default function StaffMaintenance() {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [maintenanceReports, setMaintenanceReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchFacilities = async () => {
      const snapshot = await getDocs(collection(db, "facilities-test"));
      const facilitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFacilities(facilitiesData);
    };

    const fetchMaintenanceReports = async () => {
      const snapshot = await getDocs(collection(db, "maintenance-reports"));
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMaintenanceReports(reportsData);
    };

    fetchFacilities();
    fetchMaintenanceReports();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFacility || !issueDescription) {
      alert("Please select a facility and describe the issue");
      return;
    }

    try {
      await addDoc(collection(db, "maintenance-reports"), {
        facility: selectedFacility,
        description: issueDescription,
        status: "Open",
        createdAt: new Date().toISOString(),
      });
      
      // Refresh the reports list
      const snapshot = await getDocs(collection(db, "maintenance-reports"));
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMaintenanceReports(reportsData);
      
      // Reset form
      setSelectedFacility("");
      setIssueDescription("");
    } catch (error) {
      console.error("Error adding maintenance report: ", error);
    }
  };

  return (
    <main className="staff-maintenance">
      <div className="container">
        <Sidebar activeItem="maintenance" />

        <main className="main-content">
          <header className="page-header">
            <h1>Maintenance Reports</h1>
            <input 
              type="search" 
              placeholder="Search" 
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
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  required
                >
                  <option value="">Select a facility</option>
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.name}>
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
                      report.facility?.toLowerCase().includes(query) ||
                      report.description?.toLowerCase().includes(query) ||
                      report.status?.toLowerCase().includes(query)
                    );
                  })
                  .map((report) => (
                    <tr key={report.id}>
                      <td>{report.facility}</td>
                      <td>{report.description}</td>
                      <td className={`status ${report.status.toLowerCase()}`}>
                        {report.status}
                      </td>
                      <td>{new Date(report.createdAt).toLocaleString()}</td>
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
