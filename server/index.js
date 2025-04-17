const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const facilitiesRoutes = require("./routes/facilities");

app.use("/api/auth", authRoutes);
app.use("/api/admin",adminRoutes);
app.use("/api/facilities",facilitiesRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
