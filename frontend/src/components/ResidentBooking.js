// src/components/ResidentBooking.js
import React, { useState } from 'react';
import '../styles/ResidentBooking.css';

// Mock facility data structured according to database schema
const facilities = [
  {
    facility_id: 1,
    name: "Marks Cricket Ground",
    type: "Cricket Ground",
    is_outdoor: true,
    status: "active",
    slots: ["09:00 - 10:00", "10:00 - 11:00"]
  },
  {
    facility_id: 2,
    name: "Wanderers",
    type: "Cricket Ground",
    is_outdoor: true,
    status: "active",
    slots: ["11:00 - 12:00", "12:00 - 13:00"]
  },
  {
    facility_id: 3,
    name: "Tennis Court A",
    type: "Tennis Court",
    is_outdoor: false,
    status: "active",
    slots: ["14:00 - 15:00", "15:00 - 16:00"]
  }
];

const ResidentBooking = () => {
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');

  // Handles change in dropdown selection
  const handleFacilityChange = (e) => {
    const facility = facilities.find(f => f.facility_id === parseInt(e.target.value));
    setSelectedFacility(facility);
    setSelectedSlot('');
    setBookingStatus('');
  };

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot || !selectedFacility) return;
    // Set booking status as pending (backend will handle approval)
    setBookingStatus("Pending");
  };

  return (
    <div className="booking-container">
      <h2>Book a Sports Facility</h2>

      {/* Dropdown to select a facility (type + name) */}
      <div className="section">
        <label>Select Facility:</label>
        <select onChange={handleFacilityChange} defaultValue="">
          <option value="" disabled>Select a facility</option>
          {facilities.map(f => (
            <option key={f.facility_id} value={f.facility_id}>{`${f.type} - ${f.name}`}</option>
          ))}
        </select>
      </div>

      {/* Show additional facility details when one is selected */}
      {selectedFacility && (
        <div className="section">
          <h4>Facility Details</h4>
          <p><strong>Facility Name:</strong> {selectedFacility.name}</p>
          <p><strong>Type:</strong> {selectedFacility.type}</p>
          <p><strong>Outdoor:</strong> {selectedFacility.is_outdoor ? "Yes" : "No"}</p>
        </div>
      )}

      {/* Date selection */}
      {selectedFacility && (
        <div className="section">
          <label>Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            required
          />
          {selectedDate && (
            <p><strong>Day:</strong> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' })}</p>
          )}
        </div>
      )}

      {/* Time slot selection */}
      {selectedFacility && (
        <div className="section">
          <h3>Available Time Slots</h3>
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

      {/* Booking confirmation summary */}
      {selectedFacility && selectedSlot && selectedDate && (
        <form onSubmit={handleBookingSubmit} className="section">
          <h3>Confirm Booking</h3>
          <p><strong>Facility Name:</strong> {selectedFacility.name}</p>
          <p><strong>Type:</strong> {selectedFacility.type}</p>
          <p><strong>Outdoor:</strong> {selectedFacility.is_outdoor ? "Yes" : "No"}</p>
          <p><strong>Date:</strong> {selectedDate}</p>
          <p><strong>Day:</strong> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' })}</p>
          <p><strong>Slot:</strong> {selectedSlot}</p>
          <button type="submit" className="confirm-button">Book Slot</button>
        </form>
      )}

      {/* Booking status output */}
      {bookingStatus && (
        <div className="section">
          <h3>Booking Status</h3>
          <p className="status-message">Your booking is <strong>{bookingStatus}</strong></p>
        </div>
      )}
    </div>
  );
};

export default ResidentBooking;
