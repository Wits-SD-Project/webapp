import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/StaffSideBar.js";
import "../../styles/staffDashboard.css";
import { useAuth } from "../../context/AuthContext.js";
import { motion, AnimatePresence } from "framer-motion";
import { getAuthToken } from "../../firebase";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const username = authUser?.name || "staff";

  const [upcomingCount, setUpcomingCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [daysUntilNext, setDaysUntilNext] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/admin/staff-dashboard`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const data = await response.json();
      
      setUpcomingCount(data.data.upcomingCount);
      setPendingCount(data.data.pendingCount);
      setDaysUntilNext(data.data.daysUntilNext);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Set up polling for real-time updates (every 30 seconds)
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [authUser]);

  return (
    <main className="dashboard">
      <div className="container">
        <Sidebar activeItem="dashboard" />

        <main className="main-content">
          <header className="page-header">
            <h1>Dashboard</h1>
            <div className="user-name">{username}</div>
          </header>

          {loading ? (
            <div className="loading-message">Loading dashboard data...</div>
          ) : (
            <div className="card-container">
              <div className="card">
                <h3>Upcoming facility bookings</h3>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={upcomingCount + "-" + daysUntilNext}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.5 }}
                  >
                    {upcomingCount > 0
                      ? `You have ${upcomingCount} upcoming bookings. Next one is in ${daysUntilNext} day(s)!`
                      : "No upcoming bookings"}
                  </motion.p>
                </AnimatePresence>
                <button 
                  className="view-all-btn" 
                  onClick={() => navigate("/staff-upcoming-bookings")}
                >
                  View all
                </button>
              </div>

              <div className="card">
                <h3>Pending Applications</h3>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={pendingCount}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.5 }}
                  >
                    {pendingCount} booking requests awaiting your approval
                  </motion.p>
                </AnimatePresence>
                <button 
                  className="view-all-btn" 
                  onClick={() => navigate("/staff-view-bookings")}
                >
                  View all
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </main>
  );
}