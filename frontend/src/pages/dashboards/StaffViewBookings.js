// Import React hooks for state and lifecycle management
import { useEffect, useState, useCallback } from "react";
// Import components and styles
import Sidebar from "../../components/StaffSideBar.js";
import "../../styles/staffViewBookings.css";
// Import Firebase Firestore utilities
import {
  addDoc,
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
// Import Firebase services
import { db, auth } from "../../firebase";

export default function ViewBookings() {
  // State management
  const [bookings, setBookings] = useState([]); // Stores all bookings
  const [searchQuery, setSearchQuery] = useState(""); // Search filter input

  /**
   * Fetches bookings for the currently signed-in staff member
   * @param {string} uid - Staff member's user ID
   * @returns {Promise<void>}
   */
  const fetchBookings = useCallback(async (uid) => {
    if (!uid) return;
    
    try {
      // Query bookings assigned to this staff member
      const snap = await getDocs(
        query(collection(db, "bookings"), where("facilityStaff", "==", uid))
      );
      
      // Transform documents to include ID and data
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  }, []);

  /**
   * Effect hook to refresh bookings when auth state changes
   * Automatically unsubscribes when component unmounts
   */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => fetchBookings(u?.uid));
    return unsub;
  }, [fetchBookings]);

  /**
   * Helper function to weight statuses for stable sorting
   * @param {string} s - Booking status
   * @returns {number} Weight value for sorting
   */
  const weight = (s) => ({ pending: 0, approved: 1, rejected: 2 }[s] ?? 3);

  /**
   * Handles updating booking status (approve/reject)
   * @param {string} bookingId - ID of the booking to update
   * @param {string} newStatus - New status ("approved" or "rejected")
   * @returns {Promise<void>}
   */
  const updateBookingStatus = async (bookingId, newStatus) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    try {
      /* ─────────── 1. Update booking document ─────────── */
      await updateDoc(doc(db, "bookings", bookingId), { status: newStatus });

      /* ─────────── 2. Create notification ─────────── */
      await addDoc(collection(db, "notifications"), {
        userName: booking.userName ?? booking.user ?? "Unknown",
        facilityName: booking.facilityName,
        status: newStatus,
        slot: booking.slot ?? booking.datetime ?? "",
        createdAt: serverTimestamp(),
        read: false,
      });

      /* ─────────── 3. Handle slot booking if approved ─────────── */
      if (newStatus === "approved") {
        const facSnap = await getDocs(
          query(
            collection(db, "facilities-test"),
            where("name", "==", booking.facilityName)
          )
        );
        const facDoc = facSnap.docs[0];
        
        if (facDoc) {
          const facRef = facDoc.ref;
          const facData = facDoc.data();
          
          // Update the specific timeslot to mark as booked
          const updatedSlots = (facData.timeslots ?? []).map((s) =>
            `${s.start} - ${s.end}` === booking.slot
              ? {
                  ...s,
                  isBooked: true,
                  bookedBy: booking.userName ?? booking.user ?? "Unknown",
                }
              : s
          );
          
          await updateDoc(facRef, { timeslots: updatedSlots });
        }
      }

      /* ─────────── 4. Update local state ─────────── */
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
    } catch (err) {
      console.error("updateBookingStatus error:", err);
    }
  };

  return (
    <main className="view-bookings">
      <div className="container">
        {/* Sidebar navigation - highlights "view bookings" */}
        <Sidebar activeItem="view bookings" />

        {/* Main content area */}
        <main className="main-content">
          {/* Page header with title and search */}
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

          {/* Bookings table section */}
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
                {/* Process bookings: filter, sort, then map */}
                {[...bookings]
                  // Filter based on search query (case-insensitive)
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
                  // Sort by status weight (pending → approved → rejected)
                  .sort((a, b) => weight(a.status) - weight(b.status))
                  // Render each booking as a table row
                  .map((b) => (
                    <tr key={b.id}>
                      <td>{b.facilityName}</td>
                      <td>{b.userName ?? b.user ?? "—"}</td>
                      <td>{b.date ?? "—"}</td>
                      <td>{b.slot ?? "—"}</td>
                      {/* Status with dynamic CSS class */}
                      <td className={`status ${b.status?.toLowerCase()}`}>
                        {b.status}
                      </td>
                      {/* Action buttons (context-sensitive) */}
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
        </main>
      </div>
    </main>
  );
}
