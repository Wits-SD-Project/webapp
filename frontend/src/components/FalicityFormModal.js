// src/components/FacilityFormModal.jsx
import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Button,
  Grid,
  Box,
  Avatar,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";

import CloudinaryUploadWidget from "./CloudinaryUploadWidget";
import { toast } from "react-toastify";
import DeleteIcon from "@mui/icons-material/DeleteForever";
import ImageIcon from "@mui/icons-material/Image";
import { SearchBox } from "@mapbox/search-js-react";

export default function FacilityFormModal({ open, onClose, onSubmit }) {
  /* ---------- form state ---------- */
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [isOutdoors, setIsOutdoors] = useState("Yes");
  const [availability, setAvail] = useState("Available");
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState({ lat: null, lng: null });
  const [images, setImages] = useState([]);

  /* ---------- Cloudinary ---------- */
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
  const rmImage = (url) => setImages((prev) => prev.filter((u) => u !== url));

  const handleUploaded = (url) => setImages((prev) => [...prev, url]);
  /* ---------- helpers ---------- */
  const handleSave = () => {
    if (!name || !type) {
      toast.error("Facility name and type are required 🤷‍♂️");
      return;
    }
    onSubmit({
      name,
      type,
      isOutdoors,
      availability,
      location,
      coordinates,
      imageUrls: images,
    });
    handleClose();
  };

  const pill = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
      "& fieldset": { borderRadius: 8, borderWidth: 2 },
    },
  };

  const resetForm = () => {
    setName("");
    setType("");
    setIsOutdoors("Yes");
    setAvail("Available");
    setLocation("");
    setImages([]);
  };

  // close-&-reset helper
  const handleClose = () => {
    resetForm();
    onClose();
  };

  /* ---------- UI ---------- */
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        🏟️ Add New Facility
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        <Grid container alignItems="center" spacing={2} sx={{ border: "none" }}>
          {/* Facility Name */}
          <Grid item xs={12}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Facility name 🏷️
              </Typography>
              <TextField
                placeholder="E.g. Wits Courts"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                variant="outlined"
                sx={pill}
              />
            </Box>
          </Grid>

          {/* Facility Type */}
          <Grid item xs={12}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Type (e.g. Tennis Court) 🏸
              </Typography>
              <TextField
                placeholder="E.g. Stadium"
                value={type}
                onChange={(e) => setType(e.target.value)}
                fullWidth
                variant="outlined"
                sx={pill}
              />
            </Box>
          </Grid>

          {/* --- outdoors / availability wrapped as its own row --- */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Select
                  value={isOutdoors}
                  onChange={(e) => setIsOutdoors(e.target.value)}
                  fullWidth
                  displayEmpty
                  sx={pill}
                >
                  <MenuItem value="Yes">🌳 Outdoors</MenuItem>
                  <MenuItem value="No">🏛️ Indoors</MenuItem>
                </Select>
              </Grid>

              <Grid item xs={6}>
                <Select
                  value={availability}
                  onChange={(e) => setAvail(e.target.value)}
                  fullWidth
                  displayEmpty
                  sx={pill}
                >
                  <MenuItem value="Available">✅ Available</MenuItem>
                  <MenuItem value="Closed">⛔ Closed</MenuItem>
                  <MenuItem value="Under Maintenance">🛠️ Maintenance</MenuItem>
                </Select>
              </Grid>
            </Grid>
          </Grid>

          {/* --- now the location search will drop down below --- */}
          <Grid item xs={12}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ width: "100%" }}>
                <SearchBox
                  accessToken="sk.eyJ1Ijoic2FjaGluc2R0ZXN0IiwiYSI6ImNtYXV2eWR0OTAxZmEyaXNkbTAwb3pvdmIifQ.EQKm2Xw8_7S6rOyjXKPicw"
                  placeholder="Search for a location 📍"
                  theme="light"
                  value={location}
                  onRetrieve={(res) => {
                    const place = res.features[0];
                    setLocation(place.properties.name);
                    setCoordinates({
                      lat: place.geometry.coordinates[1],
                      lng: place.geometry.coordinates[0],
                    });
                  }}
                />
              </Box>
            </Box>
          </Grid>

          {/* upload */}
          <Grid item xs={12}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <CloudinaryUploadWidget
                uwConfig={uwConfig}
                onUpload={(url) => handleUploaded(url)}
              />
              {images.length === 0 && (
                <Box sx={{ color: "text.secondary", fontSize: 14 }}>
                  <ImageIcon fontSize="small" sx={{ mr: 0.5 }} />
                  No images yet
                </Box>
              )}
              {images.map((url) => (
                <Tooltip key={url} title="Remove">
                  <Avatar
                    src={url}
                    variant="pill"
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      boxShadow: 1,
                      position: "relative",
                      "&:hover .del": { opacity: 1 },
                    }}
                  >
                    <IconButton
                      size="small"
                      className="del"
                      onClick={() => rmImage(url)}
                      sx={{
                        position: "absolute",
                        top: -10,
                        right: -10,
                        bgcolor: "error.main",
                        color: "#fff",
                        opacity: 0,
                        transition: "opacity .2s",
                        "&:hover": { bgcolor: "error.dark" },
                      }}
                    >
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </Avatar>
                </Tooltip>
              ))}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ pr: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          color="secondary"
          sx={{ borderRadius: 3 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{ borderRadius: 3 }}
        >
          Save ✅
        </Button>
      </DialogActions>
    </Dialog>
  );
}
