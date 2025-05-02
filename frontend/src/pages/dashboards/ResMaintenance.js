
import { useEffect, useState } from "react";
import Sidebar from "../../components/ResSideBar.js";
import "../../styles/resMaintenance.css";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth } from "firebase/auth";

export default function ResMaintenance() {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [maintenanceReports, setMaintenanceReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const auth = getAuth();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    setCurrentUser(user);

    const fetchFacilities = async () => {
      const snapshot = await getDocs(collection(db, "facilities-test"));
      const facilitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFacilities(facilitiesData);
    };

    const fetchMaintenanceReports = async () => {
      if (!user) return;
      
      // Only fetch reports where userId matches current user's UID
      const q = query(
        collection(db, "maintenance-reports"),
        where("userId", "==", user.uid)
      );
      
      const snapshot = await getDocs(q);
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to JavaScript Date if needed
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
      }));
      setMaintenanceReports(reportsData);
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
      // Find the selected facility to get its name
      const selectedFacility = facilities.find(f => f.id === selectedFacilityId);
      
      if (!selectedFacility) {
        alert("Selected facility not found");
        return;
      }

      // Get current user info
      const user = auth.currentUser;
      
      await addDoc(collection(db, "maintenance-reports"), {
        facilityId: selectedFacilityId,
        facilityName: selectedFacility.name,
        description: issueDescription,
        status: "opened", // Match your existing status format
        createdAt: new Date(),
        facilityStaff: selectedFacility.created_by || "", // Use the facility's staff ID
        userId: user?.uid || "",
        username: user?.email || ""
      });
      
      // Refresh the reports list with only the current user's reports
      if (user) {
        const q = query(
          collection(db, "maintenance-reports"),
          where("userId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const reportsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
        }));
        setMaintenanceReports(reportsData);
      }
      
      // Reset form
      setSelectedFacilityId("");
      setIssueDescription("");
    } catch (error) {
      console.error("Error adding maintenance report: ", error);
      alert("Failed to submit report. Please try again.");
    }
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
                        <td>
                          {report.createdAt 
                            ? new Date(report.createdAt).toLocaleString() 
                            : 'No date'}
                        </td>
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
