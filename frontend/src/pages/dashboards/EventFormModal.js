import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Box,
  Avatar,
  IconButton,
  InputLabel,
  FormControl,
  Select,
  MenuItem,
  Typography
} from "@mui/material";
import CloudinaryUploadWidget from "./CloudinaryUploadWidget";
import { toast } from "react-toastify";
import DeleteIcon from "@mui/icons-material/DeleteForever";
import "../../styles/eventFormModal.css";

export default function EventFormModal({ 
  open, 
  onClose, 
  onSubmit, 
  facilities,
  eventData 
}) {
  const [formState, setFormState] = useState({
    eventName: "",
    facility: "",
    startTime: "",
    endTime: "",
    description: "",
    posterImage: ""
  });

  const cloudName = "ducyxqzb9";
  const uploadPreset = "aoh4fpwm";
  const uwConfig = {
    cloudName,
    uploadPreset,
    multiple: true,
    sources: ["local", "camera"],
    maxFiles: 6,
    folder: "facility_images",
  };

  const formatForDateTimeLocal = (date) => {
    if (!date) return "";
    const pad = (num) => num.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  useEffect(() => {
    if (eventData) {
      setFormState({
        eventName: eventData.eventName || "",
        facility: eventData.facility?.id || "",
        startTime: formatForDateTimeLocal(eventData.startTime),
        endTime: formatForDateTimeLocal(eventData.endTime),
        description: eventData.description || "",
        posterImage: eventData.posterImage || ""
      });
    } else {
      const now = new Date();
      const defaultEnd = new Date(now.getTime() + 60 * 60 * 1000);
      
      setFormState({
        eventName: "",
        facility: facilities.length > 0 ? facilities[0].id : "",
        startTime: formatForDateTimeLocal(now),
        endTime: formatForDateTimeLocal(defaultEnd),
        description: "",
        posterImage: ""
      });
    }
  }, [eventData, open, facilities]);

  const handleUpload = (url) => {
    setFormState(prev => ({ ...prev, posterImage: url }));
  };

  const handleRemoveImage = () => {
    setFormState(prev => ({ ...prev, posterImage: "" }));
  };

  const handleSubmit = () => {
    const { eventName, facility, startTime, endTime } = formState;
    
    if (!eventName || !facility || !startTime || !endTime) {
      toast.error("Please fill all required fields");
      return;
    }
    
    if (new Date(startTime) >= new Date(endTime)) {
      toast.error("End time must be after start time");
      return;
    }
    
    const selectedFacility = facilities.find(f => f.id === facility);
    if (!selectedFacility) {
      toast.error("Selected facility not found");
      return;
    }

    onSubmit({
      ...formState,
      facility: selectedFacility,
      startTime: new Date(startTime),
      endTime: new Date(endTime)
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: "16px" } }}
    >
      <DialogTitle className="event-form-title">
        {eventData ? "✏️ Edit Event" : "➕ Create New Event"}
      </DialogTitle>

      <DialogContent dividers className="event-form-content">
        <Grid container spacing={3} className="event-form-grid">
          {/* Event Name */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Event Name"
              value={formState.eventName}
              onChange={(e) => setFormState(prev => ({ 
                ...prev, 
                eventName: e.target.value 
              }))}
              variant="outlined"
              className="event-form-field"
              required
            />
          </Grid>

          {/* Facility Selection */}
          <Grid item xs={12}>
            <FormControl fullWidth className="event-form-field">
              <InputLabel>Facility *</InputLabel>
              <Select
                value={formState.facility}
                onChange={(e) => setFormState(prev => ({ 
                  ...prev, 
                  facility: e.target.value 
                }))}
                label="Facility"
                required
              >
                {facilities.map(facility => (
                  <MenuItem key={facility.id} value={facility.id}>
                    {facility.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Date & Time */}
          <Grid item xs={12} container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Start Time *"
                type="datetime-local"
                value={formState.startTime}
                onChange={(e) => setFormState(prev => ({ 
                  ...prev, 
                  startTime: e.target.value 
                }))}
                InputLabelProps={{ shrink: true }}
                className="event-form-field"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="End Time *"
                type="datetime-local"
                value={formState.endTime}
                onChange={(e) => setFormState(prev => ({ 
                  ...prev, 
                  endTime: e.target.value 
                }))}
                InputLabelProps={{ shrink: true }}
                className="event-form-field"
                required
              />
            </Grid>
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={formState.description}
              onChange={(e) => setFormState(prev => ({ 
                ...prev, 
                description: e.target.value 
              }))}
              className="event-form-field"
            />
          </Grid>

          {/* Poster Image */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" className="event-form-section-title">
              Event Poster
            </Typography>
            <CloudinaryUploadWidget 
              uwConfig={uwConfig}
              onUpload={handleUpload}
              buttonText="Upload Poster Image"
            />
            {formState.posterImage && (
              <Box className="event-form-image-container">
                <Avatar
                  src={formState.posterImage}
                  variant="rounded"
                  className="event-form-image-preview"
                />
                <IconButton 
                  onClick={handleRemoveImage}
                  className="event-form-delete-btn"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions className="event-form-actions">
        <Button 
          onClick={onClose} 
          color="secondary"
          className="event-form-cancel-btn"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          className="event-form-submit-btn"
        >
          {eventData ? "Save Changes" : "Create Event"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}