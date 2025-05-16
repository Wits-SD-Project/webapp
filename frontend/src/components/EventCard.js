import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

function EventCard({ event, onClick }) {
    // Check if startTime is a valid Date object before formatting
    const isStartTimeValid = event.startTime instanceof Date && !isNaN(event.startTime);

    const month = isStartTimeValid ? format(event.startTime, "MMM").toUpperCase() : "";
    const day = isStartTimeValid ? format(event.startTime, "dd") : "";
    const time = isStartTimeValid ? format(event.startTime, "h:mm a") : "Time TBA";

    // Truncate description for card view
    const truncatedDescription = event.description
        ? (event.description.length > 120 ? event.description.substring(0, 117) + "..." : event.description)
        : "No description available.";

    return (
        <motion.div
            className="event-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} // For smooth exit if filtering removes it
            transition={{ duration: 0.3 }}
            onClick={() => onClick(event)}
            role="button" // Improve accessibility
            tabIndex="0" // Make it focusable
            aria-label={`View details for ${event.eventName}`}
        >
            <div className="event-image-container">
                {event.posterImage ? (
                    <img
                        src={event.posterImage}
                        alt={event.eventName || "Event image"}
                        className="event-image"
                        onError={(e) => { e.target.src = "https://via.placeholder.com/400x250?text=Image+Not+Available"; }}
                    />
                ) : (
                    <div className="event-image placeholder-image"></div>
                )}
                {isStartTimeValid && ( // Only show date overlay if date is valid
                    <div className="event-date-overlay">
                        <span className="event-month">{month}</span>
                        <span className="event-day">{day}</span>
                    </div>
                )}
            </div>
            <div className="event-details">
                <h3 className="event-title">
                    {event.eventName || "Unnamed Event"}
                </h3>
                <p className="event-facility">
                    📍 {event.facility?.name || "Location not specified"}
                </p>
                <p className="event-time">
                    ⏰ {time}
                </p>
                <p className="event-description">
                    {truncatedDescription}
                </p>
            </div>
        </motion.div>
    );
}

export default EventCard;