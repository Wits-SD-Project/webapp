/* ──────────────  core imports ────────────── */
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

/* ──────────────  env helpers ────────────── */
require("dotenv").config(); // optional • reads .env in local dev

/* ──────────────  app setup ────────────── */
const app = express();

/**
 * Build an allow‑list the nice way:
 *   ALLOWED_ORIGINS=http://localhost:3000,https://lively-island-05ba7a810.6.azurestaticapps.net
 */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.allowedOrigins = allowedOrigins; 


app.use(
  cors({
    origin: (origin, cb) => {
      // no Origin header ⇒ allow tools like curl / Postman
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204, // some old browsers choke on 204
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(cookieParser());

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

/* ──────────────  health routes ────────────── */
app.get("/", (_, res) => res.send("Hello World!"));
app.get("/health", (_, res) => res.status(200).json({ status: "ok" }));

/* ──────────────  feature routes ────────────── */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/facilities", require("./routes/facilities"));

/* ──────────────  start server ────────────── */
const PORT = process.env.PORT || 8080;

if (require.main === module) {
  app.listen(PORT, () =>
    console.log(`🚀  API listening on http://localhost:${PORT}`)
  );
}

module.exports = app;
