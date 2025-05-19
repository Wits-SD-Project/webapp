import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import Sidebar from "../../components/ResSideBar.js";
import "../../styles/resNotifications.css";
import { format } from "date-fns";

// Define a threshold for "new" notifications
const NEW_NOTIFICATION_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// Helper function to safely convert string to Date
const parseDateString = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date; // Check for invalid dates
};

export default function ResNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, "notifications"),
      where("userName", "==", user.email),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();

        const fetchedNotifications = snapshot.docs.map((doc) => {
          const data = doc.data();

          // Handle createdAt - should already be a Timestamp, but handle undefined
          const createdAtDate = data.createdAt?.toDate
            ? data.createdAt.toDate()
            : parseDateString(data.createdAt);
          const isNew = now - createdAtDate.getTime() < NEW_NOTIFICATION_THRESHOLD_MS;

          let type = "Booking";
          let message = `Your booking for ${data.facilityName} at ${data.slot} was ${data.status}.`;

          if (data.type === "event") {
            type = "Event";
            // Parse start and end times from strings
            const startTime = parseDateString(data.startTime) || new Date(0);
            const endTime = parseDateString(data.endTime) || new Date(0);

            // Format the dates using date-fns, short format
            const formattedStartTime = format(startTime, "PPPp");
            const formattedEndTime = format(endTime, "PPPp");

            message = `New event: ${data.eventName} at ${data.facilityName} from ${formattedStartTime} to ${formattedEndTime}.`;
          }

          // Format the createdAtDate for display, short format
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
        console.error("Error fetching real-time notifications:", err);
        setError("Failed to load notifications. Please try again.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return notifications.filter(
      (notification) =>
        notification.date?.toLowerCase().includes(query) ||
        notification.type?.toLowerCase().includes(query) ||
        notification.message?.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  const newNotifications = useMemo(
    () => filteredNotifications.filter((n) => n.isNew),
    [filteredNotifications]
  );

  const oldNotifications = useMemo(
    () => filteredNotifications.filter((n) => !n.isNew),
    [filteredNotifications]
  );

  const NotificationTable = ({ title, data }) => (
    <section className="table-section">
      <h2>{title} Notifications</h2>
      {data.length === 0 && !loading && (
        <p className="no-notifications-message">
          {searchQuery === ""
            ? `No ${title.toLowerCase()} notifications.`
            : `No ${title.toLowerCase()} notifications found matching your search.`}
        </p>
      )}
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

  return (
    <main className="notifications">
      <div className="container">
        <Sidebar activeItem="notifications" />

        <main className="main-content">
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

          {loading && <p className="loading-message">Loading notifications...</p>}
          {error && <p className="error-message">{error}</p>}

          {!loading && !error && (
            <>
              <NotificationTable title="New" data={newNotifications} />
              <NotificationTable title="Past" data={oldNotifications} />
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

