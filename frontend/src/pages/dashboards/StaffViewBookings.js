import { useEffect, useState } from "react";
import Sidebar from "../../components/SideBar.js";
import "../../styles/staffViewBookings.css";

import { addDoc, doc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";



//import data from db - dummy data for now
const dummyBookings = [
    {
        facilityName: "Wanderers",
        facilityType: "Cricket Ground",
        user: "Priyanka Gohil",
        datetime: "2025-06-17 14:00",
        duration: "1.5 hrs",
        status: "pending",
        id: "1"
      },
      {
        facilityName: "Olympic Arena",
        facilityType: "Swimming Pool #2",
        user: "Jane Doe",
        datetime: "2025-06-17 16:00",
        duration: "2 hrs",
        status: "approved",
        id: "2"
      },
      {
        facilityName: "City Dome",
        facilityType: "Basketball Court #1",
        user: "John Stark",
        datetime: "2025-06-18 09:00",
        duration: "1 hr",
        status: "pending",
        id: "3"
      },
      {
        facilityName: "West Field",
        facilityType: "Football Pitch",
        user: "Bruce Banner",
        datetime: "2025-06-18 19:00",
        duration: "1.5 hrs",
        status: "rejected",
        id: "4"
      },
      {
        facilityName: "Indoor Zone",
        facilityType: "Badminton Court",
        user: "Natasha R.",
        datetime: "2025-06-19 11:00",
        duration: "1 hr",
        status: "approved",
        id: "5"
      },
      {
        facilityName: "Grand Arena",
        facilityType: "Volleyball Court",
        user: "Peter Parker",
        datetime: "2025-06-20 13:00",
        duration: "2 hrs",
        status: "pending",
        id: "6"
      },
      {
        facilityName: "Sky Hall",
        facilityType: "Gym",
        user: "Tony Stark",
        datetime: "2025-06-20 15:00",
        duration: "1 hr",
        status: "approved",
        id: "7"
      },
      {
        facilityName: "Zen Center",
        facilityType: "Yoga Room",
        user: "Wanda M.",
        datetime: "2025-06-21 09:30",
        duration: "1.5 hrs",
        status: "pending",
        id: "8"
      },
      {
        facilityName: "Pro Track",
        facilityType: "Athletics Track",
        user: "Steve Rogers",
        datetime: "2025-06-22 10:00",
        duration: "2 hrs",
        status: "rejected",
        id: "9"
      },
      {
        facilityName: "Game Hub",
        facilityType: "Esports Room",
        user: "Shuri",
        datetime: "2025-06-23 17:00",
        duration: "1 hr",
        status: "approved",
        id: "10"
      },
      {
        facilityName: "Game Hub",
        facilityType: "Esports Room",
        user: "Shuri",
        datetime: "2025-06-23 17:00",
        duration: "1 hr",
        status: "approved",
        id: "11"
      },
      {
        facilityName: "Game Hub",
        facilityType: "Esports Room",
        user: "Shuri",
        datetime: "2025-06-23 17:00",
        duration: "1 hr",
        status: "approved",
        id: "12"
      },
      {
        facilityName: "Game Hub",
        facilityType: "Esports Room",
        user: "Shuri",
        datetime: "2025-06-23 17:00",
        duration: "1 hr",
        status: "approved",
        id: "13"
      }
  
];

export default function ViewBookings() {
  const [bookings, setBookings] = useState([]);

useEffect(() => {
  const fetchBookings = async () => {
    const snapshot = await getDocs(collection(db, "bookings"));
    const bookingsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
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
    userEmail: booking.userName || booking.user || "unknown",
    facilityName: booking.facilityName,
    status: newStatus,
    slot: booking.slot || booking.datetime,
    createdAt: new Date().toISOString(),
    read: false
  } );

    if (newStatus === "approved") {
      // find the facility by name
      const facilitiesSnapshot = await getDocs(collection(db, "facilities-test"));
      const facilityDoc = facilitiesSnapshot.docs.find(doc => doc.data().name === booking.facilityName);

      if (facilityDoc) {
        const facilityRef = doc(db, "facilities-test", facilityDoc.id);
        const facilityData = facilityDoc.data();

        const updatedSlots = (facilityData.timeslots || []).map(slot => {
          if (`${slot.start} - ${slot.end}` === booking.slot) {
            return {
              ...slot,
              isBooked: true,
              bookedBy: booking.userName || booking.user || "Unknown"
            };
          }
          return slot;
        });

        await updateDoc(facilityRef, { timeslots: updatedSlots });
      }
    }

    setBookings(prev => {
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
            <input type="search" placeholder="Search" className="search-box" />
          </header>

          <section className="table-section">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Facility Name</th>
                  <th>Facility Type</th>
                  <th>User</th>
                  <th>Date/Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, index) => (
                  <tr key={index}>
                    <td>{b.facilityName}</td>
                    <td>{b.facilityType || "—"}</td>
                    <td>{b.userName || b.user || "—"}</td>
                    <td>{b.slot || b.datetime || "—"}</td>
                    <td>{b.duration}</td>
                    <td className={`status ${b.status.toLowerCase()}`}>{b.status}</td>
                    <td className="actions">
                      {b.status === "pending" ? (
                        <>
                          <button className="approve" onClick={() => updateBookingStatus(index, "approved")}>Approve</button>
                          <button className="reject" onClick={() => updateBookingStatus(index, "rejected")}>Reject</button>
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
