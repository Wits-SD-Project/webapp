import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";
import Sidebar from "../../components/ResSideBar.js";
import "../../styles/resNotifications.css";

export default function ResNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchNotifications = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const q = query(
          collection(db, "notifications"),
          where("userName", "==", user.email) // match your field
        );
        const snapshot = await getDocs(q);

        const fetchedNotifications = snapshot.docs.map((doc) => {
          const data = doc.data();
          const isBooking = data.facilityName && data.slot && data.status;
          const isEvent = data.eventName && data.facility && data.startTime && data.endTime;

          if (isBooking) {
            return {
              date: new Date(data.createdAt).toLocaleString(),
              type: "Booking",
              message: `Your booking for ${data.facilityName} at ${data.slot} was ${data.status}.`,
            };
          } else if (isEvent) {
            return {
              date: new Date(data.createdAt).toLocaleString(),
              type: "Event",
              message: `New event '${data.eventName}' at ${data.facility} from ${new Date(data.startTime).toLocaleString()} to ${new Date(data.endTime).toLocaleString()}.`,
            };
          } else {
            return {
              date: new Date(data.createdAt).toLocaleString(),
              type: "General",
              message: "You have a new notification.",
            };
          }
        });

        setNotifications(fetchedNotifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, []);

  return (
    <main className="notifications">
      <div className="container">
        <Sidebar activeItem="notifications" />

        <main className="main-content">
          <header className="page-header">
            <h1>Notifications</h1>
            <input
              type="search"
              placeholder="Search"
              className="search-box"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </header>

          <section className="table-section">
            <table className="notifications-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {notifications
                  .filter((notification) => {
                    const query = searchQuery.toLowerCase();
                    return (
                      notification.date?.toLowerCase().includes(query) ||
                      notification.type?.toLowerCase().includes(query) ||
                      notification.message?.toLowerCase().includes(query)
                    );
                  })
                  .map((notification, index) => (
                    <tr key={index}>
                      <td>{notification.date}</td>
                      <td>{notification.type}</td>
                      <td>{notification.message}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        </main>
      </div>
    </main>
  );
}
