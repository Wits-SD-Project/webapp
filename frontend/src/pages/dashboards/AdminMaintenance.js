// Import necessary React hooks, components, and libraries
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/AdminSideBar.js";
import "../../styles/adminMaintenance.css";
import { useAuth } from "../../context/AuthContext.js";
import { motion, AnimatePresence } from "framer-motion"; // For animations

// Main AdminMaintenance component for managing facility maintenance schedules
export default function AdminMaintenance() {
  // Navigation hook for routing
  const navigate = useNavigate();
  
  // Authentication context to get current user
  const { authUser } = useAuth();
  const username = authUser?.name || "Admin";

  // State management for the component
  const [startDate, setStartDate] = useState(new Date()); // Start date for maintenance
  const [endDate, setEndDate] = useState(new Date()); // End date for maintenance
  const [showModal, setShowModal] = useState(false); // Controls modal visibility
  const [startTime, setStartTime] = useState(""); // Start time for maintenance
  const [endTime, setEndTime] = useState(""); // End time for maintenance
  const [selectedFacility, setSelectedFacility] = useState(""); // Currently selected facility
  const [maintenanceEvents, setMaintenanceEvents] = useState([
    // Example dummy maintenance event (initial data)
    {
      id: "dummy-1",
      facility: "Gym",
      title: "Gym Maintenance",
      start: new Date(new Date().setDate(new Date().getDate() + 1), 8, 0, 0), // tomorrow 8:00 AM
      end: new Date(new Date().setDate(new Date().getDate() + 2), 17, 0, 0), // day after tomorrow 5:00 PM
      createdBy: "Admin",
      createdAt: new Date(),
    },
  ]);
  const [selectedEvent, setSelectedEvent] = useState(null); // Currently selected event for editing

  // List of available facilities
  const facilities = [
    { id: "1", name: "Gym" },
    { id: "2", name: "Swimming Pool" },
    { id: "3", name: "Tennis Court" },
    { id: "4", name: "Basketball Court" },
  ];

  /**
   * Handles date selection in the calendar
   * @param {number} day - The day of the month that was clicked
   */
  const handleDateClick = (day) => {
    if (!selectedFacility) {
      alert("Please select a facility first!");
      return;
    }

    const clickedDate = new Date(startDate);
    clickedDate.setDate(day);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (clickedDate >= today) {
      // For future dates: prepare to schedule new maintenance
      setStartDate(clickedDate);
      setEndDate(clickedDate);
      setStartTime("");
      setEndTime("");
      setSelectedEvent(null);
      setShowModal(true);
    } else {
      // For past dates: show existing maintenance events (read-only)
      const eventsOnDate = maintenanceEvents.filter(
        (event) =>
          new Date(event.start).toDateString() <= clickedDate.toDateString() &&
          new Date(event.end).toDateString() >= clickedDate.toDateString() &&
          event.facility === selectedFacility
      );
      if (eventsOnDate.length > 0) {
        console.log("Maintenance on this past date:", eventsOnDate);
      }
    }
  };

  /**
   * Handles scheduling or updating maintenance events
   */
  const handleScheduleMaintenance = () => {
    // Validation checks
    if (!startTime || !endTime) {
      alert("Please fill all fields");
      return;
    }

    // Create Date objects from the selected dates and times
    const startDateTime = new Date(startDate);
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(endDate);
    const [endHours, endMinutes] = endTime.split(":").map(Number);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    // Additional validation
    if (startDateTime >= endDateTime) {
      alert("End date and time must be after start date and time");
      return;
    }

    if (startDateTime < new Date() && !selectedEvent) {
      alert("Cannot schedule new maintenance in the past");
      return;
    }

    // Create new or updated event object
    const newEvent = {
      id: selectedEvent ? selectedEvent.id : `dummy-${Date.now()}`, // Use existing ID for edit
      facility: selectedFacility,
      title: `${selectedFacility} Maintenance`,
      start: startDateTime,
      end: endDateTime,
      createdBy: username,
      createdAt: selectedEvent ? selectedEvent.createdAt : new Date(), // Keep original creation date
      updatedAt: selectedEvent ? new Date() : null, // Set update timestamp if editing
    };

    // Update the events list
    setMaintenanceEvents((prevEvents) => {
      if (selectedEvent) {
        // Update existing event
        return prevEvents.map((event) =>
          event.id === selectedEvent.id ? newEvent : event
        );
      } else {
        // Add new event
        return [...prevEvents, newEvent];
      }
    });

    // Reset form state
    setShowModal(false);
    setStartTime("");
    setEndTime("");
    setStartDate(new Date());
    setEndDate(new Date());
    setSelectedEvent(null);
  };

  /**
   * Prepares the form for editing an existing event
   * @param {Object} event - The maintenance event to edit
   */
  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setStartDate(new Date(event.start));
    setEndDate(new Date(event.end));
    // Format times as HH:MM
    setStartTime(
      `${String(new Date(event.start).getHours()).padStart(2, "0")}:${String(
        new Date(event.start).getMinutes()
      ).padStart(2, "0")}`
    );
    setEndTime(
      `${String(new Date(event.end).getHours()).padStart(2, "0")}:${String(
        new Date(event.end).getMinutes()
      ).padStart(2, "0")}`
    );
    setSelectedFacility(event.facility);
    setShowModal(true);
  };

  /**
   * Deletes a maintenance event after confirmation
   * @param {string} id - The ID of the event to delete
   */
  const handleDeleteEvent = (id) => {
    if (window.confirm("Are you sure you want to delete this maintenance event?")) {
      setMaintenanceEvents((prevEvents) =>
        prevEvents.filter((event) => event.id !== id)
      );
    }
  };

  /**
   * Renders the calendar component with maintenance events
   * @returns {JSX.Element} The calendar UI
   */
  const renderCalendar = () => {
    const year = startDate.getFullYear();
    const month = startDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today for date-only comparison

    // Generate arrays of days for current, previous, and next months
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => 
      new Date(year, month, 0).getDate() - firstDayOfMonth + i + 1
    );
    const nextMonthDays = Array.from({ length: 42 - (prevMonthDays.length + days.length) }, (_, i) => i + 1);

    return (
      <div className="calendar">
        {/* Calendar header with month navigation */}
        <div className="calendar-header">
          <button onClick={() => setStartDate(new Date(year, month - 1, 1))}>
            &lt;
          </button>
          <h2>
            {startDate.toLocaleString("default", { month: "long" })} {year}
          </h2>
          <button onClick={() => setStartDate(new Date(year, month + 1, 1))}>
            &gt;
          </button>
        </div>

        {/* Calendar grid */}
        <div className="calendar-grid">
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="calendar-day-header">
              {day}
            </div>
          ))}

          {/* Previous month's days */}
          {prevMonthDays.map((day) => (
            <div key={`prev-${day}`} className="calendar-day other-month">
              {day}
            </div>
          ))}

          {/* Current month's days */}
          {days.map((day) => {
            const currentDate = new Date(year, month, day);
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(23, 59, 59, 999);

            // Determine day states
            const isToday = dayStart.toDateString() === today.toDateString();
            const isPast = dayStart < today;

            // Check for maintenance events on this day
            const hasMaintenance = maintenanceEvents.some((event) => {
              const eventStart = new Date(event.start);
              const eventEnd = new Date(event.end);
              return (
                eventStart <= dayEnd && 
                eventEnd >= dayStart && 
                event.facility === selectedFacility
              );
            });

            // Get all events for this day
            const eventsOnDay = maintenanceEvents.filter((event) => {
              const eventStart = new Date(event.start);
              const eventEnd = new Date(event.end);
              return (
                eventStart <= dayEnd && 
                eventEnd >= dayStart && 
                event.facility === selectedFacility
              );
            });

            return (
              <div
                key={`current-${day}`}
                className={`calendar-day ${isToday ? "today" : ""} ${
                  isPast ? "past" : ""
                } ${hasMaintenance ? "has-maintenance" : ""}`}
                onClick={() => !isPast && handleDateClick(day)}
              >
                {day}
                {hasMaintenance && <div className="maintenance-dot"></div>}
                {eventsOnDay.map((event) => (
                  <div
                    key={event.id}
                    className="event-indicator"
                    title={`${event.title} (${new Date(
                      event.start
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} - ${new Date(event.end).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })})`}
                  ></div>
                ))}
              </div>
            );
          })}

          {/* Next month's days */}
          {nextMonthDays.map((day) => (
            <div key={`next-${day}`} className="calendar-day other-month">
              {day}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Main component render
  return (
    <main className="dashboard">
      <div className="container">
        {/* Admin sidebar component */}
        <Sidebar activeItem="maintenance" />

        {/* Main content area */}
        <main className="main-content">
          {/* Page header */}
          <header className="page-header">
            <h1>Maintenance Schedule</h1>
          </header>

          {/* Facility selection dropdown */}
          <div className="facility-select">
            <label>Select Facility: </label>
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
            >
              <option value="">-- Select a Facility --</option>
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.name}>
                  {facility.name}
                </option>
              ))}
            </select>
          </div>

          {/* Calendar display */}
          <div className="calendar-container">{renderCalendar()}</div>

          {/* List of scheduled maintenance events */}
          <div className="maintenance-events-list">
            <h2>Scheduled Maintenance Events for {selectedFacility || 'All Facilities'}</h2>
            {maintenanceEvents
              .filter(event => !selectedFacility || event.facility === selectedFacility)
              .sort((a, b) => new Date(a.start) - new Date(b.start))
              .map((event) => (
                <div key={event.id} className="event-item">
                  <div className="event-details">
                    <h4>{event.title}</h4>
                    <p>Facility: {event.facility}</p>
                    <p>Start: {new Date(event.start).toLocaleString()}</p>
                    <p>End: {new Date(event.end).toLocaleString()}</p>
                    <p>Created By: {event.createdBy}</p>
                    {event.updatedAt && (
                      <p>Updated At: {new Date(event.updatedAt).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="event-actions">
                    <button
                      className="edit-btn"
                      onClick={() => handleEditEvent(event)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            {maintenanceEvents.filter(event => !selectedFacility || event.facility === selectedFacility).length === 0 && (
              <p>No maintenance events scheduled for {selectedFacility || 'all facilities'}.</p>
            )}
          </div>

          {/* Modal for scheduling/editing maintenance (using Framer Motion for animations) */}
          <AnimatePresence>
            {showModal && (
              <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
              >
                <motion.div
                  className="modal-content"
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2>{selectedEvent ? "Edit Maintenance" : "Schedule Maintenance"}</h2>

                  {/* Form for scheduling maintenance */}
                  <div className="form-group">
                    <label>Start Date:</label>
                    <input
                      type="date"
                      value={startDate.toISOString().split("T")[0]}
                      onChange={(e) => setStartDate(new Date(e.target.value))}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>

                  <div className="form-group">
                    <label>Start Time:</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      min="00:00"
                      max="23:59"
                    />
                  </div>

                  <div className="form-group">
                    <label>End Date:</label>
                    <input
                      type="date"
                      value={endDate.toISOString().split("T")[0]}
                      onChange={(e) => setEndDate(new Date(e.target.value))}
                      min={startDate.toISOString().split("T")[0]}
                    />
                  </div>

                  <div className="form-group">
                    <label>End Time:</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      min="00:00"
                      max="23:59"
                    />
                  </div>

                  {/* Form actions */}
                  <div className="modal-actions">
                    <button
                      className="cancel-btn"
                      onClick={() => {
                        setShowModal(false);
                        setSelectedEvent(null);
                        setStartTime("");
                        setEndTime("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="confirm-btn"
                      onClick={handleScheduleMaintenance}
                    >
                      {selectedEvent ? "Update" : "Schedule"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </main>
  );
}
