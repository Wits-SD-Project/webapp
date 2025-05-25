// Import necessary React hooks, components, and libraries
import { useParams } from "react-router-dom"; // For accessing route parameters
import { useEffect, useState } from "react"; // React hooks
import { auth, getAuthToken } from "../../firebase"; // Firebase authentication utilities
import {
  Typography,
  Button,
  Paper,
  Chip,
  Skeleton,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Container,
  Grid,
  Box,
  DialogActions,
} from "@mui/material"; // Material-UI components
import DatePicker from "react-datepicker"; // Date picker component
import "react-datepicker/dist/react-datepicker.css"; // Date picker styles
import { toast } from "react-toastify"; // Toast notifications
import Sidebar from "../../components/ResSideBar"; // Sidebar component
import {
  ChevronRight,
  Schedule,
  LocationOn,
  Info,
  Close,
  CalendarToday,
} from "@mui/icons-material"; // Material-UI icons
import "../../styles/facilityDetail.css"; // Component styles
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"; // Map components
import L from "leaflet"; // Leaflet library for maps

// Fix for Leaflet marker icons in Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Main FacilityDetail component
export default function FacilityDetail() {
  // Get facility ID from URL parameters
  const { id } = useParams();
  
  // State management
  const [facility, setFacility] = useState(null); // Facility details
  const [selectedSlot, setSelectedSlot] = useState(null); // Selected time slot
  const [selectedDate, setSelectedDate] = useState(null); // Selected booking date
  const [showConfirmation, setShowConfirmation] = useState(false); // Booking confirmation dialog visibility
  const [activeTab, setActiveTab] = useState(0); // Active tab in availability section
  const [loading, setLoading] = useState(true); // Loading state
  const [searchQuery, setSearchQuery] = useState(""); // Search query (unused in current implementation)
  const [weatherLoading, setWeatherLoading] = useState(null); // Weather data loading state
  const [weather, setWeather] = useState(null); // Weather forecast data
  
  // Placeholder image URL for when facility images are not available
  const placeholder =
    "https://images.unsplash.com/photo-1527767654427-1790d8ff3745?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

  // Fetch facility details when component mounts or ID changes
  useEffect(() => {
    const fetchFacility = async () => {
      setLoading(true);
      try {
        // 1. Get authentication token
        let token;
        try {
          token = await getAuthToken();
          if (!token) throw new Error("No auth token available");
        } catch (authError) {
          throw new Error("Authentication failed: " + authError.message);
        }

        // 2. Make API request
        const response = await fetch(
          `http://localhost:8080/api/facilities/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        // 3. Handle response
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || `HTTP error! status: ${response.status}`
          );
        }

        // 4. Update state
        setFacility(data);
      } catch (err) {
        toast.error(err.message || "Failed to load facility details");
        setFacility(null); // Clear any previous facility data
      } finally {
        setLoading(false);
      }
    };

    fetchFacility();
    console.log(facility);
  }, [id]);

  // Fetch weather data when facility coordinates are available
  useEffect(() => {
    if (!facility?.coordinates) return;
    const { lat, lng } = facility.coordinates;

    setWeatherLoading(true);
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
        `&timezone=auto`
    )
      .then(async (res) => {
        console.log("Raw response status:", res.status);
        const json = await res.json();
        console.log("Open-Meteo payload:", json);
        return json;
      })
      .then((data) => {
        if (!data.daily) {
          console.warn("No `daily` field on data!", data);
          setWeather(null);
          return;
        }
        setWeather({
          dates: data.daily.time,
          codes: data.daily.weathercode,
          max: data.daily.temperature_2m_max,
          min: data.daily.temperature_2m_min,
        });
      })
      .catch((err) => {
        console.error("Weather fetch error:", err);
        setWeather(null);
      })
      .finally(() => {
        setWeatherLoading(false);
      });
  }, [facility]);

  /**
   * Groups time slots by day of week
   * @param {Array} slots - Array of time slot objects
   * @returns {Object} Object with days as keys and arrays of slots as values
   */
  const groupSlotsByDay = (slots) => {
    return slots.reduce((acc, slot) => {
      if (!acc[slot.day]) acc[slot.day] = [];
      acc[slot.day].push(slot);
      return acc;
    }, {});
  };

  /**
   * Handles date selection for booking
   * @param {Date} date - Selected date
   */
  const handleDateSelect = (date) => {
    const selectedDay = date.toLocaleString("en-US", { weekday: "long" });

    if (selectedDay !== selectedSlot.day) {
      toast.error(`Please select a ${selectedSlot.day}`);
      return;
    }

    setSelectedDate(date);
    setShowConfirmation(true);
  };

  /**
   * Confirms booking by making API request
   */
  const confirmBooking = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please log in to complete booking");

      const slotTime = `${selectedSlot.start} - ${selectedSlot.end}`;
      const formattedDate = selectedDate.toISOString().split("T")[0];

      const response = await fetch(
        "http://localhost:8080/api/facilities/bookings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({
            facilityId: facility.id,
            facilityName: facility.name,
            slot: slotTime,
            selectedDate: formattedDate,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Booking failed");

      toast.success(
        `Successfully booked ${facility.name} for ${formattedDate} at ${selectedSlot.start}`
      );
    } catch (err) {
      toast.error(err.message || "Booking failed");
    } finally {
      setSelectedSlot(null);
      setSelectedDate(null);
      setShowConfirmation(false);
    }
  };

  // Loading state UI
  if (loading) {
    return (
      <main className="dashboard">
        <div className="container">
          <Sidebar activeItem="facility bookings" />
          <main className="main-content">
            <div className="loading-container">
              <Skeleton variant="rectangular" className="skeleton-main" />
              <Skeleton variant="text" className="skeleton-title" />
              <Skeleton variant="text" className="skeleton-subtitle" />
              <div className="skeleton-grid">
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    variant="rectangular"
                    className="skeleton-card"
                  />
                ))}
              </div>
            </div>
          </main>
        </div>
      </main>
    );
  }

  // Error state UI (facility not found)
  if (!facility) {
    return (
      <main className="dashboard">
        <div className="container">
          <Sidebar activeItem="facility bookings" />
          <main className="main-content">
            <div className="error-message">
              <Typography variant="h6">Facility not found</Typography>
            </div>
          </main>
        </div>
      </main>
    );
  }

  // Group time slots by day for display
  const groupedSlots = groupSlotsByDay(facility.timeslots || []);
  const days = Object.keys(groupedSlots);

  // Main component render
  return (
    <main className="dashboard">
      <div className="container">
        <Sidebar activeItem="facility bookings" />

        <main className="main-content">
          {/* Page header with facility name */}
          <header className="page-header">
            <h1>{facility.name}</h1>
          </header>

          {/* Facility information chips */}
          <div className="facility-chips">
            <Chip
              icon={<LocationOn fontSize="small" />}
              label={facility.location || "Location not specified"}
              variant="outlined"
              className="facility-chip"
            />
            <Chip
              icon={<Info fontSize="small" />}
              label={facility.type || "General Facility"}
              color="primary"
              className="facility-chip"
            />
          </div>

          {/* Main content area */}
          <div className="facility-content">
            {/* Details Section */}
            <div className="details-section">
              <div className="details-content">
                <Paper elevation={0} className="details-paper">
                  <h3>About this facility</h3>
                  <Typography variant="body1" className="facility-description">
                    {facility.description || "No description available."}
                  </Typography>

                  {/* Features section */}
                  <div className="features-section">
                    <h3>Features</h3>
                    {facility.features && facility.features.length > 0 ? (
                      <div className="features-grid">
                        {facility.features.map((feature, index) => (
                          <div key={index} className="feature-chip-container">
                            <Chip
                              label={feature}
                              variant="outlined"
                              className="feature-chip"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No features added yet.
                      </Typography>
                    )}
                  </div>
                </Paper>
              </div>

              {/* Booking Section */}
              <div className="booking-section">
                <Paper elevation={0} className="booking-paper">
                  <h3>Availability</h3>

                  {/* Day tabs for availability */}
                  <div className="booking-tabs">
                    <Tabs
                      value={activeTab}
                      onChange={(e, newValue) => setActiveTab(newValue)}
                      variant="scrollable"
                      scrollButtons="auto"
                      className="availability-tabs"
                    >
                      {days.map((day) => (
                        <Tab label={day} key={day} className="day-tab" />
                      ))}
                    </Tabs>
                  </div>

                  {/* Time slots for selected day */}
                  <div className="slots-container">
                    {groupedSlots[days[activeTab]]?.map((slot, index) => (
                      <Button
                        fullWidth
                        key={index}
                        variant={
                          selectedSlot?.id === slot.id
                            ? "contained"
                            : "outlined"
                        }
                        startIcon={<Schedule />}
                        onClick={() => setSelectedSlot(slot)}
                        className={`slot-button ${
                          selectedSlot?.id === slot.id ? "selected" : ""
                        }`}
                      >
                        <span>
                          {slot.start} - {slot.end}
                        </span>
                        <ChevronRight />
                      </Button>
                    ))}
                  </div>

                  {/* Date picker when slot is selected */}
                  {selectedSlot && (
                    <div className="date-picker-section">
                      <Typography
                        variant="subtitle1"
                        className="date-picker-title"
                      >
                        Select Date for {selectedSlot.day}
                      </Typography>
                      <div className="date-picker-container">
                        <DatePicker
                          selected={selectedDate}
                          onChange={handleDateSelect}
                          minDate={new Date()}
                          inline
                          filterDate={(date) =>
                            date.toLocaleString("en-US", {
                              weekday: "long",
                            }) === selectedSlot.day
                          }
                          dayClassName={(date) => {
                            const day = date.toLocaleString("en-US", {
                              weekday: "long",
                            });
                            return day === selectedSlot.day
                              ? "highlight-day"
                              : "non-highlight-day";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </Paper>
              </div>
            </div>
            
            <div className="location-content">
              {/* Map section showing facility location */}
              {facility.coordinates && (
                <Container sx={{ mt: 4 }}>
                  <h3>Facility Location</h3>
                  <h3></h3>
                  <Box
                    sx={{
                      width: "100%",
                      height: 300,
                      borderRadius: 2,
                      overflow: "hidden",
                      mb: 4,
                    }}
                  >
                    <MapContainer
                      center={[
                        facility.coordinates.lat,
                        facility.coordinates.lng,
                      ]}
                      zoom={15}
                      style={{ height: "100%", width: "100%" }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                      />
                      <Marker
                        position={[
                          facility.coordinates.lat,
                          facility.coordinates.lng,
                        ]}
                      >
                        <Popup>
                          {facility.name}
                          <br />
                          {facility.location}
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </Box>
                </Container>
              )}
            </div>
            

            {/* Weather forecast section */}
            <div className="weather-content">
              {facility.coordinates && (
                <Container sx={{ mt: 4 }}>
                  <h3>7-Day Weather Forecast</h3>

                  {weatherLoading || !weather?.dates ? (
                    <Typography>Loading weather…</Typography>
                  ) : (
                    <Grid container spacing={2}>
                      {weather.dates.slice(0, 7).map((dateStr, idx) => {
                        const date = new Date(dateStr);
                        const dayName = date.toLocaleDateString("en-US", {
                          weekday: "short",
                        });
                        const maxT = Math.round(weather.max[idx]);
                        const minT = Math.round(weather.min[idx]);
                        const code = weather.codes[idx];

                        // map Open-Meteo code → emoji
                        const icon =
                          {
                            0: "☀️", // clear
                            1: "🌤️", // mainly clear
                            2: "⛅", // partly cloudy
                            3: "☁️", // overcast
                            61: "🌧️", // rain
                            71: "❄️", // snow
                            95: "⛈️", // thunderstorm
                          }[code] || "ℹ️";

                        return (
                          <Grid item xs={6} sm={4} md={2} key={idx}>
                            <Paper
                              elevation={1}
                              sx={{ p: 1, textAlign: "center", borderRadius: 2 }}
                            >
                              <Typography variant="subtitle2">
                                {dayName}
                              </Typography>
                              <Typography sx={{ fontSize: 32 }}>
                                {icon}
                              </Typography>
                              <Typography variant="body2">
                                {maxT}° / {minT}°
                              </Typography>
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}
                </Container>
              )}
            </div>
            

            {/* Image Gallery */}
            <div className="image-gallery">
              <div className="main-image-container">
                <img
                  src={facility.imageUrls?.[0] || placeholder}
                  alt="Main facility"
                  className="main-image"
                />
              </div>
              <div className="side-images-container">
                <div className="side-images-grid">
                  {facility.imageUrls?.slice(1, 5).map((url, index) => (
                    <div key={index} className="side-image-container">
                      <img
                        src={url}
                        alt={`Facility view ${index + 1}`}
                        className="side-image"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Booking Confirmation Dialog */}
            <Dialog
              open={showConfirmation}
              onClose={() => setShowConfirmation(false)}
              maxWidth="xs"
              fullWidth
              className="confirmation-dialog"
            >
              <DialogTitle className="dialog-title">
                <div className="dialog-header">
                  Confirm Booking
                  <IconButton
                    onClick={() => setShowConfirmation(false)}
                    className="close-button"
                  >
                    <Close />
                  </IconButton>
                </div>
              </DialogTitle>
              <DialogContent dividers className="dialog-content">
                <div className="booking-details">
                  <div className="booking-detail-item">
                    <Typography variant="subtitle1" className="facility-name">
                      {facility.name}
                    </Typography>
                  </div>
                  <div className="booking-detail-item">
                    <div className="booking-detail-row">
                      <CalendarToday fontSize="small" />
                      <Typography className="booking-detail-text">
                        {selectedDate?.toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </Typography>
                    </div>
                  </div>
                  <div className="booking-detail-item">
                    <div className="booking-detail-row">
                      <Schedule fontSize="small" />
                      <Typography className="booking-detail-text">
                        {selectedSlot?.start} - {selectedSlot?.end}
                      </Typography>
                    </div>
                  </div>
                </div>
              </DialogContent>
              <DialogActions className="dialog-actions">
                <Button
                  onClick={() => setShowConfirmation(false)}
                  className="cancel-button"
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={confirmBooking}
                  autoFocus
                  className="confirm-button"
                >
                  Confirm Booking
                </Button>
              </DialogActions>
            </Dialog>
          </div>
        </main>
      </div>
    </main>
  );
}