const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');

const app = express();
app.use(cors());
app.use(express.json());

// Default route that says Hello World
app.get("/", (req, res) => {
  res.send("Hello World!");
  console.log("Hello");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
app.use(cookieParser());

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const facilitiesRoutes = require("./routes/facilities");

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/facilities",facilitiesRoutes);

// Use environment PORT variable for Azure compatibility
const PORT = process.env.PORT || 5000;


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
