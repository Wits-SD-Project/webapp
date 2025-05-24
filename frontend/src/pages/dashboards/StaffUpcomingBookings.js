// Import React hooks for state and lifecycle management
import { useEffect, useState } from "react";
// Import routing utilities
import { useNavigate } from "react-router-dom";
// Import Firebase services
import { db, auth } from "../../firebase";
// Import Firestore query utilities
import { collection, getDocs, query, where } from "firebase/firestore";
// Import components and styles
import Sidebar from "../../components/StaffSideBar.js";
import "../../styles/staffUpcomingBookings.css";

export default function StaffUpcomingBookings() {
  // Navigation hook for routing
  const navigate = useNavigate();
  
  // State for storing upcoming bookings
  const [bookings, setBookings] = useState([]);

  /**
   * useEffect hook for fetching bookings data
   * Runs once when component mounts (empty dependency array)
   */
  useEffect(() => {
    const fetchBookings = async () => {
      // Get current authenticated user
      const user = auth.currentUser;
      if (!user) return;
  
      try {
        // Create reference to bookings collection
        const bookingsRef = collection(db, "bookings");
        
        // Create query to filter bookings:
        // - Assigned to current staff member
        // - With approved status
        const q = query(
          bookingsRef,
          where("facilityStaff", "==", user.uid),
          where("status", "==", "approved")
        );
  
        // Execute query and get snapshot
        const querySnapshot = await getDocs(q);
        
        // Extract booking data from documents
        const bookingsData = querySnapshot.docs.map(doc => doc.data());
  
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split("T")[0];
        
        // Filter and sort bookings:
        // - Only future bookings (including today)
        // - Sorted chronologically
        const filtered = bookingsData
          .filter(b => b.date >= today)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
  
        // Update state with filtered bookings
        setBookings(filtered);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };
  
    // Execute data fetching
    fetchBookings();
  }, []); // Empty dependency array ensures this runs only once on mount
  

  // Component render
  return (
    <main className="staff-upcoming-bookings">
      <div className="container">
        {/* Sidebar navigation - set to active dashboard item */}
        <Sidebar activeItem="dashboard" />
        
        {/* Main content area */}
        <main className="main-content">
          {/* Page header with title and back button */}
          <header className="page-header">
            <h1>Upcoming Bookings</h1>
            <button 
              className="back-btn" 
              onClick={() => navigate("/staff-dashboard")}
            >
              Back
            </button>
          </header>
          
          {/* Bookings table section */}
          <section className="table-section">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Facility Name</th>
                  <th>User</th>
                  <th>Date</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {/* Render each booking as a table row */}
                {bookings.map((b, index) => (
                  <tr key={index}>
                    <td>{b.facilityName}</td>
                    <td>{b.userName}</td>
                    <td>{b.date}</td>
                    <td>{b.slot}</td>
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
