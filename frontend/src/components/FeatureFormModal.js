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
  MenuItem,
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

const facilityTypes = Object.keys(facilityFeatures);

export default function FeatureFormModal({
  open,
  onClose,
  onSubmit,
  facilityType = "General",
  initialData = {},
  isEditMode = false,
}) {
  const [name, setName] = useState(initialData.name || "");
  const [type, setType] = useState(initialData.type || facilityType);
  const [isOutdoors, setIsOutdoors] = useState(
    initialData.isOutdoors === true || initialData.isOutdoors === "Yes" ? "Yes" : "No"
  );
  const [availability, setAvailability] = useState(initialData.availability || "Available");
  const [description, setDescription] = useState(initialData.description || "");
  const [features, setFeatures] = useState(initialData.features || []);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (!isEditMode) {
      setFeatures((prev) => [
        ...new Set([...prev, ...(facilityFeatures.General || [])]),
      ]);
    }
  }, [isEditMode]);

  const handleAddFeature = (newFeature) => {
    if (newFeature && !features.includes(newFeature)) {
      setFeatures([...features, newFeature]);
      setInputValue("");
    }
  };

  const handleSubmit = () => {
    if (description.trim().length < 50) {
      toast.error("Description must be at least 50 characters.");
      return;
    }
    if (!name.trim()) {
      toast.error("Facility name is required.");
      return;
    }

    const facility = {
      name,
      type,
      isOutdoors: isOutdoors === "Yes",
      availability,
      description,
      features,
    };

    onSubmit(facility);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 4, p: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>
        {isEditMode ? "Edit Facility" : "Create New Facility"}
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Facility Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              select
              label="Facility Type"
              fullWidth
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {facilityTypes.map((ftype) => (
                <MenuItem key={ftype} value={ftype}>
                  {ftype}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              select
              label="Is Outdoors?"
              fullWidth
              value={isOutdoors}
              onChange={(e) => setIsOutdoors(e.target.value)}
            >
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              select
              label="Availability"
              fullWidth
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              <MenuItem value="Available">Available</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
              <MenuItem value="Under Maintenance">Under Maintenance</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Facility Description"
              multiline
              rows={4}
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the facility (minimum 50 characters)"
            />
          </Grid>

          <Grid item xs={12}>
            <Box mb={1}>
              <Typography variant="subtitle2" mb={1}>
                Suggested Features ({type})
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {facilityFeatures[type]?.map((feature, index) => (
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddFeature(inputValue);
                    }
                  }}
                />
              )}
            />

            <Box mt={2} sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {features.map((feature, index) => (
                <Chip
                  key={index}
                  label={feature}
                  onDelete={() =>
                    setFeatures(features.filter((f) => f !== feature))
                  }
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
          disabled={description.trim().length < 50 || !name.trim()}
          sx={{ borderRadius: 2, textTransform: "none" }}
        >
          {isEditMode ? "Save Changes" : "Create Facility"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


