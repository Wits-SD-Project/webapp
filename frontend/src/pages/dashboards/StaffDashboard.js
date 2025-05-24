// Import React hooks for state and lifecycle management
import { useState, useEffect } from "react";
// Import routing utilities
import { useNavigate } from "react-router-dom";
// Import sidebar navigation component
import Sidebar from "../../components/StaffSideBar.js";
// Import component styles
import "../../styles/staffDashboard.css";
// Import authentication context
import { useAuth } from "../../context/AuthContext.js";
// Import Firestore database functions
import { collection, query, where, onSnapshot } from "firebase/firestore";
// Import Firebase configuration
import { db, auth } from "../../firebase";
// Import animation libraries
import { motion, AnimatePresence } from "framer-motion";

export default function StaffDashboard() {
  // Initialize navigation hook
  const navigate = useNavigate();
  // Get authenticated user from context
  const { authUser } = useAuth();
  // Get username or fallback to "Staff"
  const username = authUser?.name || "Staff";

  // State management for dashboard metrics
  const [upcomingCount, setUpcomingCount] = useState(0); // Count of upcoming bookings
  const [pendingCount, setPendingCount] = useState(0); // Count of pending approvals
  const [daysUntilNext, setDaysUntilNext] = useState(null); // Days until next booking

  /**
   * useEffect hook for real-time booking data fetching
   * Runs when authUser changes to ensure proper user context
   */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return; // Skip if no authenticated user

    // Get current date in YYYY-MM-DD format for comparison
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Create query for bookings assigned to current staff member
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("facilityStaff", "==", user.uid) // Filter by staff UID
    );

    // Set up real-time listener with unsubscribe function
    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      let upcomingBookings = []; // Store upcoming approved bookings
      let pending = 0; // Counter for pending approvals

      // Process each booking document
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Check for approved bookings with future dates
        if (data.status === "approved" && data.date >= todayStr) {
          upcomingBookings.push(data);
        }
        // Count pending approval requests
        if (data.status === "pending") {
          pending++;
        }
      });

      // Sort upcoming bookings chronologically
      upcomingBookings.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Update state with processed data
      setUpcomingCount(upcomingBookings.length);
      setPendingCount(pending);

      // Calculate days until next booking if any exist
      if (upcomingBookings.length > 0) {
        const nextBookingDate = new Date(upcomingBookings[0].date);
        const diffTime = nextBookingDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysUntilNext(diffDays);
      } else {
        setDaysUntilNext(null); // Reset if no upcoming bookings
      }
    });

    // Cleanup function to unsubscribe when component unmounts
    return () => unsubscribe();
  }, [authUser]); // Dependency ensures updates when auth state changes

  // Component render
  return (
    <main className="dashboard">
      <div className="container">
        {/* Sidebar navigation */}
        <Sidebar activeItem="dashboard" />

        {/* Main content area */}
        <main className="main-content">
          {/* Page header with username display */}
          <header className="page-header">
            <h1>Dashboard</h1>
            <div className="user-name">{username}</div>
          </header>

          {/* Dashboard cards container */}
          <div className="card-container">
            {/* Upcoming Bookings Card */}
            <div className="card">
              <h3>Upcoming facility bookings</h3>
              {/* Animated count display */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={upcomingCount + "-" + daysUntilNext} // Unique key for animation
                  initial={{ opacity: 0, y: -10 }} // Start state
                  animate={{ opacity: 1, y: 0 }} // Animation state
                  exit={{ opacity: 0, y: 10 }} // Exit state
                  transition={{ duration: 0.5 }} // Animation duration
                >
                  {upcomingCount > 0
                    ? `You have ${upcomingCount} upcoming bookings. Next one is in ${daysUntilNext} day(s)!`
                    : "No upcoming bookings"}
                </motion.p>
              </AnimatePresence>
              {/* Navigation button */}
              <button 
                className="view-all-btn" 
                onClick={() => navigate("/staff-upcoming-bookings")}
              >
                View all
              </button>
            </div>

            {/* Pending Applications Card */}
            <div className="card">
              <h3>Pending Applications</h3>
              {/* Animated count display */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={pendingCount} // Unique key for animation
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.5 }}
                >
                  {pendingCount} booking requests awaiting your approval
                </motion.p>
              </AnimatePresence>
              {/* Navigation button */}
              <button 
                className="view-all-btn" 
                onClick={() => navigate("/staff-view-bookings")}
              >
                View all
              </button>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}
