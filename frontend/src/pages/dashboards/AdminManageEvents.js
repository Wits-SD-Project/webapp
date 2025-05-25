// Import necessary React hooks, components, and libraries
import { useEffect, useRef, useState } from "react";
import Sidebar from "../../components/AdminSideBar.js";
import editIcon from "../../assets/edit.png"; // Edit icon image
import binIcon from "../../assets/bin.png"; // Delete icon image
import "../../styles/adminManageEvents.css"; // Component styles
import { getAuthToken } from "../../firebase"; // Firebase authentication helper
import { toast } from "react-toastify"; // Toast notifications
import EventFormModal from "../../components/EventFormModal"; // Modal for event creation/editing

// Main AdminManageEvents component for managing facility events
export default function AdminManageEvents() {
  // State management
  const [events, setEvents] = useState([]); // List of all events
  const [blockFacility, setBlockFacility] = useState(null); // Currently selected facility for blocking
  const [showBlockRow, setShowBlockRow] = useState(false); // Toggle for showing block timeslot UI
  const [blockSlotStr, setBlockSlotStr] = useState(""); // Selected timeslot string for blocking
  const [blockDate, setBlockDate] = useState(""); // Selected date for blocking
  const [facilities, setFacilities] = useState([]); // List of all facilities
  const [modalOpen, setModalOpen] = useState(false); // Controls event form modal visibility
  const [selectedEvent, setSelectedEvent] = useState(null); // Currently selected event for editing
  const tableRef = useRef(null); // Reference to the table section for potential DOM operations

  /**
   * Handles blocking a facility timeslot
   * Validates inputs and makes API call to block the slot
   */
  const confirmBlock = async () => {
    // Input validation
    if (!blockFacility || !blockSlotStr || !blockDate) {
      toast.error("Fill all fields");
      return;
    }
    
    // Extract just the slot identifier (before the pipe character)
    const [slot] = blockSlotStr.split("|");
    
    try {
      const token = await getAuthToken();
      // API call to block the timeslot
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
      
      // Success feedback
      toast.success("Timeslot blocked");
      setShowBlockRow(false); // Hide the block row after success
    } catch (err) {
      toast.error(err.message || "Failed");
    }
  };

  // Fetch all facilities on component mount
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
          setFacilities(data.facilities); // Update facilities state
        } else {
          console.error("API returned success: false");
        }
      } catch (error) {
        console.error("Failed to fetch facilities:", error);
      }
    };

    fetchFacilities();
  }, []);

  // Fetch all events on component mount
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

        // Format dates from strings to Date objects
        const formatted = result.events.map((event) => ({
          ...event,
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime),
        }));

        setEvents(formatted); // Update events state
      } catch (error) {
        console.error("Error fetching events:", error);
        toast.error(error.message);
      }
    };

    fetchEvents();
  }, []);

  // Fetch timeslots when a facility is selected for blocking
  useEffect(() => {
    // Only fetch if we have a facility without timeslots data
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

        // Merge timeslots into the facility object
        setBlockFacility((prev) => ({ ...prev, timeslots: data.timeslots }));
      } catch (err) {
        console.error(err);
        toast.error(err.message || "Could not load timeslots");
      }
    })();
  }, [blockFacility]);

  /**
   * Opens the event form modal
   * @param {Object|null} event - The event to edit, or null for new event
   */
  const handleOpenModal = (event = null) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  /**
   * Handles saving an event (both create and update)
   * @param {Object} formData - The event data from the form
   */
  const handleSaveEvent = async (formData) => {
    try {
      const token = await getAuthToken();
      // Prepare payload for API
      const payload = {
        eventName: formData.eventName,
        facilityId: formData.facility.id,
        facilityName: formData.facility.name,
        description: formData.description,
        startTime: formData.startTime.toISOString(),
        endTime: formData.endTime.toISOString(),
        posterImage: formData.posterImage
      };

      // Determine URL and method based on whether we're editing or creating
      const url = selectedEvent 
        ? `http://localhost:8080/api/admin/events/${selectedEvent.id}`
        : "http://localhost:8080/api/admin/events";

      const method = selectedEvent ? "PUT" : "POST";

      // Make API request
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

      // Update events state based on whether we edited or created
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

      // Send notifications for new events only
      if (!selectedEvent) {
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
      setModalOpen(false); // Close the modal
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error.message);
    }
  };

  /**
   * Handles deleting an event
   * @param {string} eventId - The ID of the event to delete
   */
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

      // Remove the deleted event from state
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast.success(result.message || "Event deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.message || "An unexpected error occurred");
    }
  };

  /**
   * Formats a date object into a readable string
   * @param {Date} date - The date to format
   * @returns {string} Formatted date string
   */
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

  // Main component render
  return (
    <main className="manage-events">
      {/* Event Form Modal (conditionally rendered) */}
      <EventFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveEvent}
        facilities={facilities}
        eventData={selectedEvent}
      />
      
      <div className="container">
        {/* Admin sidebar */}
        <Sidebar activeItem="manage events" />
        
        {/* Main content area */}
        <main className="main-content">
          {/* Page header with action buttons */}
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

          {/* Events table section */}
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
                {/* Render each event as a table row */}
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>{e.eventName}</td>
                    <td>{e.facility?.name}</td>
                    <td>{e.description}</td>
                    <td>{formatDateTime(e.startTime)}</td>
                    <td>{formatDateTime(e.endTime)}</td>
                    <td className="actions">
                      {/* Edit button */}
                      <img
                        src={editIcon}
                        alt="edit"
                        className="icon-btn"
                        onClick={() => handleOpenModal(e)}
                      />
                      {/* Delete button */}
                      <img
                        src={binIcon}
                        alt="delete"
                        className="icon-btn"
                        onClick={() => handleDeleteEvent(e.id)}
                      />
                    </td>
                  </tr>
                ))}
                
                {/* Special row for blocking timeslots (conditionally rendered) */}
                {showBlockRow && (
                  <tr className="editing block-row">
                    <td className="muted">— (block) —</td>
                    
                    {/* Facility selection dropdown */}
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
                    
                    <td className="muted">Maintenance / Reserved</td>
                    
                    {/* Timeslot selection dropdown */}
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
                    
                    {/* Date selection */}
                    <td>
                      <input
                        type="date"
                        value={blockDate}
                        onChange={(e) => setBlockDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </td>
                    
                    {/* Action buttons for blocking */}
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
              </tbody>
            </table>
          </section>
        </main>
      </div>
    </main>
  );
}
