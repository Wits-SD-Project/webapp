import React from "react";
import Sidebar from "../../components/AdminSideBar.js";
import "../../styles/staffDashboard.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

// Dummy hourly bookings data (replace with real backend data)
const hourlyBookings = [
  { hour: "6 AM", bookings: 2 },
  { hour: "7 AM", bookings: 3 },
  { hour: "8 AM", bookings: 5 },
  { hour: "9 AM", bookings: 10 },
  { hour: "10 AM", bookings: 8 },
  { hour: "11 AM", bookings: 4 },
  { hour: "12 PM", bookings: 6 },
  { hour: "1 PM", bookings: 7 },
  { hour: "2 PM", bookings: 3 },
];

// Dummy facility popularity (replace with backend logic)
const topFacilities = [
  { name: "Tennis Court", bookings: 40 },
  { name: "Soccer Field", bookings: 30 },
  { name: "Basketball Court", bookings: 20 },
  { name: "Swimming Pool", bookings: 10 },
];

// Dummy daily booking stats
const dailyBookings = [
  { day: "Mon", bookings: 12 },
  { day: "Tue", bookings: 9 },
  { day: "Wed", bookings: 15 },
  { day: "Thu", bookings: 8 },
  { day: "Fri", bookings: 11 },
  { day: "Sat", bookings: 18 },
  { day: "Sun", bookings: 5 },
];

export default function Reports() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar activeItem="reports" />
      <div
        style={{
          flex: 1,
          padding: "2rem",
          overflowY: "auto",
          backgroundColor: "#f9f9f9",
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        {/* Summary stats - replace these with backend data later */}
        <div
          style={{
            display: "flex",
            gap: "2rem",
            marginBottom: "2rem",
            flexWrap: "wrap",
          }}
        >
          {[
            { title: "Total Bookings This Week", value: 78 },
            { title: "Most Used Facility", value: "Tennis Court" },
            { title: "Peak Hour", value: "9 AM" },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#fff",
                borderRadius: "12px",
                padding: "1rem 2rem",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                flex: "1 1 200px",
              }}
            >
              <h4 style={{ marginBottom: ".25rem", color: "#777" }}>
                {stat.title}
              </h4>
              <p style={{ fontSize: "1.5rem", fontWeight: 600 }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Peak Usage Times Chart */}
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h3>Peak Usage Times</h3>
          <p>This chart shows the number of bookings per hour.</p>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={hourlyBookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#00c0df" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Booked Facilities */}
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h3>Top Booked Facilities</h3>
          <p>These are the most booked facilities based on current data.</p>
          <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem" }}>
            {topFacilities.map((facility, index) => (
              <li
                key={index}
                style={{
                  marginBottom: "0.75rem",
                  fontSize: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{facility.name}</span>
                <div
                  style={{
                    width: "60%",
                    marginLeft: "1rem",
                    background: "#e0e0e0",
                    borderRadius: "20px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${facility.bookings}%`,
                      background: "#00c0df",
                      height: "12px",
                      borderRadius: "20px",
                    }}
                  />
                </div>
                <span style={{ marginLeft: "1rem", minWidth: "30px" }}>
                  {facility.bookings}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bookings Per Day */}
        <div className="card">
          <h3>Bookings Per Day</h3>
          <p>View the daily booking distribution over the past week.</p>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={dailyBookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="#00c0df"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
