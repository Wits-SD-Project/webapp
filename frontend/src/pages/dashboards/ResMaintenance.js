// Import React hooks for state and lifecycle management
import { useEffect, useState } from "react";
// Import sidebar navigation component
import Sidebar from "../../components/ResSideBar.js";
// Import component styles
import "../../styles/resMaintenance.css";
// Import Firestore database functions
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
// Import Firebase configuration
import { db } from "../../firebase";
// Import Firebase authentication functions
import { getAuth } from "firebase/auth";

export default function ResMaintenance() {
  // State management for component data
  const [facilities, setFacilities] = useState([]); // List of available facilities
  const [selectedFacilityId, setSelectedFacilityId] = useState(""); // Currently selected facility ID
  const [issueDescription, setIssueDescription] = useState(""); // User's issue description
  const [maintenanceReports, setMaintenanceReports] = useState([]); // User's maintenance reports
  const [searchQuery, setSearchQuery] = useState(""); // Search query for filtering reports
  const auth = getAuth(); // Firebase auth instance
  const [currentUser, setCurrentUser] = useState(null); // Current authenticated user

  /**
   * useEffect hook for initial data loading
   * Runs once when component mounts (empty dependency array)
   */
  useEffect(() => {
    // Get current authenticated user
    const auth = getAuth();
    const user = auth.currentUser;
    setCurrentUser(user);

    /**
     * Fetches all available facilities from Firestore
     */
    const fetchFacilities = async () => {
      // Get documents from 'facilities-test' collection
      const snapshot = await getDocs(collection(db, "facilities-test"));
      // Transform documents into facility objects with id
      const facilitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFacilities(facilitiesData);
    };

    /**
     * Fetches maintenance reports specific to the current user
     */
    const fetchMaintenanceReports = async () => {
      if (!user) return; // Skip if no user is authenticated
      
      // Create query for user-specific reports
      const q = query(
        collection(db, "maintenance-reports"),
        where("userId", "==", user.uid) // Filter by current user's ID
      );
      
      // Execute query and process results
      const snapshot = await getDocs(q);
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to JavaScript Date if needed
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
      }));
      setMaintenanceReports(reportsData);
    };

    // Call both fetch functions
    fetchFacilities();
    fetchMaintenanceReports();
  }, []); // Empty dependency array means this runs once on mount

  /**
   * Handles form submission for new maintenance reports
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form inputs
    if (!selectedFacilityId || !issueDescription) {
      alert("Please select a facility and describe the issue");
      return;
    }

    try {
      // Find the selected facility to get its details
      const selectedFacility = facilities.find(f => f.id === selectedFacilityId);
      
      if (!selectedFacility) {
        alert("Selected facility not found");
        return;
      }

      // Get current user info
      const user = auth.currentUser;
      
      // Add new document to maintenance-reports collection
      await addDoc(collection(db, "maintenance-reports"), {
        facilityId: selectedFacilityId,
        facilityName: selectedFacility.name,
        description: issueDescription,
        status: "opened", // Initial status
        createdAt: new Date(), // Current timestamp
        resolvedAt: null, // Initially not resolved
        facilityStaff: selectedFacility.created_by || "", // Staff assigned to facility
        userId: user?.uid || "", // Reporting user's ID
        username: user?.email || "" // Reporting user's email
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
      
      // Reset form fields
      setSelectedFacilityId("");
      setIssueDescription("");
    } catch (error) {
      console.error("Error adding maintenance report: ", error);
      alert("Failed to submit report. Please try again.");
    }
  };

  // Component render
  return (
    <main className="res-maintenance">
      <div className="container">
        {/* Sidebar navigation */}
        <Sidebar activeItem="maintenance" />

        {/* Main content area */}
        <main className="main-content">
          {/* Page header with search functionality */}
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

          {/* New report submission form */}
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

          {/* Maintenance reports table */}
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
                  {/* Filter and map through reports */}
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
                        {/* Status with dynamic class for styling */}
                        <td className={`status ${report.status.toLowerCase()}`}>
                          {report.status}
                        </td>
                        <td>
                          {/* Format date if available */}
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
