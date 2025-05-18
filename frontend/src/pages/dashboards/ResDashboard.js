import { useState, useEffect, useRef } from "react";
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
  const prevEventCountRef = useRef(0);
  const [showNewEventBanner, setShowNewEventBanner] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const eventsRef = collection(db, "admin-events");
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      const now = new Date();
      const eventData = snapshot.docs.map(doc => doc.data()).filter(event => new Date(event.startTime) > now);
      setEvents(eventData);

      const lastSeenCount = parseInt(localStorage.getItem("lastSeenEventCount") || "0", 10);

      if (eventData.length > lastSeenCount) {
        setShowNewEventBanner(true);

        const timer = setTimeout(() => {
          setShowNewEventBanner(false);
        }, 8000);

        return () => clearTimeout(timer);
      }

      prevEventCountRef.current = eventData.length;
    });

    return () => unsubscribe();
  }, [authUser]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const notificationsRef = collection(db, "notifications");
    const unsubscribeNotifications = onSnapshot(notificationsRef, (snapshot) => {
      const unread = snapshot.docs.filter(
        (doc) => doc.data().userName === user.email && doc.data().read === false
      );
      setUnreadCount(unread.length);
    });

    return () => unsubscribeNotifications();
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
