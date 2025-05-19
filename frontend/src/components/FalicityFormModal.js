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
} from "@mui/material";
import CloudinaryUploadWidget from "./CloudinaryUploadWidget";
import { toast } from "react-toastify";
import DeleteIcon from "@mui/icons-material/DeleteForever";
import ImageIcon from "@mui/icons-material/Image";

export default function FacilityFormModal({ open, onClose, onSubmit }) {
  /* ---------- form state ---------- */
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [isOutdoors, setIsOutdoors] = useState("Yes");
  const [availability, setAvail] = useState("Available");
  const [location, setLocation] = useState("");
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

      <DialogContent dividers sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ border: "none" }}>
          {/* name */}
          <Grid item xs={12} sx={{ border: "none" }}>
            <TextField
              label="Facility name 🏷️"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              variant="outlined"
              sx={pill}
            />
          </Grid>

          {/* type */}
          <Grid item xs={12}>
            <TextField
              label="Type (e.g. Tennis Court) 🏸"
              variant="outlined"
              value={type}
              onChange={(e) => setType(e.target.value)}
              fullWidth
              sx={pill}
            />
          </Grid>

          {/* outdoors / availability */}
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

          {/* location */}
          <Grid item xs={12}>
            <TextField
              label="Location 📍"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              fullWidth
              sx={pill}
            />
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
