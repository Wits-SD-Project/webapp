import { useEffect, useState } from "react";
import Sidebar from "../../components/StaffSideBar.js";
import "../../styles/staffViewBookings.css";

import {
  addDoc,
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "../../firebase";

export default function ViewBookings() {
  const [bookings, setBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const fetchBookings = async () => {
      const bookingsRef = collection(db, "bookings");
      const q = query(bookingsRef, where("facilityStaff", "==", user.uid));

      const snapshot = await getDocs(q);
      const bookingsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log(bookingsData);
      setBookings(bookingsData);
    };

    fetchBookings();
  }, []);

  const updateBookingStatus = async (index, newStatus) => {
    const booking = bookings[index];
    const bookingId = booking.id;
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, { status: newStatus });

    // Create notification
    await addDoc(collection(db, "notifications"), {
      userName: booking.userName || booking.user || "unknown",
      facilityName: booking.facilityName,
      status: newStatus,
      slot: booking.slot || booking.datetime,
      createdAt: new Date().toISOString(),
      read: false,
    });

    if (newStatus === "approved") {
      // find the facility by name
      const facilitiesSnapshot = await getDocs(
        collection(db, "facilities-test")
      );
      const facilityDoc = facilitiesSnapshot.docs.find(
        (doc) => doc.data().name === booking.facilityName
      );

      if (facilityDoc) {
        const facilityRef = doc(db, "facilities-test", facilityDoc.id);
        const facilityData = facilityDoc.data();

        const updatedSlots = (facilityData.timeslots || []).map((slot) => {
          if (`${slot.start} - ${slot.end}` === booking.slot) {
            return {
              ...slot,
              isBooked: true,
              bookedBy: booking.userName || booking.user || "Unknown",
            };
          }
          return slot;
        });

        await updateDoc(facilityRef, { timeslots: updatedSlots });
      }
    }

    setBookings((prev) => {
      const updated = [...prev];
      updated[index].status = newStatus;
      return updated;
    });
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

          <section className="table-section">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Facility Name</th>
                  <th>User</th>
                  <th>Date/Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...bookings]
                  .filter((b) => {
                    const query = searchQuery.toLowerCase();
                    return (
                      b.facilityName?.toLowerCase().includes(query) ||
                      b.userName?.toLowerCase().includes(query) ||
                      b.user?.toLowerCase().includes(query) ||
                      b.date?.toLowerCase().includes(query) ||
                      b.slot?.toLowerCase().includes(query) ||
                      b.status?.toLowerCase().includes(query)
                    );
                  })
                  .sort((a, b) =>
                    a.status === "pending" ? -1 : b.status === "pending" ? 1 : 0
                  )
                  .map((b, index) => (
                    <tr key={index}>
                      <td>{b.facilityName}</td>
                      <td>{b.userName || b.user || "—"}</td>
                      <td>{b.date || "—"}</td> {/* Show the date */}
                      <td>{b.slot || "—"}</td>{" "}
                      {/* Show the slot for duration */}
                      <td className={`status ${b.status.toLowerCase()}`}>
                        {b.status}
                      </td>
                      <td className="actions">
                        {b.status === "pending" ? (
                          <>
                            <button
                              className="approve"
                              onClick={() =>
                                updateBookingStatus(index, "approved")
                              }
                            >
                              Approve
                            </button>
                            <button
                              className="reject"
                              onClick={() =>
                                updateBookingStatus(index, "rejected")
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
