import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase"; // Firestore config and auth
import { collection, getDocs, query, where } from "firebase/firestore";
import Navbar from "../../components/Navbar";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-toastify";

export default function UserDashboard() {
  const [facilities, setFacilities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  

  useEffect(() => {
    const fetchNotifications = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const q = query(
          collection(db, "notifications"),
          where("userName", "==", user.displayName)
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

  useEffect(() => {

    const fetchFacilities = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "facilities-test"));
        const facilitiesData = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const facility = { id: doc.id, ...doc.data() };

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

  const startBooking = (facility, slot) => {
    setSelectedFacility(facility);
    setSelectedSlot(slot);
    setShowDatePicker(true);
  };

  const confirmBooking = async (date) => {
    if (!selectedSlot || !selectedFacility) return;


    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const selectedDay = daysOfWeek[date.getDay()];

    if (selectedDay !== selectedSlot.day) {
      toast.error(`Please select a date that falls on a ${selectedSlot.day}. You picked a ${selectedDay}.`);
      return;
    }

    const [startHour, startMinute] = selectedSlot.start.split(":").map(Number);
    const slotStartDateTime = new Date(date);
    slotStartDateTime.setHours(startHour, startMinute, 0, 0);
  
    const now = new Date();
  
    if (slotStartDateTime < now) {
      toast.error("This time slot has already passed. Please select a future time.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

      const slotTime = `${selectedSlot.start} - ${selectedSlot.end}`;

      const response = await fetch('http://localhost:8080/api/facilities/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          facilityId: selectedFacility.id,
          facilityName: selectedFacility.name,
          slot: slotTime,
          selectedDate: date.toISOString().split('T')[0],
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to book slot');
      }

      toast.success(`Booking confirmed for ${selectedFacility.name} on ${date.toDateString()} at ${selectedSlot.start}.`);
    } catch (error) {
      console.error("Error booking timeslot:", error);
      toast.error(error.message || "Failed to book the timeslot.");
    } finally {
      setSelectedSlot(null);
      setSelectedFacility(null);
      setShowDatePicker(false);
    }
  };

  return (
    <>
      <Navbar />
      <main style={{ padding: "2rem" }}>
        <h1>Available Facility Time Slots</h1>

        {/* Notifications */}
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

        <div style={{ marginBottom: "1.5rem" }}>
          <input
            type="text"
            placeholder="Search facilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />
        </div>
        {/* Facilities List */}
        {facilities.length === 0 ? (
          <p>Loading facilities...</p>
        ) : (
          <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "1rem" }}>
            {facilities
              .filter((facility) =>
                facility.name.toLowerCase().includes(searchQuery.toLowerCase())
              ).map(facility => (
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
                              onClick={() => startBooking(facility, slot)}
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

        {/* Date Picker Modal */}
        {showDatePicker && (
          <div style={{
            position: "fixed",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#fff",
            padding: "2rem",
            borderRadius: "8px",
            boxShadow: "0 0 10px rgba(0,0,0,0.3)",
            zIndex: 1000
          }}>
            <h2>Select Booking Date</h2>
            <DatePicker
              selected={null}
              onChange={(date) => confirmBooking(date)}
              minDate={new Date()}
              inline
            />
            <button
              onClick={() => {
                setShowDatePicker(false);
                setSelectedSlot(null);
                setSelectedFacility(null);
              }}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#dc3545",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </main>
    </>
  );
}
