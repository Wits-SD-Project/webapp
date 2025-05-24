// Import necessary React hooks and components
import React, { useEffect, useState, useMemo } from "react";
// Import authentication utility
import { getAuthToken } from "../../firebase";
// Import sidebar navigation component
import Sidebar from "../../components/ResSideBar";
// Import date utility functions
import { format, isFuture, isPast } from "date-fns";
// Import animation libraries
import { motion, AnimatePresence } from "framer-motion";
// Import custom components
import EventCard from "../../components/EventCard";
import EventDetailsModal from "../../components/EventDetailsModal";
// Import component styles
import "../../styles/ResEvents.css";
import { useAuth } from "../../context/AuthContext.js"; // Authentication context

export default function ResEvents() {
    // State management for events data and UI
    const [events, setEvents] = useState([]); // Stores all fetched events
    const [loading, setLoading] = useState(true); // Tracks loading state
    const [error, setError] = useState(null); // Stores error messages
    const [selectedEvent, setSelectedEvent] = useState(null); // Currently selected event for modal view
    const [filterType, setFilterType] = useState("upcoming"); // Current time filter ('upcoming', 'past', 'all')
    const [selectedFacility, setSelectedFacility] = useState("all"); // Current facility filter
    const [availableFacilities, setAvailableFacilities] = useState([]); // List of unique facilities from events
    const { authUser } = useAuth(); // Get authenticated user from context
    const username = authUser?.name || "Resident"; // Fallback to "Resident" if name not available

    /**
     * Fetches events data from API with authentication
     * Handles errors and processes response data
     */
    const fetchEvents = async () => {
        setLoading(true); // Set loading state
        setError(null); // Clear previous errors
        try {
            // 1. Get authentication token
            const token = await getAuthToken();
            if (!token) {
                throw new Error("Authentication required. Please log in.");
            }

            // 2. Make API request to fetch events
            const res = await fetch("http://localhost:8080/api/admin/events", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

            // 3. Handle response status
            if (!res.ok) {
                // Try to parse error message if it's JSON
                try {
                    const errorData = await res.json();
                    throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
                } catch (e) {
                    // If not JSON, use the status text
                    throw new Error(res.statusText || `HTTP error! status: ${res.status}`);
                }
            }

            // 4. Process successful response
            const result = await res.json();

            // 5. Normalize and validate event dates
            const fetchedEvents = result.events.map((event) => {
                const startTime = event.startTime ? new Date(event.startTime) : null;
                const endTime = event.endTime ? new Date(event.endTime) : null;

                // Helper function to validate Date objects
                const isValidDate = (date) => date instanceof Date && !isNaN(date.getTime());

                return {
                    ...event, // Spread existing event properties
                    startTime: isValidDate(startTime) ? startTime : null,
                    endTime: isValidDate(endTime) ? endTime : null,
                };
            });

            // 6. Extract unique facilities for filter dropdown
            const facilities = new Set();
            fetchedEvents.forEach((event) => {
                if (event.facility && event.facility.id && event.facility.name) {
                    facilities.add(JSON.stringify({ 
                        id: event.facility.id, 
                        name: event.facility.name 
                    }));
                }
            });
            setAvailableFacilities(Array.from(facilities).map(item => JSON.parse(item)));

            // 7. Update events state with processed data
            setEvents(fetchedEvents);

        } catch (err) {
            console.error("Error fetching events:", err);
            setError(err.message || "Failed to fetch events. Please try again.");
            setEvents([]); // Clear events on error
        } finally {
            setLoading(false); // Ensure loading state is cleared
        }
    };

    // Fetch events on component mount
    useEffect(() => {
        fetchEvents();
    }, []);

    /**
     * Memoized filtered events based on current filters
     * Optimized to only recalculate when dependencies change
     */
    const filteredEvents = useMemo(() => {
        let currentEvents = [...events]; // Create a copy to avoid mutating original array

        // Apply time-based filters
        if (filterType === "upcoming") {
            currentEvents = currentEvents.filter((event) => 
                event.startTime && isFuture(event.startTime)
            );
        } else if (filterType === "past") {
            currentEvents = currentEvents.filter((event) => 
                event.startTime && isPast(event.startTime)
            );
        }

        // Apply facility filter if not "all"
        if (selectedFacility !== "all") {
            currentEvents = currentEvents.filter(
                (event) => event.facility && event.facility.id === selectedFacility
            );
        }

        // Sort events chronologically by start time
        currentEvents.sort((a, b) => {
            const dateA = a.startTime ? a.startTime.getTime() : 0;
            const dateB = b.startTime ? b.startTime.getTime() : 0;
            return dateA - dateB; // Ascending order (earliest first)
        });

        return currentEvents;
    }, [events, filterType, selectedFacility]);

    // Event handler for clicking an event card
    const handleEventClick = (event) => {
        setSelectedEvent(event); // Set the selected event for modal view
    };

    // Event handler for closing the modal
    const handleCloseModal = () => {
        setSelectedEvent(null); // Clear the selected event
    };

    // Component render
    return (
        <div className="dashboard">
            {/* Sidebar navigation */}
            <Sidebar activeItem="events" />
            
            {/* Main content area */}
            <div className="main-content">
                {/* Page header */}
                <header className="page-header">
                    <h1>Events</h1>
                    <div className="user-name">{username}</div>
                </header>

                {/* Filter controls section */}
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

                {/* Conditional rendering based on state */}
                {loading ? (
                    // Loading state
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading events...</p>
                    </div>
                ) : error ? (
                    // Error state
                    <div className="error-state">
                        <p className="error-message">{error}</p>
                        <div className="error-actions">
                            <button
                                onClick={fetchEvents}
                                className="retry-btn"
                            >
                                Retry
                            </button>
                            {/* Show login button for authentication errors */}
                            {error.includes("Authentication") && (
                                <button
                                    onClick={() => window.location.href = "/login"}
                                    className="login-btn"
                                >
                                    Go to Login
                                </button>
                            )}
                        </div>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    // No events found state
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
                    // Events grid with animations
                    <section className="events-grid">
                        <AnimatePresence>
                            {filteredEvents.map((event) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 20 }} // Initial animation state
                                    animate={{ opacity: 1, y: 0 }} // Animate to full visibility
                                    exit={{ opacity: 0 }} // Exit animation
                                    transition={{ duration: 0.3 }} // Animation duration
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

                {/* Event details modal (conditionally rendered) */}
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
