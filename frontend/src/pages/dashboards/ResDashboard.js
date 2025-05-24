// Import necessary React hooks, components, and libraries
import { useState, useEffect, useRef } from "react"; // React core hooks
import { useNavigate } from "react-router-dom"; // Navigation hook
import Sidebar from "../../components/ResSideBar.js"; // Sidebar component
import "../../styles/staffDashboard.css"; // Component styles
import { useAuth } from "../../context/AuthContext.js"; // Authentication context
import { db, auth, getAuthToken } from "../../firebase"; // Firebase utilities
import { motion, AnimatePresence } from "framer-motion"; // Animation libraries
import { collection, onSnapshot } from "firebase/firestore"; // Firestore utilities

export default function ResDashboard() {
  // Navigation and authentication setup
  const navigate = useNavigate(); // Hook for programmatic navigation
  const { authUser } = useAuth(); // Get authenticated user from context
  const username = authUser?.name || "Resident"; // Fallback to "Resident" if name not available

  // State management
  const [events, setEvents] = useState([]); // Stores upcoming events
  const prevEventCountRef = useRef(0); // Tracks previous event count for comparison
  const [showNewEventBanner, setShowNewEventBanner] = useState(false); // Controls new event banner visibility
  const [unreadCount, setUnreadCount] = useState(0); // Tracks unread notification count

  // Effect for fetching and managing events data
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // 1. Get authentication token
        const token = await getAuthToken();
        
        // 2. Make API request to get upcoming events
        const response = await fetch('http://localhost:8080/api/admin/upcoming', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch events');
        
        // 3. Process response data
        const { events } = await response.json();
        const now = new Date();
        
        // Filter to only include future events
        const upcomingEvents = events.filter(event => new Date(event.startTime) > now);
        
        // 4. Update state with filtered events
        setEvents(upcomingEvents);

        // 5. Check for new events to show banner
        const lastSeenCount = parseInt(localStorage.getItem("lastSeenEventCount") || "0", 10);
        
        if (upcomingEvents.length > lastSeenCount) {
          setShowNewEventBanner(true);
          setTimeout(() => setShowNewEventBanner(false), 8000); // Auto-hide after 8 seconds
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    // Set up polling mechanism (every 30 seconds)
    const pollInterval = setInterval(fetchEvents, 30000);
    fetchEvents(); // Initial fetch
    
    // Cleanup function to clear interval on unmount
    return () => clearInterval(pollInterval);
  }, [authUser]); // Dependency ensures effect runs when authUser changes

  // Effect for fetching unread notifications count
  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      try {
        // 1. Get authentication token
        const token = await getAuthToken();
        
        // 2. Make API request to get unread count
        const response = await fetch('http://localhost:8080/api/admin/unread-count', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch notifications');
        
        // 3. Update state with new count
        const { count } = await response.json();
        setUnreadCount(count);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    // Set up polling mechanism (every 30 seconds)
    const pollInterval = setInterval(fetchUnreadNotifications, 30000);
    fetchUnreadNotifications(); // Initial fetch
    
    // Cleanup function to clear interval on unmount
    return () => clearInterval(pollInterval);
  }, [authUser]); // Dependency ensures effect runs when authUser changes

  // Main component render
  return (
    <main className="dashboard">
      <div className="container">
        {/* Sidebar navigation */}
        <Sidebar activeItem="dashboard" />

        {/* Main content area */}
        <main className="main-content">
          {/* Page header with user greeting */}
          <header className="page-header">
            <h1>Dashboard</h1>
            <div className="user-name">{username}</div>
          </header>

          {/* New event notification banner */}
          {showNewEventBanner && (
            <div className="new-event-banner">
              🎉 A new event has been posted! Check it out under "Upcoming Events".
            </div>
          )}

          {/* Dashboard cards container */}
          <div className="card-container">
            {/* Notifications card */}
            <div className="card">
              <h3>Notifications</h3>
              {/* Animated text for better UX */}
              <AnimatePresence mode="wait">
                <motion.p>
                  You have {unreadCount} new notification{unreadCount !== 1 ? "s" : ""}. View them now.
                </motion.p>
              </AnimatePresence>
              <button 
                className="view-all-btn" 
                onClick={() => navigate("/res-notifications")}
              >
                View all
              </button>
            </div>

            {/* Upcoming Events card */}
            <div className="card">
              <h3>Upcoming Events</h3>
              {/* Animated text for better UX */}
              <AnimatePresence mode="wait">
                <motion.p>
                  There {events.length === 1 ? "is" : "are"} {events.length} upcoming event{events.length !== 1 ? "s" : ""}. Check them out!
                </motion.p>
              </AnimatePresence>
              <button
                className="view-all-btn"
                onClick={() => {
                  // Store current event count before navigation
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
