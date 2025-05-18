import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

function EventDetailsModal({ event, onClose }) {
    if (!event) return null;

    const formattedStartTime = event.startTime instanceof Date && !isNaN(event.startTime)
        ? format(event.startTime, "EEEE, MMMM dd, yyyy 'at' h:mm a")
        : "Date and time not available";

    const formattedEndTime = event.endTime instanceof Date && !isNaN(event.endTime)
        ? format(event.endTime, "h:mm a")
        : "";

    const generateGoogleCalendarLink = () => {
        if (!event.startTime || !event.endTime) return '#';
        const title = encodeURIComponent(event.eventName || "Event");
        const description = encodeURIComponent(event.description || "");
        const location = encodeURIComponent(event.facility?.name || '');
        // Google Calendar uses basic ISO format without milliseconds and 'Z'
        const dates = `${format(event.startTime, "yyyyMMdd'T'HHmmss")}/${format(event.endTime, "yyyyMMdd'T'HHmmss")}`;
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${description}&location=${location}&dates=${dates}`;
    };

    const generateOutlookCalendarLink = () => {
        if (!event.startTime || !event.endTime) return '#';
        const title = encodeURIComponent(event.eventName || "Event");
        const description = encodeURIComponent(event.description || "");
        const location = encodeURIComponent(event.facility?.name || '');
        // Outlook/Office 365 uses ISO 8601 format
        const start = format(event.startTime, "yyyy-MM-dd'T'HH:mm:ss");
        const end = format(event.endTime, "yyyy-MM-dd'T'HH:mm:ss");
        return `https://outlook.live.com/owa/?path=/calendar/action/compose&rru=addevent&startdt=${start}&enddt=${end}&subject=${title}&body=${description}&location=${location}`;
    };

    return (
        <AnimatePresence>
            <motion.div
                className="modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose} // Close when clicking outside
            >
                <motion.div
                    className="modal-content"
                    initial={{ y: "-100vh", opacity: 0 }}
                    animate={{ y: "0", opacity: 1 }}
                    exit={{ y: "100vh", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="event-modal-title"
                >
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close event details">
                        &times;
                    </button>
                    {event.posterImage ? (
                        <img src={event.posterImage} alt={event.eventName || "Event image"} className="modal-event-image" />
                    ) : (
                        <div className="modal-event-image placeholder-image-modal"></div>
                    )}
                    <h2 id="event-modal-title">{event.eventName || "Unnamed Event"}</h2>
                    <p className="modal-event-time">
                        {formattedStartTime} {formattedEndTime && `- ${formattedEndTime}`}
                    </p>
                    <p className="modal-event-location">📍 {event.facility?.name || "Location not specified"}</p>
                    <p className="modal-event-description">{event.description || "No description available."}</p>

                    <div className="modal-actions">
                        <a href={generateGoogleCalendarLink()} target="_blank" rel="noopener noreferrer" className="calendar-btn google-calendar-btn">
                            <span role="img" aria-label="Google Calendar">📅</span> Add to Google Calendar
                        </a>
                        <a href={generateOutlookCalendarLink()} target="_blank" rel="noopener noreferrer" className="calendar-btn outlook-calendar-btn">
                            <span role="img" aria-label="Outlook Calendar">🗓️</span> Add to Outlook Calendar
                        </a>
                        {/* Potentially add an RSVP/Register button here if applicable */}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default EventDetailsModal;