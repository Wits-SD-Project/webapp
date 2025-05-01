import { useEffect, useState } from "react";
import Sidebar from "../../components/ResSideBar.js";
import "../../styles/resNotifications.css";

export default function ResNotifications() {
 //dummy data
  const [notifications, setNotifications] = useState([
    {
      date: "2023-05-15 10:30 AM",
      type: "Booking",
      message: "Your booking has been approved!"
    },
    {
      date: "2023-05-16 02:15 PM",
      type: "Maintenance",
      message: "Pool area will be closed for maintenance from 3 PM to 5 PM on May 16."
    },
    {
      date: "2023-05-17 09:00 AM",
      type: "Weather",
      message: "Heavy rain expected today. Please take precautions on the tennis court."
    },
    {
      date: "2023-05-18 04:45 PM",
      type: "Event",
      message: "New fitness class added to the schedule."
    },
    {
      date: "2023-05-19 11:20 AM",
      type: "Booking",
      message: "Your booking request has been rejected."
    }
  ]);
  const [searchQuery, setSearchQuery] = useState("");

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