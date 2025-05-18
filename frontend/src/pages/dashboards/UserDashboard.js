import React, { useEffect, useState } from "react";
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
import PlaceIcon from "@mui/icons-material/Place";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-toastify";
import { db, auth } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import Sidebar from "../../components/ResSideBar";
import "../../styles/userDashboard.css";
import { useNavigate } from "react-router-dom";



const placeholder =
  "https://images.unsplash.com/photo-1527767654427-1790d8ff3745?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

export default function UserDashboard() {
  const [facilities, setFacilities] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "facilities-test"));
        const facilitiesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFacilities(facilitiesData);
        console.log(facilitiesData);
      } catch (error) {
        console.error("Error fetching facilities:", error);
      }
    };

    fetchFacilities();
  }, []);

  const openDrawer = (fac) => {
    setSelectedFacility(fac);
    setDrawerOpen(true);
  };

  const startBooking = (facility, slot) => {
    setSelectedFacility(facility);
    setSelectedSlot(slot);
    setShowDatePicker(true);
  };

  const confirmBooking = async (date) => {
    if (!selectedSlot || !selectedFacility) return;

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

      const slotTime = `${selectedSlot.start} - ${selectedSlot.end}`;

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

      toast.success(
        `Booking confirmed for ${
          selectedFacility.name
        } on ${date.toDateString()} at ${selectedSlot.start}.`
      );
    } catch (error) {
      console.error("Error booking timeslot:", error);
      toast.error(error.message || "Failed to book the timeslot.");
    } finally {
      setSelectedSlot(null);
      setSelectedFacility(null);
      setShowDatePicker(false);
    }
  };

  return (
    <main className="user-dashboard">
      <div className="container">
        <Sidebar activeItem="facility bookings" />

        <main className="main-content">
          <header className="page-header">
            <h1>Facility Bookings</h1>
            <input
              type="search"
              placeholder="Search"
              className="search-box"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </header>

          <section className="facilities-grid">
            {facilities
              .filter((f) =>
                f.name.toLowerCase().includes(searchQuery.toLowerCase())
              )
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

      {/* Booking Drawer */}
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
        {console.log("selectedFacility in Drawer:", selectedFacility)}
        {selectedFacility && (
          <>
            <Typography variant="h5" sx={{ mb: 2 }}>
              {selectedFacility.name}
            </Typography>

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
