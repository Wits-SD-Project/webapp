import React, { useEffect, useState, useMemo } from "react";
import { getAuthToken } from "../../firebase";
import Sidebar from "../../components/ResSideBar";
import { format, isFuture, isPast } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import EventCard from "../../components/EventCard";
import EventDetailsModal from "../../components/EventDetailsModal";
import "../../styles/ResEvents.css";

export default function ResEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterType, setFilterType] = useState("upcoming");
  const [selectedFacility, setSelectedFacility] = useState("all");
  const [availableFacilities, setAvailableFacilities] = useState([]);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Authentication required. Please log in.");
      }

      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/admin/events`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // First check if the response is OK (status 200-299)
      if (!res.ok) {
        // Try to parse error message if it's JSON
        try {
          const errorData = await res.json();
          throw new Error(
            errorData.message || `HTTP error! status: ${res.status}`
          );
        } catch (e) {
          // If not JSON, use the status text
          throw new Error(
            res.statusText || `HTTP error! status: ${res.status}`
          );
        }
      }

      // If response is OK, parse as JSON
      const result = await res.json();

      const fetchedEvents = result.events.map((event) => {
        const startTime = event.startTime ? new Date(event.startTime) : null;
        const endTime = event.endTime ? new Date(event.endTime) : null;

        const isValidDate = (date) =>
          date instanceof Date && !isNaN(date.getTime());

        return {
          ...event,
          startTime: isValidDate(startTime) ? startTime : null,
          endTime: isValidDate(endTime) ? endTime : null,
        };
      });

      const facilities = new Set();
      fetchedEvents.forEach((event) => {
        if (event.facility && event.facility.id && event.facility.name) {
          facilities.add(
            JSON.stringify({ id: event.facility.id, name: event.facility.name })
          );
        }
      });
      setAvailableFacilities(
        Array.from(facilities).map((item) => JSON.parse(item))
      );

      setEvents(fetchedEvents);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError(err.message || "Failed to fetch events. Please try again.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    let currentEvents = events;

    if (filterType === "upcoming") {
      currentEvents = currentEvents.filter(
        (event) => event.startTime && isFuture(event.startTime)
      );
    } else if (filterType === "past") {
      currentEvents = currentEvents.filter(
        (event) => event.startTime && isPast(event.startTime)
      );
    }

    if (selectedFacility !== "all") {
      currentEvents = currentEvents.filter(
        (event) => event.facility && event.facility.id === selectedFacility
      );
    }

    currentEvents.sort((a, b) => {
      const dateA = a.startTime ? a.startTime.getTime() : 0;
      const dateB = b.startTime ? b.startTime.getTime() : 0;
      return dateA - dateB;
    });

    return currentEvents;
  }, [events, filterType, selectedFacility]);

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  return (
    <div className="dashboard">
      <Sidebar activeItem="dashboard" />
      <div className="main-content">
        <header className="page-header">
          <h1>Events</h1>
        </header>

        <section className="event-filters">
          <div className="filter-group">
            <label htmlFor="filter-type" className="filter-label">
              Show:
            </label>
            <select
              id="filter-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="all">All</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-facility" className="filter-label">
              Facility:
            </label>
            <select
              id="filter-facility"
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Facilities</option>
              {availableFacilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading events...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p className="error-message">{error}</p>
            <div className="error-actions">
              <button onClick={fetchEvents} className="retry-btn">
                Retry
              </button>
              {error.includes("Authentication") && (
                <button
                  onClick={() => (window.location.href = "/login")}
                  className="login-btn"
                >
                  Go to Login
                </button>
              )}
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="no-events-found">
            <p>No events found matching your criteria.</p>
            <button
              onClick={() => {
                setFilterType("upcoming");
                setSelectedFacility("all");
              }}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <section className="events-grid">
            <AnimatePresence>
              {filteredEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <EventCard
                    event={event}
                    onClick={() => handleEventClick(event)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </section>
        )}

        <AnimatePresence>
          {selectedEvent && (
            <EventDetailsModal
              event={selectedEvent}
              onClose={handleCloseModal}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
