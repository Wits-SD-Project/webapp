import React, { useEffect, useState } from "react";
import { db } from "../../firebase"; // Firestore config
import { doc, updateDoc } from "firebase/firestore";
import { collection, getDocs, query, where } from "firebase/firestore";
import Navbar from "../../components/Navbar";

export default function UserDashboard() {
  const [facilities, setFacilities] = useState([]);

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
      // Update the slot to mark it as booked
      const updatedTimeslots = (facility.timeslots || []).map(s =>
        s.day === slot.day && s.start === slot.start && s.end === slot.end
          ? { ...s, isBooked: true, bookedBy: "test-user-id" } // Replace with actual user ID if available
          : s
      );

      // Update the facility document in Firestore
      const facilityRef = doc(db, "facilities-test", facility.id);
      await updateDoc(facilityRef, { timeslots: updatedTimeslots });

      alert(`Booking confirmed for ${facility.name} on ${slot.day} at ${slot.start}.`);
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
