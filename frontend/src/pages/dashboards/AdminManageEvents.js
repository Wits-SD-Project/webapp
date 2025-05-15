import { useEffect, useRef, useState } from "react";
import Sidebar from "../../components/AdminSideBar.js";
import editIcon from "../../assets/edit.png";
import binIcon from "../../assets/bin.png";
import "../../styles/adminManageEvents.css";
import { getAuthToken } from "../../firebase";
import { toast } from "react-toastify";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase"; // Ensure this import exists at the top of the file
import "./adminManageEvents.css";

export default function AdminManageEvents() {
  const [events, setEvents] = useState([]);
  const [blockFacility, setBlockFacility] = useState(null); // object | null
  const [showBlockRow, setShowBlockRow] = useState(false); // boolean
  const [blockSlotStr, setBlockSlotStr] = useState(""); // string
  const [blockDate, setBlockDate] = useState("");
  const [originalEvents, setOriginalEvents] = useState({});
  const [facilities, setFacilities] = useState([]);
  const tableRef = useRef(null);

  const formatForInput = (date) => {
    if (!date) return "";
    const pad = (num) => num.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const confirmBlock = async () => {
    if (!blockFacility || !blockSlotStr || !blockDate) {
      toast.error("Fill all fields");
      return;
    }
    const [day, slot] = blockSlotStr.split("|");
    // optional: day-of-week guard like the resident flow

    try {
      const token = await getAuthToken();
      const res = await fetch("http://localhost:8080/api/admin/block-slot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facilityId: blockFacility.id,
          facilityName: blockFacility.name,
          slot,
          date: blockDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success("Timeslot blocked");
      setShowBlockRow(false);
    } catch (err) {
      toast.error(err.message || "Failed");
    }
  };

  const parseInputDate = (value) => {
    if (!value) return new Date();
    const [datePart, timePart] = value.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  };

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch("http://localhost:8080/api/admin/facilities", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (data.success) {
          setFacilities(data.facilities);
        } else {
          console.error("API returned success: false");
        }
      } catch (error) {
        console.error("Failed to fetch facilities:", error);
      }
    };

    fetchFacilities();
  }, []);

  // FETCH REAL EVENTS
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch("http://localhost:8080/api/admin/events", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await res.json();
        if (!res.ok)
          throw new Error(result.message || "Failed to fetch events");

        const formatted = result.events.map((event) => ({
          ...event,
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime),
          isEditing: false,
        }));

        setEvents(formatted);
      } catch (error) {
        console.error("Error fetching events:", error);
        toast.error(error.message);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    // Only fire when we have a facility without its slots yet
    if (!blockFacility || blockFacility.timeslots) return;

    (async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(
          "http://localhost:8080/api/facilities/timeslots",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ facilityId: blockFacility.id }),
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to fetch slots");

        // Merge slots into the selected facility object
        setBlockFacility((prev) => ({ ...prev, timeslots: data.timeslots }));
      } catch (err) {
        console.error(err);
        toast.error(err.message || "Could not load timeslots");
      }
    })();
  }, [blockFacility]);

  const handleAddEvent = () => {
    const newEvent = {
      id: Date.now().toString(),
      eventName: "",
      facility: "",
      description: "",
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      isEditing: true,
      isNew: true,
    };

    setEvents((prev) => [...prev, newEvent]);
    setOriginalEvents((prev) => ({ ...prev, [newEvent.id]: { ...newEvent } }));

    setTimeout(() => {
      tableRef.current?.scrollTo({
        top: tableRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  };

  const handleFieldChange = (id, field, value) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleCancelEdit = (id) => {
    const event = events.find((e) => e.id === id);
    if (event.isNew) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } else {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id ? { ...originalEvents[id], isEditing: false } : e
        )
      );
    }
  };

  const handleSaveEvent = async (eventId) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    const payload = {
      eventName: event.eventName,
      facility: event.facility.name,
      facilityId: event.facility.id,
      description: event.description,
      startTime: new Date(event.startTime).toISOString(),
      endTime: new Date(event.endTime).toISOString(),
    };

    try {
      const token = await getAuthToken();
      const url = event.isNew
        ? "http://localhost:8080/api/admin/events"
        : `http://localhost:8080/api/admin/events/${eventId}`;

      const res = await fetch(url, {
        method: event.isNew ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Something went wrong");

      // Push a notification to each resident
      try {
        const usersSnapshot = await getDocs(
          query(collection(db, "users"), where("role", "==", "resident"))
        );
        usersSnapshot.forEach(async (docSnap) => {
          const resident = docSnap.data();
          await addDoc(collection(db, "notifications"), {
            createdAt: new Date().toISOString(),
            facilityName: result.event.facility.name,
            slot: `${formatDateTime(
              new Date(result.event.startTime)
            )} - ${formatDateTime(new Date(result.event.endTime))}`,
            status: "new-event",
            eventName: result.event.eventName,
            userName: resident.email,
            read: false,
            type: "event",
            startTime: result.event.startTime,
            endTime: result.event.endTime,
          });
        });
      } catch (notifyErr) {
        console.error("Error sending event notifications:", notifyErr);
      }

      const updatedEvent = {
        ...result.event,
        startTime: new Date(result.event.startTime),
        endTime: new Date(result.event.endTime),
        isEditing: false,
      };

      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? updatedEvent : e))
      );

      setOriginalEvents((prev) => ({
        ...prev,
        [eventId]: updatedEvent,
      }));

      toast.success(result.message || "Event saved successfully");
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      const token = await getAuthToken();
      const url = `http://localhost:8080/api/admin/events/${eventId}`;

      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to delete event");

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast.success(result.message || "Event deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.message || "An unexpected error occurred");
    }
  };

  const formatDateTime = (date) => {
    if (!date) return "";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="manage-events">
      <div className="container">
        <Sidebar activeItem="manage events" />
        <main className="main-content">
          <header className="page-header">
            <h1>Manage Events</h1>
            <div className="header-actions">
              <button className="action-btn" onClick={handleAddEvent}>
                Add New Event
              </button>

              <button
                className="action-btn secondary"
                onClick={() => setShowBlockRow(true)}
              >
                Block Time Slot
              </button>
            </div>
          </header>

          <section className="table-section" ref={tableRef}>
            <table className="events-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Facility Held At</th>
                  <th>Event Description</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.isEditing ? (
                        <input
                          type="text"
                          value={e.eventName}
                          onChange={(ev) =>
                            handleFieldChange(
                              e.id,
                              "eventName",
                              ev.target.value
                            )
                          }
                          placeholder="Event Name"
                        />
                      ) : (
                        e.eventName
                      )}
                    </td>
                    <td>
                      {e.isEditing ? (
                        <select
                          value={e.facility?.id || ""}
                          onChange={(ev) => {
                            const selected = facilities.find(
                              (f) => f.id === ev.target.value
                            );
                            if (selected)
                              handleFieldChange(e.id, "facility", selected);
                          }}
                        >
                          <option value="" disabled>
                            Select Facility
                          </option>
                          {facilities.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        e.facility?.name
                      )}
                    </td>
                    <td>
                      {e.isEditing ? (
                        <textarea
                          value={e.description}
                          onChange={(ev) =>
                            handleFieldChange(
                              e.id,
                              "description",
                              ev.target.value
                            )
                          }
                          placeholder="Event Description"
                          rows={2}
                        />
                      ) : (
                        e.description
                      )}
                    </td>
                    <td>
                      {e.isEditing ? (
                        <input
                          type="datetime-local"
                          value={formatForInput(e.startTime)}
                          onChange={(ev) =>
                            handleFieldChange(
                              e.id,
                              "startTime",
                              parseInputDate(ev.target.value)
                            )
                          }
                        />
                      ) : (
                        formatDateTime(e.startTime)
                      )}
                    </td>
                    <td>
                      {e.isEditing ? (
                        <input
                          type="datetime-local"
                          value={formatForInput(e.endTime)}
                          onChange={(ev) =>
                            handleFieldChange(
                              e.id,
                              "endTime",
                              parseInputDate(ev.target.value)
                            )
                          }
                          min={formatForInput(e.startTime)}
                        />
                      ) : (
                        formatDateTime(e.endTime)
                      )}
                    </td>
                    <td className="actions">
                      {e.isEditing ? (
                        <>
                          <button
                            className="save-btn"
                            onClick={() => handleSaveEvent(e.id)}
                          >
                            Save
                          </button>
                          <button
                            className="cancel-btn"
                            onClick={() => handleCancelEdit(e.id)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <img
                            src={editIcon}
                            alt="edit"
                            className="icon-btn"
                            onClick={() => {
                              setOriginalEvents((prev) => ({
                                ...prev,
                                [e.id]: { ...e },
                              }));
                              handleFieldChange(e.id, "isEditing", true);
                            }}
                          />
                          <img
                            src={binIcon}
                            alt="delete"
                            className="icon-btn"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to delete "${e.eventName}"?`
                                )
                              ) {
                                handleDeleteEvent(e.id);
                              }
                            }}
                          />
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {showBlockRow && (
                <tr className="editing block-row">
                  {/* Event Name – not used here */}
                  <td className="muted">— (block) —</td>

                  {/* Facility */}
                  <td>
                    <select
                      value={blockFacility?.id || ""}
                      onChange={(e) =>
                        setBlockFacility(
                          facilities.find((f) => f.id === e.target.value)
                        )
                      }
                    >
                      <option value="" disabled>
                        Select facility
                      </option>
                      {facilities.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Description – optional helper text */}
                  <td className="muted">Maintenance / Reserved</td>

                  {/* Start Time column now holds the slot */}
                  <td>
                    {blockFacility?.timeslots?.length > 0 && (
                      <select
                        value={blockSlotStr}
                        onChange={(e) => setBlockSlotStr(e.target.value)}
                      >
                        <option value="" disabled>
                          Select slot
                        </option>
                        {blockFacility.timeslots.map((s, i) => (
                          <option
                            key={i}
                            value={`${s.day}|${s.start} - ${s.end}`}
                          >
                            {s.day} • {s.start} – {s.end}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  {/* End Time column now holds the date */}
                  <td>
                    <input
                      type="date"
                      value={blockDate}
                      onChange={(e) => setBlockDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </td>

                  {/* Actions */}
                  <td className="actions">
                    <button className="save-btn" onClick={confirmBlock}>
                      Save
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() => setShowBlockRow(false)}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              )}
            </table>
          </section>
        </main>
      </div>
    </main>
  );
}
