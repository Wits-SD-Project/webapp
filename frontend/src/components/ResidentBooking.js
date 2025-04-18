// src/components/ResidentBooking.js
import React, { useState } from 'react';
import '../styles/ResidentBooking.css';

const facilities = [
  { id: 1, name: "Basketball Court", slots: ["09:00-10:00", "10:00-11:00"] },
  { id: 2, name: "Tennis Court", slots: ["11:00-12:00", "12:00-13:00"] },
];

//The const facilities will change to : useEffect(() => {
  //fetch('/api/facilities')
  //.then(res => res.json())
  //.then(data => setFacilities(data));
//}, []);
//once the backend and facility staff part is done so this page can fetch the data from facilities for user story 10

const ResidentBooking = () => {
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');

  const handleFacilityChange = (e) => {
    const facility = facilities.find(f => f.id === parseInt(e.target.value));
    setSelectedFacility(facility);
    setSelectedSlot('');
    setBookingStatus('');
  };

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    // Backend will do this later
    setBookingStatus("Pending");
  };

  return (
    <div className="booking-container">
      <h2>View & Book Sports Facility</h2>

      <div className="section">
        <label>Select Facility:</label>
        <select onChange={handleFacilityChange} defaultValue="">
          <option value="" disabled>Select a facility</option>
          {facilities.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {selectedFacility && (
        <div className="section">
          <h3>Available Slots for {selectedFacility.name}</h3>
          <div className="slots">
            {selectedFacility.slots.map((slot, index) => (
              <button
                key={index}
                className={`slot-button ${selectedSlot === slot ? 'selected' : ''}`}
                onClick={() => handleSlotClick(slot)}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedSlot && (
        <form onSubmit={handleBookingSubmit} className="section">
          <h3>Confirm Booking</h3>
          <p><strong>Facility:</strong> {selectedFacility.name}</p>
          <p><strong>Slot:</strong> {selectedSlot}</p>
          <button type="submit" className="confirm-button">Book Slot</button>
        </form>
      )}

      {bookingStatus && (
        <div className="section">
          <h3>Booking Status</h3>
          <p className="status-message">Your booking request is: <strong>{bookingStatus}</strong></p>
        </div>
      )}
    </div>
  );
};

export default ResidentBooking;
