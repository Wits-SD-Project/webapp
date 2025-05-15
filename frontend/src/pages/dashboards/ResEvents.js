import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import Sidebar from "../../components/ResSideBar";
import { auth } from "../../firebase";
import "../../styles/ResEvents.css";

export default function ResEvents() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    console.log("Current user:", auth.currentUser);
    const unsubscribe = onSnapshot(collection(db, "admin-events"), (snapshot) => {
      const fetchedEvents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      console.log("Fetched events from Firestore:", fetchedEvents);
      setEvents(fetchedEvents);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="dashboard">
      <Sidebar activeItem="events" />
      <div className="main-content">
        <h1>Upcoming Events</h1>
        {events.length === 0 ? (
          <p>No upcoming events available.</p>
        ) : (
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                <strong>{event.eventName}</strong><br />
                <em>
                  {new Date(event.startTime).toLocaleString()} -{" "}
                  {new Date(event.endTime).toLocaleString()}
                </em><br />
                <p>Facility: {event.facility}</p>
                {event.description && <p>{event.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}