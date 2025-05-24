// Import React hooks and routing utilities
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
// Import components and assets
import Sidebar from "../../components/StaffSideBar.js";
import addIcon from "../../assets/add.png";
import binIcon from "../../assets/bin.png";
// Import styles
import "../../styles/staffEditTimeSlots.css";
// Import authentication and notification utilities
import { getAuthToken } from "../../firebase";
import { toast } from "react-toastify";

// Days of week constant for consistent ordering
const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function EditTimeSlots() {
  // Get facility ID from URL parameters
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [slotsByDay, setSlotsByDay] = useState(() =>
    // Initialize with empty arrays for each day
    daysOfWeek.reduce((acc, day) => ({ ...acc, [day]: [] }), {})
  );
  const [showTimePicker, setShowTimePicker] = useState(false); // Modal visibility
  const [selectedDay, setSelectedDay] = useState(""); // Currently selected day
  const [startTime, setStartTime] = useState(""); // New slot start time
  const [endTime, setEndTime] = useState(""); // New slot end time
  const [facilityName, setFacilityName] = useState(""); // Facility name display

  /**
   * useEffect hook for initial data fetching
   * Runs when component mounts or facility ID changes
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAuthToken();

        // Note: Facility details fetch is commented out but preserved
        // as it might be needed in future implementations

        // Fetch timeslots from backend
        const slotsRes = await fetch(
          `http://localhost:8080/api/facilities/timeslots`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ facilityId: id }),
          }
        );
        const slotsData = await slotsRes.json();
        if (!slotsRes.ok) throw new Error(slotsData.message);

        // Process and group timeslots by day
        const groupedSlots = daysOfWeek.reduce((acc, day) => {
          acc[day] = slotsData.timeslots
            .filter((slot) => slot.day === day)
            .map((slot) => `${slot.start} - ${slot.end}`);
          return acc;
        }, {});

        setSlotsByDay(groupedSlots);
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error(err.message);
      }
    };

    fetchData();
  }, [id]);

  /**
   * Update timeslots in backend
   * @param {Object} updatedSlots - New timeslots data structure
   */
  const updateBackend = async (updatedSlots) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(
        `http://localhost:8080/api/facilities/${id}/timeslots`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ timeslots: updatedSlots }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success("Timeslots updated successfully");
    } catch (err) {
      toast.error(err.message);
    }
  };

  /**
   * Open time picker modal for specific day
   * @param {string} day - Selected day of week
   */
  const handleAddSlot = (day) => {
    setSelectedDay(day);
    setShowTimePicker(true);
  };

  /**
   * Validate and save new time slot
   */
  const handleSaveSlot = () => {
    // Basic validation
    if (!startTime || !endTime) {
      toast.error("Please select both start and end times");
      return;
    }

    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      return;
    }

    const newSlotStr = `${startTime} - ${endTime}`;
    const existingSlots = slotsByDay[selectedDay] || [];

    // Check for duplicate slots
    if (existingSlots.includes(newSlotStr)) {
      toast.error("This slot already exists");
      return;
    }

    // Helper function to convert time string to minutes
    const toMinutes = (t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    // Convert times for comparison
    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime);

    // Check for overlapping slots
    for (const slot of existingSlots) {
      const [existingStart, existingEnd] = slot.split(" - ").map((s) => s.trim());
      const exStart = toMinutes(existingStart);
      const exEnd = toMinutes(existingEnd);

      const overlap = newStart < exEnd && newEnd > exStart;
      if (overlap) {
        toast.error(`Overlaps with existing slot: ${slot}`);
        return;
      }
    }

    // Update state and backend
    const newSlots = {
      ...slotsByDay,
      [selectedDay]: [...existingSlots, newSlotStr],
    };

    setSlotsByDay(newSlots);
    updateBackend(newSlots);
    setShowTimePicker(false);
    setStartTime("");
    setEndTime("");
  };

  /**
   * Delete a specific timeslot
   * @param {string} day - Day of week
   * @param {string} slot - Time slot string (format: "HH:MM - HH:MM")
   */
  const handleDeleteSlot = async (day, slot) => {
    try {
      const token = await getAuthToken();
      const [start, end] = slot.split(" - ");

      const response = await fetch(
        `http://localhost:8080/api/facilities/${id}/timeslots`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            day,
            start,
            end,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to delete timeslot");
      }

      // Update local state
      setSlotsByDay((prev) => ({
        ...prev,
        [day]: prev[day].filter((s) => s !== slot),
      }));

      toast.success("Timeslot deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete timeslot");
    }
  };

  // Component render
  return (
    <main className="edit-timeslots-page">
      <div className="container">
        {/* Sidebar navigation */}
        <Sidebar activeItem="manage facilities" />
        
        {/* Main content section */}
        <section className="main-content">
          {/* Page header with navigation */}
          <header className="page-header">
            <h1>
              <strong>{facilityName}</strong> Time Slots
            </h1>
            <button
              className="back-btn"
              onClick={() => navigate("/staff-manage-facilities")}
            >
              ← Back to Facilities
            </button>
          </header>

          {/* Timeslot table */}
          <section className="timeslot-table">
            <table className="semantic-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Time Slots</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Render rows for each day of week */}
                {daysOfWeek.map((day) => (
                  <tr key={day}>
                    <td>{day}</td>
                    <td>
                      {/* Display existing slots as pills */}
                      <div className="slot-pill-container">
                        {slotsByDay[day]?.map((slot, idx) => (
                          <span key={`${day}-${idx}`} className="slot-pill">
                            {slot}
                            {/* Delete button for each slot */}
                            <img
                              src={binIcon}
                              alt="Delete"
                              onClick={() => handleDeleteSlot(day, slot)}
                              className="icon-btn red-icon"
                              title="Delete slot"
                            />
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="icon-actions">
                      {/* Add slot button */}
                      <img
                        src={addIcon}
                        alt="Add slot"
                        onClick={() => handleAddSlot(day)}
                        className="icon-btn"
                        title="Add time slot"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </section>
      </div>

      {/* Time picker modal */}
      {showTimePicker && (
        <div className="time-picker-modal">
          <div className="modal-content">
            <h3>Add Time Slot for {selectedDay}</h3>
            <div className="time-inputs">
              <div className="time-group">
                <label htmlFor="start-time">Start Time:</label>
                <input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="time-group">
                <label htmlFor="end-time">End Time:</label>
                <input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="confirm-btn" onClick={handleSaveSlot}>
                Save Slot
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowTimePicker(false);
                  setStartTime("");
                  setEndTime("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
