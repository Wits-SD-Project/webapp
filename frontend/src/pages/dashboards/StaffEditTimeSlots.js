import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "../../components/StaffSideBar.js";
import addIcon from "../../assets/add.png";
import binIcon from "../../assets/bin.png";
import "../../styles/staffEditTimeSlots.css";
import { getAuthToken } from "../../firebase";
import { toast } from "react-toastify";

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
  const { id } = useParams();
  const navigate = useNavigate();
  const [slotsByDay, setSlotsByDay] = useState(() =>
    daysOfWeek.reduce((acc, day) => ({ ...acc, [day]: [] }), {})
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [facilityName, setFacilityName] = useState("");

  // Fetch facility data and timeslots
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getAuthToken();

        // // Fetch facility details
        // const facilityRes = await fetch(`http://localhost:8080/api/facilities/${id}`, {
        //   headers: { Authorization: `Bearer ${token}` }
        // });
        // const facilityData = await facilityRes.json();
        // if (!facilityRes.ok) throw new Error(facilityData.message);
        // setFacilityName(facilityData.name);

        // Fetch timeslots
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

        // Group timeslots by day
        const groupedSlots = daysOfWeek.reduce((acc, day) => {
          acc[day] = slotsData.timeslots
            .filter((slot) => slot.day === day)
            .map((slot) => `${slot.start} - ${slot.end}`);
          return acc;
        }, {});

        setSlotsByDay(groupedSlots);
      } catch (err) {
        console.log(err);
        toast.error(err.message);
      }
    };

    fetchData();
  }, [id]);

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

  const handleAddSlot = (day) => {
    setSelectedDay(day);
    setShowTimePicker(true);
  };

  const handleSaveSlot = () => {
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

    // Prevent duplicates
    if (existingSlots.includes(newSlotStr)) {
      toast.error("This slot already exists");
      return;
    }

    // Helper: convert "HH:MM" to minutes
    const toMinutes = (t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime);

    // Prevent overlaps
    for (const slot of existingSlots) {
      const [existingStart, existingEnd] = slot
        .split(" - ")
        .map((s) => s.trim());
      const exStart = toMinutes(existingStart);
      const exEnd = toMinutes(existingEnd);

      const overlap = newStart < exEnd && newEnd > exStart;
      if (overlap) {
        toast.error(`Overlaps with existing slot: ${slot}`);
        return;
      }
    }

    // All validations passed, update state and backend
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

  //Deleting a specific Timeslot
  const handleDeleteSlot = async (day, slot) => {
    try {
      const token = await getAuthToken();

      // Convert slot string to start/end times
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

  return (
    <main className="edit-timeslots-page">
      <div className="container">
        <Sidebar activeItem="manage facilities" />
        <section className="main-content">
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
                {daysOfWeek.map((day) => (
                  <tr key={day}>
                    <td>{day}</td>
                    <td>
                      <div className="slot-pill-container">
                        {slotsByDay[day]?.map((slot, idx) => (
                          <span key={`${day}-${idx}`} className="slot-pill">
                            {slot}
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
