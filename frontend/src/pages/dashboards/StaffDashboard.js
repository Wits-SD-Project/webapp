import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/SideBar.js";
import "../../styles/staffDashboard.css";
import { useAuth } from "../../context/AuthContext.js";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { motion, AnimatePresence } from "framer-motion";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const username = authUser?.name || "Staff";

  const [upcomingCount, setUpcomingCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [daysUntilNext, setDaysUntilNext] = useState(null); // new

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const bookingsQuery = query(
      collection(db, "bookings"),
      where("facilityStaff", "==", user.uid)
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      let upcomingBookings = [];
      let pending = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === "approved" && data.date >= todayStr) {
          upcomingBookings.push(data);
        }
        if (data.status === "pending") {
          pending++;
        }
      });

      // Sort upcoming bookings by date ascending
      upcomingBookings.sort((a, b) => new Date(a.date) - new Date(b.date));

      setUpcomingCount(upcomingBookings.length);
      setPendingCount(pending);

      if (upcomingBookings.length > 0) {
        const nextBookingDate = new Date(upcomingBookings[0].date);
        const diffTime = nextBookingDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysUntilNext(diffDays);
      } else {
        setDaysUntilNext(null);
      }
    });

    return () => unsubscribe();
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
              <button className="view-all-btn" onClick={() => navigate("/staff-upcoming-bookings")}>
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
              <button className="view-all-btn" onClick={() => navigate("/staff-view-bookings")}>
                View all
              </button>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}
