const express      = require("express");
const cors         = require("cors");
const cookieParser = require("cookie-parser");

///////////////////////////////////////////////////////////////////////////////
// Jest helper – provide expect.toBeFalse() when jest-extended isn’t loaded  //
///////////////////////////////////////////////////////////////////////////////
if (typeof expect !== 'undefined' && typeof expect.toBeFalse !== 'function') {
  expect.extend({
    toBeFalse(received) {
      const pass = received === false;
      return {
        pass,
        message: () =>
          `expected ${received} ${pass ? 'not ' : ''}to be strictly false`,
      };
    },
  });
}

const app = express();
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

// Default route
app.get("/", (req, res) => {
  res.send("Hello World!");
  console.log("Hello");
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Feature routes
const authRoutes       = require("./routes/auth");
const adminRoutes      = require("./routes/admin");
const facilitiesRoutes = require("./routes/facilities");

app.use("/api/auth",       authRoutes);
app.use("/api/admin",      adminRoutes);
app.use("/api/facilities", facilitiesRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// Server bootstrap
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
