import { useState, useEffect, useMemo } from "react";
import Sidebar from "../../components/ResSideBar.js";
import "../../styles/resNotifications.css";
import { format } from "date-fns";
import { getAuthToken } from "../../firebase";

const NEW_NOTIFICATION_THRESHOLD_MS = 24 * 60 * 60 * 1000;

const parseDateString = (dateInput) => {
  if (!dateInput) return null;
  const date = new Date(dateInput);
  return isNaN(date.getTime()) ? null : date;
};

export default function ResNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/admin/get-notifications`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      const now = Date.now();

      const formattedNotifications = data.notifications.map((item) => {
        const createdAtDate = parseDateString(item.createdAt);
        const isNew = createdAtDate && 
          now - createdAtDate.getTime() < NEW_NOTIFICATION_THRESHOLD_MS;

        let type = item.type === "event" ? "Event" : "Booking";
        let message;

        if (type === "Event") {
          const startTime = parseDateString(item.startTime) || new Date(0);
          const endTime = parseDateString(item.endTime) || new Date(0);

          message = `New event: ${item.eventName} at ${item.facilityName} from ${
            format(startTime, "PPPp")
          } to ${
            format(endTime, "PPPp")
          }.`;
        } else {
          message = `Your booking for ${item.facilityName} at ${item.slot} was ${item.status}.`;
        }

        return {
          id: item.id,
          date: createdAtDate ? format(createdAtDate, "PPPp") : "Invalid date",
          type,
          message,
          isNew,
        };
      });

      setNotifications(formattedNotifications);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Optional: Set up polling if you want near real-time updates
    const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
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

