import { useEffect, useRef, useState } from "react";
import Sidebar from "../../components/AdminSideBar.js";
import editIcon from "../../assets/edit.png";
import binIcon from "../../assets/bin.png";
import "../../styles/adminManageEvents.css";
import { getAuthToken } from "../../firebase";
import { toast } from "react-toastify";
import EventFormModal from "../../components/EventFormModal";

export default function AdminManageEvents() {
  const [events, setEvents] = useState([]);
  const [blockFacility, setBlockFacility] = useState(null); // object | null
  const [showBlockRow, setShowBlockRow] = useState(false); // boolean
  const [blockSlotStr, setBlockSlotStr] = useState(""); // string
  const [blockDate, setBlockDate] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const tableRef = useRef(null);


  const confirmBlock = async () => {
    if (!blockFacility || !blockSlotStr || !blockDate) {
      toast.error("Fill all fields");
      return;
    }
    const [slot] = blockSlotStr.split("|");
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

   const handleOpenModal = (event = null) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };


 const handleSaveEvent = async (formData) => {
    try {
      const token = await getAuthToken();
      const payload = {
        eventName: formData.eventName,
        facilityId: formData.facility.id,
        facilityName: formData.facility.name,
        description: formData.description,
        startTime: formData.startTime.toISOString(),
        endTime: formData.endTime.toISOString(),
        posterImage: formData.posterImage
      };

      const url = selectedEvent 
        ? `http://localhost:8080/api/admin/events/${selectedEvent.id}`
        : "http://localhost:8080/api/admin/events";

      const method = selectedEvent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      // Update events state
      if (selectedEvent) {
        setEvents(prev => prev.map(e => 
          e.id === selectedEvent.id ? { ...result.event, startTime: new Date(result.event.startTime), endTime: new Date(result.event.endTime) } : e
        ));
      } else {
        setEvents(prev => [...prev, { 
          ...result.event, 
          startTime: new Date(result.event.startTime),
          endTime: new Date(result.event.endTime)
        }]);
      }

      // Call the new notifications endpoint
      if (!selectedEvent) { // Only send notifications for new events
        try {
          await fetch('http://localhost:8080/api/admin/events/notify', {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              eventId: result.event.id,
              eventName: result.event.eventName,
              facilityName: result.event.facility.name,
              startTime: result.event.startTime,
              endTime: result.event.endTime
            })
          });
        } catch (notifyErr) {
          console.error("Error sending event notifications:", notifyErr);
        }
      }

      toast.success(result.message || "Event saved successfully");
      setModalOpen(false);
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
       <EventFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveEvent}
        facilities={facilities}
        eventData={selectedEvent}
      />
      <div className="container">
        <Sidebar activeItem="manage events" />
        <main className="main-content">
          <header className="page-header">
            <h1>Manage Events</h1>
            <div className="header-actions">
              <button className="action-btn" onClick={() => handleOpenModal()}>
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
                    <td>{e.eventName}</td>
                    <td>{e.facility?.name}</td>
                    <td>{e.description}</td>
                    <td>{formatDateTime(e.startTime)}</td>
                    <td>{formatDateTime(e.endTime)}</td>
                   <td className="actions">
                      <img
                        src={editIcon}
                        alt="edit"
                        className="icon-btn"
                        onClick={() => handleOpenModal(e)}
                      />
                      <img
                        src={binIcon}
                        alt="delete"
                        className="icon-btn"
                        onClick={() => handleDeleteEvent(e.id)}
                      />
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
