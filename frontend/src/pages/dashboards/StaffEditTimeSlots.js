import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import Sidebar from "../../components/SideBar";
import addIcon from "../../assets/add.png";
import binIcon from "../../assets/bin.png";
import "../../styles/staffEditTimeSlots.css";


const daysOfWeek = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

export default function EditTimeSlots() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id } = useParams();
  const facilityName = state?.facilityName || "[Facility Name]";

  //dummy data for now
  const [slotsByDay, setSlotsByDay] = useState({
    Monday: ["09:00 - 10:00", "11:00 - 12:00", "17:00 - 18:00"],
    Tuesday: [],
    Wednesday: [],
    Thursday: ["09:00 - 10:00"],
    Friday: [],
    Saturday: ["09:00 - 10:00"],
    Sunday: [],
  });

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const handleAddSlot = (day) => {
    setSelectedDay(day);
    setShowTimePicker(true);
  };

  const handleSaveSlot = () => {
    if (startTime && endTime) {
      const newSlot = `${startTime} - ${endTime}`;
      setSlotsByDay((prev) => ({
        ...prev,
        [selectedDay]: [...prev[selectedDay], newSlot]
      }));
      setShowTimePicker(false);
      setStartTime("");
      setEndTime("");
    }
  };

  const handleDeleteSlot = (day, slot) => {
    setSlotsByDay((prev) => ({
      ...prev,
      [day]: prev[day].filter((currentSlot) => currentSlot !== slot)
    }));
  };

  return (
    <main className="edit-timeslots-page">
      <div className="container">
        <Sidebar activeItem="manage facilities" />
        <section className="main-content">
          <header className="page-header">
            <h1><strong>{facilityName}</strong> Time Slots</h1>
            <button className="back-btn" onClick={() => navigate("/staff-manage-facilities")}>Back</button>
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
                        {slotsByDay[day].map((slot, idx) => (
                          <span key={idx} className="slot-pill">
                            {slot}
                            <img
                              src={binIcon}
                              alt="Delete"
                              onClick={() => handleDeleteSlot(day, slot)}
                              className="icon-btn red-icon"
                            />
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="icon-actions">
                      <img
                        src={addIcon}
                        alt="Add"
                        onClick={() => handleAddSlot(day)}
                        className="icon-btn"
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
            <h3>Add Time Slot</h3>
            <label>Start Time:</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <label>End Time:</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={handleSaveSlot}>Save</button>
              <button onClick={() => setShowTimePicker(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
