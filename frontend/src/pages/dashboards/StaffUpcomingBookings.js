import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db,auth } from "../../firebase";
import { collection, getDocs,query ,where } from "firebase/firestore";
import Sidebar from "../../components/StaffSideBar.js";
import "../../styles/staffUpcomingBookings.css";

export default function StaffUpcomingBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      const user = auth.currentUser;
      if (!user) return;
  
      try {
        const bookingsRef = collection(db, "bookings");
        const q = query(
          bookingsRef,
          where("facilityStaff", "==", user.uid),
          where("status", "==", "approved")
        );
  
        const querySnapshot = await getDocs(q);
        const bookingsData = querySnapshot.docs.map(doc => doc.data());
  
        const today = new Date().toISOString().split("T")[0];
        const filtered = bookingsData
          .filter(b => b.date >= today)
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
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, index) => (
                  <tr key={index}>
                    <td>{b.facilityName}</td>
                    <td>{b.userName}</td>
                    <td>{b.date}</td>
                    <td>{b.slot}</td>
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