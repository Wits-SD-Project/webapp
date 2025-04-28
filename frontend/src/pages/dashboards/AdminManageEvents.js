import { useEffect, useRef, useState } from "react";
import Sidebar from "../../components/AdminSideBar.js";
import editIcon from "../../assets/edit.png";
import binIcon from "../../assets/bin.png";
import "../../styles/adminManageEvents.css";


export default function AdminManageEvents() {
  // State management for events, original events (for canceling edits), and facilities
  const [events, setEvents] = useState([]); // Current list of events
  const [originalEvents, setOriginalEvents] = useState({}); // Stores original values when editing
  const [facilities, setFacilities] = useState([]); // List of available facilities
  const tableRef = useRef(null); // Reference to the table for scrolling

  /**
   * Formats a Date object into the datetime-local input format (YYYY-MM-DDTHH:MM)
   * @param {Date} date - The date to format
   * @returns {string} Formatted date string
   */
  const formatForInput = (date) => {
    if (!date) return "";
    const pad = (num) => num.toString().padStart(2, '0'); // Helper to pad numbers with leading zero
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  /**
   * Parses a datetime-local input string into a Date object
   * @param {string} value - The input string to parse
   * @returns {Date} Parsed Date object
   */
  const parseInputDate = (value) => {
    if (!value) return new Date(); // Default to current date if no value
    const [datePart, timePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes); // Note: month is 0-indexed in Date
  };

  // Initialize dummy facilities data on component mount
  useEffect(() => {
    const dummyFacilities = [
      { id: "1", name: "Gym" },
      { id: "2", name: "Swimming Pool" },
      { id: "3", name: "Tennis Court" },
      { id: "4", name: "Basketball Court" },
      { id: "5", name: "Function Hall" },
    ];
    setFacilities(dummyFacilities);
  }, []); // Empty dependency array means this runs once on mount

  // Initialize dummy events data on component mount
  useEffect(() => {
    const dummyEvents = [
      { 
        id: "1", 
        eventName: "Yoga Class", 
        facility: "Gym", 
        description: "Morning yoga session for all residents",
        startTime: new Date(2023, 5, 15, 8, 0), // June 15, 2023 8:00 AM
        endTime: new Date(2023, 5, 15, 9, 0),   // June 15, 2023 9:00 AM
        isEditing: false // Tracks if this event is currently being edited
      },
      { 
        id: "2", 
        eventName: "Swim Competition", 
        facility: "Swimming Pool", 
        description: "Annual resident swimming competition",
        startTime: new Date(2023, 5, 16, 14, 0), // June 16, 2023 2:00 PM
        endTime: new Date(2023, 5, 16, 17, 0),   // June 16, 2023 5:00 PM
        isEditing: false 
      },
      { 
        id: "3", 
        eventName: "Tennis Tournament", 
        facility: "Tennis Court", 
        description: "Friendly tennis matches between residents",
        startTime: new Date(2023, 5, 17, 10, 0), // June 17, 2023 10:00 AM
        endTime: new Date(2023, 5, 17, 16, 0),    // June 17, 2023 4:00 PM
        isEditing: false 
      },
    ];
    setEvents(dummyEvents);
  }, []); // Empty dependency array means this runs once on mount

  /**
   * Handles adding a new event to the list
   */
  const handleAddEvent = () => {
    const newEvent = {
      id: Date.now().toString(), // Unique ID based on current timestamp
      eventName: "",
      facility: facilities.length > 0 ? facilities[0].name : "", // Default to first facility
      description: "",
      startTime: new Date(), // Current date/time
      endTime: new Date(Date.now() + 3600000), // 1 hour later
      isEditing: true, // New events start in edit mode
      isNew: true, // Flag to track new vs existing events
    };
    
    // Add new event to the list and store original state
    setEvents((prev) => [...prev, newEvent]);
    setOriginalEvents((prev) => ({ ...prev, [newEvent.id]: { ...newEvent } }));

    // Scroll to the new event row after a short delay
    setTimeout(() => {
      tableRef.current?.scrollTo({ top: tableRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  /**
   * Handles field changes during editing
   * @param {string} id - Event ID
   * @param {string} field - Field name being changed
   * @param {any} value - New field value
   */
  const handleFieldChange = (id, field, value) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  /**
   * Cancels the current edit, reverting changes
   * @param {string} id - Event ID being edited
   */
  const handleCancelEdit = (id) => {
    const event = events.find((e) => e.id === id);
    if (event.isNew) {
      // Remove the event if it was newly added
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } else {
      // Revert to original values for existing events
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...originalEvents[id], isEditing: false } : e))
      );
    }
  };

  /**
   * Saves the current event changes
   * @param {string} id - Event ID being saved
   */
  const handleSaveEvent = (id) => {
    const event = events.find((e) => e.id === id);
    if (event.isNew) {
      console.log("Adding new event:", event);
      // In a real app, you would send this to your backend here
    } else {
      console.log("Updating event:", event);
      // In a real app, you would update the backend here
    }
    
    // Update the event to no longer be in edit mode
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isEditing: false, isNew: false } : e))
    );
  };

  /**
   * Formats a Date object into a readable string
   * @param {Date} date - The date to format
   * @returns {string} Formatted date string (e.g., "Jun 15, 2023, 8:00 AM")
   */
  const formatDateTime = (date) => {
    if (!date) return "";
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Main component render
  return (
    <main className="manage-events">
      <div className="container">
        {/* Sidebar navigation */}
        <Sidebar activeItem="manage events" />
        
        {/* Main content area */}
        <main className="main-content">
          {/* Page header with title and add button */}
          <header className="page-header">
            <h1>Manage Events</h1>
            <button className="add-btn" onClick={handleAddEvent}>Add New Event</button>
          </header>

          {/* Scrollable table section */}
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
                {/* Map through all events to create table rows */}
                {events.map((e) => (
                  <tr key={e.id}>
                    {/* Event Name column */}
                    <td>
                      {e.isEditing ? (
                        <input
                          type="text"
                          value={e.eventName}
                          onChange={(ev) => handleFieldChange(e.id, "eventName", ev.target.value)}
                          placeholder="Event Name"
                        />
                      ) : e.eventName}
                    </td>
                    
                    {/* Facility column */}
                    <td>
                      {e.isEditing ? (
                        <select
                          value={e.facility}
                          onChange={(ev) => handleFieldChange(e.id, "facility", ev.target.value)}
                        >
                          {facilities.map((f) => (
                            <option key={f.id} value={f.name}>{f.name}</option>
                          ))}
                        </select>
                      ) : e.facility}
                    </td>
                    
                    {/* Description column */}
                    <td>
                      {e.isEditing ? (
                        <textarea
                          value={e.description}
                          onChange={(ev) => handleFieldChange(e.id, "description", ev.target.value)}
                          placeholder="Event Description"
                          rows={2}
                        />
                      ) : e.description}
                    </td>
                    
                    {/* Start Time column */}
                    <td>
                      {e.isEditing ? (
                        <input
                          type="datetime-local"
                          value={formatForInput(e.startTime)}
                          onChange={(ev) => handleFieldChange(e.id, "startTime", parseInputDate(ev.target.value))}
                        />
                      ) : formatDateTime(e.startTime)}
                    </td>
                    
                    {/* End Time column */}
                    <td>
                      {e.isEditing ? (
                        <input
                          type="datetime-local"
                          value={formatForInput(e.endTime)}
                          onChange={(ev) => handleFieldChange(e.id, "endTime", parseInputDate(ev.target.value))}
                          min={formatForInput(e.startTime)} // Ensures end time can't be before start time
                        />
                      ) : formatDateTime(e.endTime)}
                    </td>
                    
                    {/* Actions column */}
                    <td className="actions">
                      {e.isEditing ? (
                        // Edit mode actions (Save and Cancel)
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
                        // View mode actions (Edit and Delete)
                        <>
                          <img
                            src={editIcon}
                            alt="edit"
                            className="icon-btn"
                            onClick={() => {
                              // Store original values before editing
                              setOriginalEvents((prev) => ({ ...prev, [e.id]: { ...e } }));
                              handleFieldChange(e.id, "isEditing", true);
                            }}
                          />
                          <img
                            src={binIcon}
                            alt="delete"
                            className="icon-btn"
                            onClick={() => {
                              // Confirm before deleting
                              if (window.confirm(`Are you sure you want to delete "${e.eventName}"?`)) {
                                setEvents((prev) => prev.filter(ev => ev.id !== e.id));
                              }
                            }}
                          />
                        </>
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