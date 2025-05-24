import React, { useEffect, useState } from "react";
// Material-UI components for UI layout
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  Drawer,
  List,
  ListItem,
  ListItemText,
  TextField,
  Box,
} from "@mui/material";
// Icons and date picker components
import PlaceIcon from "@mui/icons-material/Place";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// Notification and routing utilities
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
// Firebase services
import { db, auth } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
// Custom components and styles
import Sidebar from "../../components/ResSideBar";
import "../../styles/userDashboard.css";

// Default image placeholder URL
const placeholder =
  "https://images.unsplash.com/photo-1527767654427-1790d8ff3745?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

export default function UserDashboard() {
  // State management
  const [facilities, setFacilities] = useState([]); // Stores all facility data
  const [selectedSlot, setSelectedSlot] = useState(null); // Currently selected time slot
  const [selectedFacility, setSelectedFacility] = useState(null); // Currently selected facility
  const [drawerOpen, setDrawerOpen] = useState(false); // Controls booking drawer visibility
  const [showDatePicker, setShowDatePicker] = useState(false); // Controls date picker visibility
  const [searchQuery, setSearchQuery] = useState(""); // Search filter input
  const navigate = useNavigate(); // Navigation hook

  /**
   * Fetches facility data from Firestore on component mount
   */
  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "facilities-test"));
        const facilitiesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFacilities(facilitiesData);
      } catch (error) {
        console.error("Error fetching facilities:", error);
        toast.error("Failed to load facilities");
      }
    };

    fetchFacilities();
  }, []);

  /**
   * Opens the booking drawer for a specific facility
   * @param {Object} fac - Facility object to display in drawer
   */
  const openDrawer = (fac) => {
    setSelectedFacility(fac);
    setDrawerOpen(true);
  };

  /**
   * Initiates booking process by selecting a time slot
   * @param {Object} facility - Selected facility
   * @param {Object} slot - Selected time slot
   */
  const startBooking = (facility, slot) => {
    setSelectedFacility(facility);
    setSelectedSlot(slot);
    setShowDatePicker(true);
  };

  /**
   * Confirms booking with selected date after validation
   * @param {Date} date - Selected booking date
   */
  const confirmBooking = async (date) => {
    if (!selectedSlot || !selectedFacility) return;

    // Validate selected day matches slot's available day
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const selectedDay = daysOfWeek[date.getDay()];

    if (selectedDay !== selectedSlot.day) {
      toast.error(
        `Please select a date that falls on a ${selectedSlot.day}. You picked a ${selectedDay}.`
      );
      return;
    }

    // Validate selected time is in the future
    const [startHour, startMinute] = selectedSlot.start.split(":").map(Number);
    const slotStartDateTime = new Date(date);
    slotStartDateTime.setHours(startHour, startMinute, 0, 0);

    const now = new Date();
    if (slotStartDateTime < now) {
      toast.error(
        "This time slot has already passed. Please select a future time."
      );
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

      // Format slot time for API request
      const slotTime = `${selectedSlot.start} - ${selectedSlot.end}`;

      // Send booking request to backend API
      const response = await fetch(
        "http://localhost:8080/api/facilities/bookings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({
            facilityId: selectedFacility.id,
            facilityName: selectedFacility.name,
            slot: slotTime,
            selectedDate: date.toISOString().split("T")[0],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to book slot");
      }

      // Success notification
      toast.success(
        `Booking confirmed for ${
          selectedFacility.name
        } on ${date.toDateString()} at ${selectedSlot.start}.`
      );
    } catch (error) {
      console.error("Error booking timeslot:", error);
      toast.error(error.message || "Failed to book the timeslot.");
    } finally {
      // Reset booking state
      setSelectedSlot(null);
      setSelectedFacility(null);
      setShowDatePicker(false);
    }
  };

  return (
    <main className="user-dashboard">
      <div className="container">
        {/* Sidebar navigation - highlights "facility bookings" */}
        <Sidebar activeItem="facility bookings" />

        {/* Main content area */}
        <main className="main-content">
          {/* Page header with title and search */}
          <header className="page-header">
            <h1>Facility Bookings</h1>
            <input
              type="search"
              placeholder="Search facilities..."
              className="search-box"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </header>

          {/* Facilities grid */}
          <section className="facilities-grid">
            {facilities
              // Filter facilities based on search query
              .filter((f) =>
                f.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              // Render each facility as a card
              .map((facility) => {
                const img = facility.imageUrls?.[0]?.trim() || placeholder;
                return (
                  <div key={facility.id} className="facility-card">
                    <div className="facility-image">
                      <img src={img} alt={facility.name} />
                    </div>
                    <div className="facility-details">
                      <h3>{facility.name}</h3>
                      {facility.location && (
                        <p className="location">
                          <PlaceIcon fontSize="small" />
                          {facility.location}
                        </p>
                      )}
                      <button
                        className="book-button"
                        onClick={() => navigate(`/facility/${facility.id}`)}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                );
              })}
          </section>
        </main>
      </div>

      {/* Booking Drawer - Slides in from right */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedSlot(null);
          setShowDatePicker(false);
        }}
        sx={{ "& .MuiDrawer-paper": { width: "min(90vw, 400px)", p: 3 } }}
      >
        {selectedFacility && (
          <>
            {/* Drawer header with facility name */}
            <Typography variant="h5" sx={{ mb: 2 }}>
              {selectedFacility.name}
            </Typography>

            {/* Time slots list or empty state */}
            {selectedFacility.timeslots?.length === 0 ? (
              <Typography>No time-slots available.</Typography>
            ) : (
              <List dense>
                {selectedFacility.timeslots.map((slot, i) => (
                  <ListItem
                    key={i}
                    secondaryAction={
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => startBooking(selectedFacility, slot)}
                      >
                        Select
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={`${slot.day} • ${slot.start} – ${slot.end}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}

        {/* Date picker for selected time slot */}
        {showDatePicker && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Pick a date for {selectedSlot?.day}
            </Typography>
            <DatePicker
              selected={null}
              onChange={(d) => confirmBooking(d)}
              minDate={new Date()}
              inline
            />
            <Button
              color="error"
              sx={{ mt: 1 }}
              onClick={() => {
                setShowDatePicker(false);
                setSelectedSlot(null);
              }}
            >
              Cancel
            </Button>
          </Box>
        )}
      </Drawer>
    </main>
  );
}
