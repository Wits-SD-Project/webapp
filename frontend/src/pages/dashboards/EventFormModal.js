// components/EventFormModal.jsx
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

  // Initialize form with eventData when modal opens or data changes
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
      // Set default values for new event
      const now = new Date();
      const defaultEnd = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later
      
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

  // Style constants to match FacilityFormModal
  const dialogStyle = {
    PaperProps: { 
      sx: { 
        borderRadius: 4, 
        p: 1,
        minWidth: 600 
      } 
    }
  };

  const inputStyle = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      "& fieldset": { borderRadius: 2, borderWidth: 2 }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={dialogStyle.PaperProps}
    >
      <DialogTitle sx={{ fontWeight: 600, p: 3 }}>
        {eventData ? "✏️ Edit Event" : "➕ Create New Event"}
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Grid container spacing={3}>
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
              sx={inputStyle}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth sx={inputStyle}>
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

          <Grid item xs={6}>
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
              sx={inputStyle}
              required
            />
          </Grid>

          <Grid item xs={6}>
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
              sx={inputStyle}
              required
            />
          </Grid>

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
              sx={inputStyle}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Event Poster
            </Typography>
            <CloudinaryUploadWidget 
              uwConfig={uwConfig}
              onUpload={handleUpload}
              buttonText="Upload Poster Image"
            />
            {formState.posterImage && (
              <Box mt={2} display="flex" alignItems="center">
                <Avatar
                  src={formState.posterImage}
                  variant="rounded"
                  sx={{ 
                    width: 100, 
                    height: 100, 
                    mr: 2,
                    borderRadius: 2,
                    boxShadow: 1
                  }}
                />
                <IconButton 
                  onClick={handleRemoveImage}
                  sx={{
                    bgcolor: 'error.main',
                    color: '#fff',
                    '&:hover': { bgcolor: 'error.dark' }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={onClose} 
          color="secondary"
          sx={{ borderRadius: 3 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          sx={{ borderRadius: 3 }}
        >
          {eventData ? "Save Changes" : "Create Event"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}