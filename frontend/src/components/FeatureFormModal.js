import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Button,
  Grid,
  Box,
  Typography,
  Autocomplete,
} from "@mui/material";
import { toast } from "react-toastify";

const facilityFeatures = {
  "Tennis Court": ["Net", "Court Surface", "Lighting", "Seating", "Fence"],
  "Swimming Pool": ["Lanes", "Diving Board", "Heated", "Changing Rooms", "Shallow End"],
  "Basketball Court": ["Hoops", "Backboard", "Three-point Line", "Bench Area"],
  "Gym": ["Cardio Machines", "Free Weights", "Resistance Machines", "Locker Rooms"],
  "Soccer Field": ["Goals", "Turf", "Line Markings", "Benches", "Scoreboard"],
  "General": ["Parking", "Accessible Entrance", "Drinking Water", "Restrooms"]
};

export default function FeatureFormModal({ 
  open, 
  onClose, 
  onSubmit, 
  facilityType,
  initialData = {},
  isEditMode = false
}) {
  const [description, setDescription] = useState(initialData.description || "");
  const [features, setFeatures] = useState(initialData.features || []);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (isEditMode) return;
    setFeatures(prev => [
      ...new Set([...prev, ...(facilityFeatures.General || [])])
    ]);
  }, [isEditMode]);

  const handleAddFeature = (newFeature) => {
    if (newFeature && !features.includes(newFeature)) {
      setFeatures([...features, newFeature]);
      setInputValue("");
    }
  };

  const handleSubmit = () => {
    if (!description) {
      toast.error("Please add a description.");
      return;
    }
    onSubmit({ description, features });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>
        {isEditMode ? "Edit Facility Features" : `Add Features for ${facilityType}`}
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Facility Description"
              multiline
              rows={4}
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              variant="outlined"
              placeholder="Describe the facility (minimum 50 characters)"
            />
          </Grid>

          <Grid item xs={12}>
            <Box mb={2}>
              <Typography variant="subtitle2" mb={1}>
                Suggested Features ({facilityType})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {facilityFeatures[facilityType]?.map((feature, index) => (
                  <Chip
                    key={index}
                    label={feature}
                    onClick={() => handleAddFeature(feature)}
                    color={features.includes(feature) ? "primary" : "default"}
                  />
                ))}
              </Box>
            </Box>

            <Autocomplete
              freeSolo
              options={[]}
              value={inputValue}
              onChange={(_, newValue) => handleAddFeature(newValue)}
              inputValue={inputValue}
              onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Add custom feature"
                  variant="outlined"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddFeature(inputValue);
                    }
                  }}
                />
              )}
            />
            
            <Box mt={2} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {features.map((feature, index) => (
                <Chip
                  key={index}
                  label={feature}
                  onDelete={() => setFeatures(features.filter((f) => f !== feature))}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
          sx={{ borderRadius: 2, textTransform: "none" }}
        >
          Cancel
        </Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleSubmit}
          disabled={description.length < 50}
          sx={{ borderRadius: 2, textTransform: "none" }}
        >
          {isEditMode ? "Save Changes" : "Save Facility"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

