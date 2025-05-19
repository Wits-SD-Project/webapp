import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/ResSideBar.js";
import "../../styles/staffDashboard.css";
import { useAuth } from "../../context/AuthContext.js";
import { db, auth ,getAuthToken} from "../../firebase";
import { motion, AnimatePresence } from "framer-motion";
import { collection, onSnapshot } from "firebase/firestore";

export default function ResDashboard() {
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const username = authUser?.name || "Resident";
  const [events, setEvents] = useState([]);
  const prevEventCountRef = useRef(0);
  const [showNewEventBanner, setShowNewEventBanner] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
  const fetchEvents = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('http://localhost:8080/api/admin/upcoming', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch events');
      
      const { events } = await response.json();
      const now = new Date();
      const upcomingEvents = events.filter(event => new Date(event.startTime) > now);
      
      setEvents(upcomingEvents);

      const lastSeenCount = parseInt(localStorage.getItem("lastSeenEventCount") || "0", 10);
      
      if (upcomingEvents.length > lastSeenCount) {
        setShowNewEventBanner(true);
        setTimeout(() => setShowNewEventBanner(false), 8000);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  // Polling instead of real-time (adjust interval as needed)
  const pollInterval = setInterval(fetchEvents, 30000); // Every 30 seconds
  fetchEvents(); // Initial fetch
  
  return () => clearInterval(pollInterval);
}, [authUser]);

useEffect(() => {
  const fetchUnreadNotifications = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('http://localhost:8080/api/admin/unread-count', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      const { count } = await response.json();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Polling for notifications
  const pollInterval = setInterval(fetchUnreadNotifications, 30000);
  fetchUnreadNotifications(); // Initial fetch
  
  return () => clearInterval(pollInterval);
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

          {showNewEventBanner && (
            <div className="new-event-banner">
              🎉 A new event has been posted! Check it out under "Upcoming Events".
            </div>
          )}
          <div className="card-container">
            <div className="card">
              <h3>Notifications</h3>
              <AnimatePresence mode="wait">
                <motion.p>
                    You have {unreadCount} new notification{unreadCount !== 1 ? "s" : ""}. View them now.
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
              <button
                className="view-all-btn"
                onClick={() => {
                  localStorage.setItem("lastSeenEventCount", events.length.toString());
                  navigate("/res-events");
                }}
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
