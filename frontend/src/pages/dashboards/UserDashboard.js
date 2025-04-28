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
import { collection, getDocs, query, where } from "firebase/firestore";
import Navbar from "../../components/Navbar";

const pill = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
    "& fieldset": { borderRadius: 8, borderWidth: 2 },
    mb: 4,
  },
};

const placeholder =
  "https://images.unsplash.com/photo-1527767654427-1790d8ff3745?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

export default function UserDashboard() {
  const [facilities, setFacilities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchNotifications = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const q = query(
          collection(db, "notifications"),
          where("userName", "==", user.email || user.displayName)
        );
        const snapshot = await getDocs(q);
        const notifs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotifications(notifs);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, []);

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "facilities-test"));
        const facilitiesData = querySnapshot.docs.map((doc) => {
          const facilityData = doc.data();
          return {
            id: doc.id,
            name: facilityData.name,
            type: facilityData.type,
            isOutdoors: facilityData.isOutdoors,
            availability: facilityData.availability,
            // map timeslots inside slots
            slots: facilityData.timeslots || [],
          };
        });

        setFacilities(facilitiesData);
        console.log(facilitiesData);
      } catch (error) {
        console.error("Error fetching facilities:", error);
      }
    };

    fetchFacilities();
  }, []);

  const openDrawer = (fac) => {
    console.log(fac);
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
    <>
      <Navbar />

      {/* ---------- GRID OF CARDS ---------- */}
      <Box sx={{ p: 4 }}>
        <TextField
          fullWidth
          placeholder="🔍 Search facilities…"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={pill}
        />

        <Grid container spacing={4}>
          {facilities
            .filter((f) =>
              f.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((facility) => {
              const img = facility.imageUrls?.[0]?.trim() || placeholder;
              return (
                <Grid item key={facility.id} xs={12} sm={6} md={4} lg={3}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="160"
                      image={img}
                      alt={facility.name}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {facility.name}
                      </Typography>
                      {facility.location && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <PlaceIcon fontSize="small" />
                          {facility.location}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => openDrawer(facility)}
                      >
                        Book Now
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
        </Grid>
      </Box>

      {/* ---------- SLIDE-IN DRAWER ---------- */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedSlot(null);
          setShowDatePicker(false);
        }}
        sx={{ "& .MuiDrawer-paper": { width: "50vw", p: 3 } }}
      >
        {selectedFacility && (
          <>
            <Typography variant="h5" sx={{ mb: 2 }}>
              {selectedFacility.name}
            </Typography>

            {selectedFacility.slots?.length === 0 ? (
              <Typography>No time-slots available.</Typography>
            ) : (
              <List dense>
                {selectedFacility.slots.map((slot, i) => (
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

        {/* date-picker overlay inside drawer */}
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

      {/* ---------- NOTIFICATIONS ---------- */}
      <Box
        sx={{
          position: "fixed",
          top: 80,
          right: 16,
          width: 280,
          maxHeight: "80vh",
          overflowY: "auto",
          bgcolor: "#fafafa",
          borderRadius: 2,
          p: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Notifications
        </Typography>
        {notifications.length === 0 ? (
          <Typography>No notifications.</Typography>
        ) : (
          notifications.map((n) => (
            <Box
              key={n.id}
              sx={{
                mb: 1,
                p: 1,
                pl: 2,
                borderLeft: `5px solid ${
                  n.status === "approved" ? "green" : "red"
                }`,
                bgcolor: "#f1f1f1",
                borderRadius: 1,
              }}
            >
              <Typography variant="body2">
                <strong>{n.status.toUpperCase()}</strong> – {n.facilityName}
              </Typography>
              <Typography variant="caption">
                {n.slot} on {n.date}
              </Typography>
            </Box>
          ))
        )}
      </Box>
    </>
  );
}
