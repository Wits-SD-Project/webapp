// Import React hooks for state and lifecycle management
import { useState, useEffect, useMemo } from "react";
// Import Firestore database functions
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
// Import Firebase configuration and auth
import { auth, db } from "../../firebase";
// Import sidebar navigation component
import Sidebar from "../../components/ResSideBar.js";
// Import component styles
import "../../styles/resNotifications.css";
// Import date formatting utility
import { format } from "date-fns";

// Define threshold for "new" notifications (24 hours in milliseconds)
const NEW_NOTIFICATION_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Helper function to safely convert string to Date
 * @param {string} dateString - Date string to parse
 * @returns {Date|null} Parsed date or null if invalid
 */
const parseDateString = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date; // Check for invalid dates
};

export default function ResNotifications() {
  // State management for notifications and UI
  const [notifications, setNotifications] = useState([]); // All notifications
  const [searchQuery, setSearchQuery] = useState(""); // Search filter query
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error state

  /**
   * useEffect hook for real-time notification fetching
   * Runs once on component mount and sets up Firestore listener
   */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return; // Skip if no authenticated user
    }

    setLoading(true);
    setError(null);

    // Create query for user-specific notifications, ordered by date
    const q = query(
      collection(db, "notifications"),
      where("userName", "==", user.email), // Filter by user email
      orderBy("createdAt", "desc") // Newest first
    );

    // Set up real-time listener with unsubscribe function
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Success callback
        const now = Date.now();

        // Process each notification document
        const fetchedNotifications = snapshot.docs.map((doc) => {
          const data = doc.data();

          // Handle createdAt date conversion
          const createdAtDate = data.createdAt?.toDate
            ? data.createdAt.toDate() // Convert Firestore Timestamp
            : parseDateString(data.createdAt); // Fallback to string parsing
          
          // Determine if notification is "new" (within 24 hours)
          const isNew = now - createdAtDate.getTime() < NEW_NOTIFICATION_THRESHOLD_MS;

          // Default to Booking notification type
          let type = "Booking";
          let message = `Your booking for ${data.facilityName} at ${data.slot} was ${data.status}.`;

          // Handle Event notification type
          if (data.type === "event") {
            type = "Event";
            // Parse and format event times
            const startTime = parseDateString(data.startTime) || new Date(0);
            const endTime = parseDateString(data.endTime) || new Date(0);
            const formattedStartTime = format(startTime, "PPPp"); // "Month day, year, time"
            const formattedEndTime = format(endTime, "PPPp");
            
            message = `New event: ${data.eventName} at ${data.facilityName} from ${formattedStartTime} to ${formattedEndTime}.`;
          }

          // Format the display date
          const formattedDate = format(createdAtDate, "PPPp");

          return {
            id: doc.id,
            date: formattedDate,
            type,
            message,
            isNew,
          };
        });

        setNotifications(fetchedNotifications);
        setLoading(false);
      },
      (err) => {
        // Error callback
        console.error("Error fetching real-time notifications:", err);
        setError("Failed to load notifications. Please try again.");
        setLoading(false);
      }
    );

    // Cleanup function to unsubscribe when component unmounts
    return () => unsubscribe();
  }, []); // Empty dependency array means this runs once on mount

  /**
   * Memoized filtered notifications based on search query
   * Optimized to only recalculate when notifications or searchQuery change
   */
  const filteredNotifications = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return notifications.filter(
      (notification) =>
        notification.date?.toLowerCase().includes(query) ||
        notification.type?.toLowerCase().includes(query) ||
        notification.message?.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  /**
   * Memoized new notifications (within 24 hours)
   * Derived from filteredNotifications
   */
  const newNotifications = useMemo(
    () => filteredNotifications.filter((n) => n.isNew),
    [filteredNotifications]
  );

  /**
   * Memoized old notifications (older than 24 hours)
   * Derived from filteredNotifications
   */
  const oldNotifications = useMemo(
    () => filteredNotifications.filter((n) => !n.isNew),
    [filteredNotifications]
  );

  /**
   * Reusable NotificationTable component
   * @param {object} props - Component props
   * @param {string} props.title - Section title ("New" or "Past")
   * @param {Array} props.data - Notifications data to display
   */
  const NotificationTable = ({ title, data }) => (
    <section className="table-section">
      <h2>{title} Notifications</h2>
      {/* Empty state message */}
      {data.length === 0 && !loading && (
        <p className="no-notifications-message">
          {searchQuery === ""
            ? `No ${title.toLowerCase()} notifications.`
            : `No ${title.toLowerCase()} notifications found matching your search.`}
        </p>
      )}
      {/* Notification table */}
      {data.length > 0 && (
        <table className="notifications-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {data.map((notification) => (
              <tr
                key={notification.id}
                className={notification.isNew ? "notification-new" : ""}
              >
                <td>{notification.date}</td>
                <td>{notification.type}</td>
                <td>{notification.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );

  // Component render
  return (
    <main className="notifications">
      <div className="container">
        {/* Sidebar navigation */}
        <Sidebar activeItem="notifications" />

        {/* Main content area */}
        <main className="main-content">
          {/* Page header with search */}
          <header className="page-header">
            <h1>Notifications</h1>
            <input
              type="search"
              placeholder="Search notifications..."
              className="search-box"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </header>

          {/* Loading and error states */}
          {loading && <p className="loading-message">Loading notifications...</p>}
          {error && <p className="error-message">{error}</p>}

          {/* Main content when not loading and no errors */}
          {!loading && !error && (
            <>
              {/* New notifications section */}
              <NotificationTable title="New" data={newNotifications} />
              {/* Past notifications section */}
              <NotificationTable title="Past" data={oldNotifications} />
              {/* No search results message */}
              {notifications.length > 0 &&
                filteredNotifications.length === 0 &&
                searchQuery !== "" && (
                  <p className="no-match-message">
                    No notifications found matching "{searchQuery}".
                  </p>
                )}
            </>
          )}
        </main>
      </div>
    </main>
  );
}
