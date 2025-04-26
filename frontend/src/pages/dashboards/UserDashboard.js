import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase"; // Firestore config and auth
import { doc, updateDoc, addDoc, collection, getDocs, query, where } from "firebase/firestore";
import Navbar from "../../components/Navbar";

export default function UserDashboard() {
  const [facilities, setFacilities] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const user = auth.currentUser;
      if (!user) return;
  
      try {
        const q = query(
          collection(db, "notifications"),
          where("userName", "==", auth.currentUser.displayName)
        );
        const snapshot = await getDocs(q);
        const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotifications(notifs);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };
  
    fetchNotifications();
  }, []);
  


  // Fetch facilities from Firestore
  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "facilities-test"));
        const facilitiesData = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const facility = { id: doc.id, ...doc.data() };

            // Fetch related slots
            const slotsSnapshot = await getDocs(
              query(collection(db, "timeslots-test"), where("facilityId", "==", doc.id))
            );
            const slots = slotsSnapshot.docs.map(slotDoc => slotDoc.data());

            return { ...facility, slots };
          })
        );

        setFacilities(facilitiesData);
      } catch (error) {
        console.error("Error fetching facilities:", error);
      }
    };

    fetchFacilities();
  }, []);

  const handleBooking = async (facility, slot) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

      const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const startMins = parseTime(slot.start);
      const endMins = parseTime(slot.end);
      const diff = endMins - startMins;

      const duration =
        diff % 60 === 0 ? `${diff / 60} hr${diff > 60 ? "s" : ""}` : `${(diff / 60).toFixed(1)} hrs`;

      // Add to bookings collection only (do not modify facility directly)
      await addDoc(collection(db, "bookings"), {
        facilityName: facility.name,
        userName: user.displayName || user.email,
        date: new Date().toISOString().split("T")[0],
        slot: `${slot.start} - ${slot.end}`,
        duration: duration,
        status: "pending",
        createdAt: new Date().toISOString()
      });

      alert(`Booking request submitted for ${facility.name} on ${slot.day} at ${slot.start}.`);
    } catch (error) {
      console.error("Error booking timeslot:", error);
      alert("Failed to book the timeslot.");
    }
  };

  return (
    <>
      <Navbar />
      <main style={{ padding: "2rem" }}>
        <h1>Available Facility Time Slots</h1>
        <section style={{ marginBottom: "2rem" }}>
  <h2>Notifications</h2>
  {notifications.length === 0 ? (
    <p>No notifications yet.</p>
  ) : (
    <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
      {notifications.map((notif) => (
        <li
          key={notif.id}
          style={{
            background: "#f1f1f1",
            padding: "0.8rem",
            borderRadius: "6px",
            marginBottom: "0.5rem",
            borderLeft: notif.status === "approved" ? "5px solid green" : "5px solid red"
          }}
        >
          <strong>{notif.status.toUpperCase()}</strong>: Your booking for <em>{notif.facilityName}</em> at <em>{notif.slot}</em> has been {notif.status}.
        </li>
      ))}
    </ul>
  )}
</section>


        {facilities.length === 0 ? (
          <p>Loading facilities...</p>
        ) : (
          <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "1rem" }}>
            {facilities.map(facility => (
              <div key={facility.id} style={{ marginBottom: "2rem" }}>
                <h2>{facility.name}</h2>
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
                  <thead>
                    <tr>
                      <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: "0.5rem" }}>Day</th>
                      <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: "0.5rem" }}>Start</th>
                      <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: "0.5rem" }}>End</th>
                      <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: "0.5rem" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(facility.timeslots || [])
                      .filter(slot => slot.isBooked === false)
                      .map((slot, index) => (
                        <tr key={index}>
                          <td style={{ padding: "0.5rem" }}>{slot.day}</td>
                          <td style={{ padding: "0.5rem" }}>{slot.start}</td>
                          <td style={{ padding: "0.5rem" }}>{slot.end}</td>
                          <td style={{ padding: "0.5rem" }}>
                            <button
                              style={{
                                padding: "0.3rem 0.6rem",
                                backgroundColor: "#007bff",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer"
                              }}
                              onClick={() => handleBooking(facility, slot)}
                            >
                              Book
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}