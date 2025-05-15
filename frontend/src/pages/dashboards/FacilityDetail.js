import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import {
  Box,
  Typography,
  Grid,
  Button,
  Divider,
  Paper,
  Container,
  Chip,
  Skeleton,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-toastify";
import Sidebar from "../../components/ResSideBar";
import { 
  ChevronRight,
  Schedule,
  LocationOn,
  Info,
  Close,
  CalendarToday
} from "@mui/icons-material";
import "../../styles/userDashboard.css";

export default function FacilityDetail() {
  const { id } = useParams();
  const [facility, setFacility] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacility = async () => {
      try {
        const docRef = doc(db, "facilities-test", id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setFacility({ id: snapshot.id, ...snapshot.data() });
        } else {
          toast.error("Facility not found.");
        }
      } catch (err) {
        toast.error("Failed to load facility.");
        console.error("Error fetching facility:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFacility();
  }, [id]);

  const groupSlotsByDay = (slots) => {
    return slots.reduce((acc, slot) => {
      if (!acc[slot.day]) acc[slot.day] = [];
      acc[slot.day].push(slot);
      return acc;
    }, {});
  };

  const handleDateSelect = (date) => {
    const selectedDay = date.toLocaleString("en-US", { weekday: "long" });
    
    if (selectedDay !== selectedSlot.day) {
      toast.error(`Please select a ${selectedSlot.day}`);
      return;
    }

    setSelectedDate(date);
    setShowConfirmation(true);
  };

  const confirmBooking = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please log in to complete booking");

      const slotTime = `${selectedSlot.start} - ${selectedSlot.end}`;
      const formattedDate = selectedDate.toISOString().split("T")[0];

      const response = await fetch("http://localhost:8080/api/facilities/bookings", {
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
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Booking failed");

      toast.success(`Successfully booked ${facility.name} for ${formattedDate} at ${selectedSlot.start}`);
    } catch (err) {
      toast.error(err.message || "Booking failed");
    } finally {
      setSelectedSlot(null);
      setSelectedDate(null);
      setShowConfirmation(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" width="100%" height={400} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="text" width="60%" height={50} />
        <Skeleton variant="text" width="40%" height={30} />
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  if (!facility) return <Typography variant="h6">Facility not found</Typography>;

  const groupedSlots = groupSlotsByDay(facility.timeslots || []);
  const days = Object.keys(groupedSlots);

  return (
    <main className="user-dashboard">
      <div className="container">
        <Sidebar activeItem="facility bookings" />

        <main className="main-content">
          <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header Section */}
            <Box mb={4}>
              <Typography variant="h3" fontWeight={700} gutterBottom>
                {facility.name}
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Chip
                  icon={<LocationOn fontSize="small" />}
                  label={facility.location || "Location not specified"}
                  variant="outlined"
                />
                <Chip
                  icon={<Info fontSize="small" />}
                  label={facility.type || "General Facility"}
                  color="primary"
                />
              </Box>
              <Divider />
            </Box>

            {/* Image Gallery */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} md={8}>
                <img
                  src={facility.imageUrls?.[0] || "/placeholder.jpg"}
                  alt="Main facility"
                  style={{
                    width: "100%",
                    height: 400,
                    objectFit: "cover",
                    borderRadius: 12,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Grid container spacing={2}>
                  {facility.imageUrls?.slice(1, 5).map((url, index) => (
                    <Grid item xs={6} key={index}>
                      <img
                        src={url}
                        alt={`Facility view ${index + 1}`}
                        style={{
                          width: "100%",
                          height: 192,
                          objectFit: "cover",
                          borderRadius: 8,
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>

            {/* Details Section */}
            <Grid container spacing={4}>
              <Grid item xs={12} md={8}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 4, bgcolor: 'background.paper' }}>
                  <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                    About This Facility
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    {facility.description || "No description available."}
                  </Typography>
                  
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>
                      Features
                    </Typography>
                    <Grid container spacing={1}>
                      {facility.features?.map((feature, index) => (
                        <Grid item key={index}>
                          <Chip label={feature} variant="outlined" />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Paper>
              </Grid>

              {/* Booking Section */}
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: 'background.paper' }}>
                  <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                    Availability
                  </Typography>
                  
                  <Tabs
                    value={activeTab}
                    onChange={(e, newValue) => setActiveTab(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ mb: 2 }}
                  >
                    {days.map((day) => (
                      <Tab label={day} key={day} />
                    ))}
                  </Tabs>

                  <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                    {groupedSlots[days[activeTab]]?.map((slot, index) => (
                      <Button
                        fullWidth
                        key={index}
                        variant={selectedSlot?.id === slot.id ? "contained" : "outlined"}
                        startIcon={<Schedule />}
                        onClick={() => setSelectedSlot(slot)}
                        sx={{
                          mb: 1,
                          justifyContent: 'space-between',
                          py: 1.5,
                          borderRadius: 2,
                          textTransform: 'none',
                        }}
                      >
                        <span>{slot.start} - {slot.end}</span>
                        <ChevronRight />
                      </Button>
                    ))}
                  </Box>

                  {selectedSlot && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Select Date for {selectedSlot.day}
                      </Typography>
                      <DatePicker
                        selected={selectedDate}
                        onChange={handleDateSelect}
                        minDate={new Date()}
                        inline
                        filterDate={(date) =>
                          date.toLocaleString('en-US', { weekday: 'long' }) === selectedSlot.day
                        }
                        dayClassName={(date) => {
                          const day = date.toLocaleString('en-US', { weekday: 'long' });
                          return day === selectedSlot.day ? 'highlight-day' : 'non-highlight-day';
                        }}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* Confirmation Dialog */}
            <Dialog
              open={showConfirmation}
              onClose={() => setShowConfirmation(false)}
              maxWidth="xs"
              fullWidth
            >
              <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  Confirm Booking
                  <IconButton onClick={() => setShowConfirmation(false)}>
                    <Close />
                  </IconButton>
                </Box>
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {facility.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CalendarToday fontSize="small" />
                      <Typography>
                        {selectedDate?.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Schedule fontSize="small" />
                      <Typography>
                        {selectedSlot?.start} - {selectedSlot?.end}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowConfirmation(false)}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={confirmBooking}
                  autoFocus
                >
                  Confirm Booking
                </Button>
              </DialogActions>
            </Dialog>
          </Container>
        </main>
      </div>

      <style>{`
        .react-datepicker {
          border: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        
        .highlight-day {
          background-color: #e3f2fd;
          font-weight: 600;
        }
        
        .react-datepicker__day--selected {
          background-color: #1976d2;
          color: white;
        }
      `}</style>
    </main>
  );
}