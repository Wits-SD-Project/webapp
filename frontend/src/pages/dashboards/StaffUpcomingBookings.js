import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import Sidebar from "../../components/SideBar.js";
import "../../styles/staffUpcomingBookings.css";

export default function StaffUpcomingBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "bookings"));
        const bookingsData = querySnapshot.docs.map(doc => doc.data());

        const today = new Date().toISOString().split("T")[0];
        const filtered = bookingsData
          .filter(b => b.status === "approved" && b.date >= today)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        setBookings(filtered);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    fetchBookings();
  }, []);

  return (
    <main className="staff-upcoming-bookings">
      <div className="container">
        <Sidebar activeItem="dashboard" />
        <main className="main-content">
          <header className="page-header">
            <h1>Upcoming Bookings</h1>
            <button className="back-btn" onClick={() => navigate("/staff-dashboard")}>Back</button>
          </header>
          <section className="table-section">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Facility Name</th>
                  <th>User</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, index) => (
                  <tr key={index}>
                    <td>{b.facilityName}</td>
                    <td>{b.userName}</td>
                    <td>{b.date}</td>
                    <td>{b.slot}</td>
                    <td>{b.duration}</td>
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