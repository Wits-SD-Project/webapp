import { useEffect, useState, useCallback } from "react";
import Sidebar from "../../components/StaffSideBar.js";
import "../../styles/staffViewBookings.css";
import { getAuthToken } from "../../firebase";

export default function ViewBookings() {
  const [bookings, setBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ───── helper: fetch bookings for the signed-in staff member ───── */
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/admin/view-bookings`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await response.json();
      setBookings(data.bookings);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  /* refresh when component mounts */
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  /* weight for a stable sort: pending → approved → rejected */
  const weight = (s) => ({ pending: 0, approved: 1, rejected: 2 }[s] ?? 3);

  /* ─────────── approve / reject handler ─────────── */
  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/admin/${bookingId}/status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update booking status");
      }

      // Update UI
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
    } catch (err) {
      console.error("updateBookingStatus error:", err);
      setError(err.message || "Failed to update booking status");
    }
  };

  return (
    <main className="view-bookings">
      <div className="container">
        <Sidebar activeItem="view bookings" />

        <main className="main-content">
          <header className="page-header">
            <h1>View Bookings</h1>
            <input
              type="search"
              placeholder="Search"
              className="search-box"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </header>

          {loading ? (
            <p className="loading-message">Loading bookings...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : (
            <section className="table-section">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Facility</th>
                    <th>User</th>
                    <th>Date</th>
                    <th>Slot</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {[...bookings]
                    .filter((b) => {
                      const q = searchQuery.toLowerCase();
                      return (
                        (b.facilityName ?? "").toLowerCase().includes(q) ||
                        (b.userName ?? b.user ?? "").toLowerCase().includes(q) ||
                        (b.date ? b.date.toString() : "")
                          .toLowerCase()
                          .includes(q) ||
                        (b.slot ?? "").toLowerCase().includes(q) ||
                        (b.status ?? "").toLowerCase().includes(q)
                      );
                    })
                    .sort((a, b) => weight(a.status) - weight(b.status))
                    .map((b) => (
                      <tr key={b.id}>
                        <td>{b.facilityName}</td>
                        <td>{b.userName ?? b.user ?? "—"}</td>
                        <td>{b.date ?? "—"}</td>
                        <td>{b.slot ?? "—"}</td>
                        <td className={`status ${b.status?.toLowerCase()}`}>
                          {b.status}
                        </td>
                        <td className="actions">
                          {b.status === "pending" ? (
                            <>
                              <button
                                className="approve"
                                onClick={() =>
                                  updateBookingStatus(b.id, "approved")
                                }
                              >
                                Approve
                              </button>
                              <button
                                className="reject"
                                onClick={() =>
                                  updateBookingStatus(b.id, "rejected")
                                }
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <button className="view">View</button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          )}
        </main>
      </div>
    </main>
  );
}