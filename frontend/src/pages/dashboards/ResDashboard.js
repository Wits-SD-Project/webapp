import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/ResSideBar.js";
import "../../styles/staffDashboard.css";
import { useAuth } from "../../context/AuthContext.js";
import { db, auth } from "../../firebase";
import { motion, AnimatePresence } from "framer-motion";
import { collection, onSnapshot } from "firebase/firestore";

export default function ResDashboard() {
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const username = authUser?.name || "Resident";
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const eventsRef = collection(db, "admin-events");
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      const eventData = snapshot.docs.map(doc => doc.data());
      setEvents(eventData);
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
              <h3>Notifications</h3>
              <AnimatePresence mode="wait">
                <motion.p>
                    You have ??? new notifications. View them now.
                </motion.p>
              </AnimatePresence>
              <button className="view-all-btn" onClick={() => navigate("/res-notifications")}>
                View all
              </button>
            </div>

            <div className="card">
              <h3>Upcoming Events</h3>
              <AnimatePresence mode="wait">
              <motion.p>
                There {events.length === 1 ? "is" : "are"} {events.length} upcoming event{events.length !== 1 ? "s" : ""}. Check them out!
                </motion.p>
              </AnimatePresence>
              <button className="view-all-btn" onClick={() => navigate("/res-events")}>
                View all
              </button>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}
