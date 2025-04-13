const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
app.use("/api/auth", authRoutes);
app.use("/api/admin",adminRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
