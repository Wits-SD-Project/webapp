import React, { useState, useEffect } from "react";
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const [selectedFacility, setSelectedFacility] = useState("Tennis");

  // Dummy data for per-facility peak usage chart only
  const facilityUsage = [
    { hour: "08:00", count: 4 },
    { hour: "09:00", count: 7 },
    { hour: "10:00", count: 10 },
    { hour: "11:00", count: 3 },
    { hour: "12:00", count: 6 },
  ];

  // Original data (leave untouched for backend use)
  const hourlyBookings = [
    { hour: "08:00", bookings: 5 },
    { hour: "09:00", bookings: 8 },
    { hour: "10:00", bookings: 14 },
    { hour: "11:00", bookings: 6 },
    { hour: "12:00", bookings: 9 },
  ];

  const dailyBookings = [
    { day: "Mon", bookings: 10 },
    { day: "Tue", bookings: 12 },
    { day: "Wed", bookings: 8 },
    { day: "Thu", bookings: 14 },
    { day: "Fri", bookings: 6 },
  ];

  const topFacilities = [
    { name: "Tennis", bookings: 40 },
    { name: "Soccer", bookings: 35 },
    { name: "Basketball", bookings: 28 },
    { name: "Swimming", bookings: 20 },
  ];

  const summaryStats = {
    totalBookings: 110,
    mostUsedFacility: "Tennis",
    peakHour: "10:00",
  };

  const exportChartToPDF = (title, headers, rows, fileName) => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    autoTable(doc, {
      startY: 25,
      head: [headers],
      body: rows,
    });
    doc.save(fileName);
  };

  const exportChartToCSV = (headers, rows, fileName) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
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
        {/* Summary stats */}
        <div
          style={{
            display: "flex",
            gap: "2rem",
            marginBottom: "2rem",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              title: "Total Bookings This Week",
              value: summaryStats.totalBookings,
            },
            {
              title: "Most Used Facility",
              value: summaryStats.mostUsedFacility,
            },
            { title: "Peak Hour", value: summaryStats.peakHour },
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

        {/* Peak Usage by Facility Chart - backend must replace dummy facilityUsage with real API data */}
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h3>Peak Usage Times Per Facility</h3>
          <label>
            Select Facility:
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              style={{ marginLeft: "0.5rem" }}
            >
              <option value="Tennis">Tennis</option>
              <option value="Soccer">Soccer</option>
              <option value="Basketball">Basketball</option>
              <option value="Swimming">Swimming</option>
            </select>
          </label>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={facilityUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                {/* Match fill color to existing chart for visual consistency */}
                <Bar dataKey="count" fill="#00c0df" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="export-buttons" style={{ marginTop: "1rem" }}>
            <button
              onClick={() =>
                exportChartToPDF(
                  `Peak Usage Times - ${selectedFacility}`,
                  ["Hour", "Bookings"],
                  facilityUsage.map((d) => [d.hour, d.count]),
                  `${selectedFacility}_Peak_Usage.pdf`
                )
              }
            >
              Export as PDF
            </button>
            <button
              onClick={() =>
                exportChartToCSV(
                  ["Hour", "Bookings"],
                  facilityUsage.map((d) => [d.hour, d.count]),
                  `${selectedFacility}_Peak_Usage.csv`
                )
              }
            >
              Export as CSV
            </button>
          </div>
        </div>

        {/* Peak Usage Times Chart (all facilities) - uses actual backend data */}
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h3>Peak Usage Times (All Facilities)</h3>
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
          <div className="export-buttons" style={{ marginTop: "1rem" }}>
            <button
              onClick={() =>
                exportChartToPDF(
                  "Peak Usage Times (All Facilities)",
                  ["Hour", "Bookings"],
                  hourlyBookings.map((d) => [d.hour, d.bookings]),
                  "AllFacilities_Peak_Usage.pdf"
                )
              }
            >
              Export as PDF
            </button>
            <button
              onClick={() =>
                exportChartToCSV(
                  ["Hour", "Bookings"],
                  hourlyBookings.map((d) => [d.hour, d.bookings]),
                  "AllFacilities_Peak_Usage.csv"
                )
              }
            >
              Export as CSV
            </button>
          </div>
        </div>

        {/* Bookings Per Day - uses actual backend data */}
        <div className="card">
          <h3>Bookings Per Day</h3>
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
          <div className="export-buttons" style={{ marginTop: "1rem" }}>
            <button
              onClick={() =>
                exportChartToPDF(
                  "Bookings Per Day",
                  ["Day", "Bookings"],
                  dailyBookings.map((d) => [d.day, d.bookings]),
                  "Bookings_Per_Day.pdf"
                )
              }
            >
              Export as PDF
            </button>
            <button
              onClick={() =>
                exportChartToCSV(
                  ["Day", "Bookings"],
                  dailyBookings.map((d) => [d.day, d.bookings]),
                  "Bookings_Per_Day.csv"
                )
              }
            >
              Export as CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
