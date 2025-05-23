import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/StaffSideBar.js";
import "../../styles/staffUpcomingBookings.css";
import { getAuthToken } from "../../firebase";

export default function StaffUpcomingBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUpcomingBookings = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/admin/staff-upcoming-bookings`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch upcoming bookings");
      }

      const data = await response.json();
      setBookings(data.bookings);
    } catch (err) {
      console.error("Error fetching upcoming bookings:", err);
      setError(err.message || "Failed to load upcoming bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingBookings();
  }, []);

  return (
    <main className="staff-upcoming-bookings">
      <div className="container">
        <Sidebar activeItem="dashboard" />
        <main className="main-content">
          <header className="page-header">
            <h1>Upcoming Bookings</h1>
            <button 
              className="back-btn" 
              onClick={() => navigate("/staff-dashboard")}
            >
              Back
            </button>
          </header>

          {loading ? (
            <p className="loading-message">Loading upcoming bookings...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : (
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
                  {bookings.length > 0 ? (
                    bookings.map((booking, index) => (
                      <tr key={index}>
                        <td>{booking.facilityName}</td>
                        <td>{booking.userName}</td>
                        <td>{booking.date}</td>
                        <td>{booking.slot}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="no-bookings">
                        No upcoming bookings found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}
        </main>
      </div>
    </main>
  );
}