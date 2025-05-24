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
} from "recharts"; // Recharts components for data visualization
import { getAuthToken } from "../../firebase.js"; // Firebase authentication helper

export default function Reports() {
  // State for storing various report data
  const [hourlyBookings, setHourlyBookings] = useState([]); // Hourly booking counts
  const [topFacilities, setTopFacilities] = useState([]); // Top booked facilities
  const [dailyBookings, setDailyBookings] = useState([]); // Daily booking trends
  const [summaryStats, setSummaryStats] = useState({ // Summary statistics
    totalBookings: 0,
    mostUsedFacility: "Loading...",
    peakHour: "Loading..."
  });
  const [loading, setLoading] = useState(true); // Loading state

  // Fetch report data when component mounts
  useEffect(() => {
    const fetchReportData = async () => {
      try {
        // Get authentication token
        const token = await getAuthToken();
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        // Fetch all data endpoints in parallel for better performance
        const [hourlyRes, facilitiesRes, dailyRes, summaryRes] = await Promise.all([
          fetch('http://localhost:8080/api/admin/hourly-bookings', { headers }),
          fetch('http://localhost:8080/api/admin/top-facilities', { headers }),
          fetch('http://localhost:8080/api/admin/daily-bookings', { headers }),
          fetch('http://localhost:8080/api/admin/summary-stats', { headers })
        ]);

        // Check if all responses were successful
        if (!hourlyRes.ok || !facilitiesRes.ok || !dailyRes.ok || !summaryRes.ok) {
          throw new Error('Failed to fetch report data');
        }

        // Parse all JSON responses
        const hourlyData = await hourlyRes.json();
        const facilitiesData = await facilitiesRes.json();
        const dailyData = await dailyRes.json();
        const summaryData = await summaryRes.json();

        // Update state with fetched data
        setHourlyBookings(hourlyData.hourlyBookings);
        setTopFacilities(facilitiesData.topFacilities);
        setDailyBookings(dailyData.dailyBookings);
        setSummaryStats({
          totalBookings: summaryData.totalBookings,
          mostUsedFacility: summaryData.mostUsedFacility,
          peakHour: summaryData.peakHour
        });
      } catch (error) {
        console.error('Error fetching report data:', error);
        // Consider adding error state handling here
      } finally {
        setLoading(false); // Ensure loading state is updated
      }
    };

    fetchReportData();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Loading state UI
  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
        <Sidebar activeItem="reports" />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  // Main component render
  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      {/* Sidebar navigation */}
      <Sidebar activeItem="reports" />
      
      {/* Main content area */}
      <div
        style={{
          flex: 1,
          padding: "2rem",
          overflowY: "auto",
          backgroundColor: "#f9f9f9",
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        {/* Summary statistics cards */}
        <div
          style={{
            display: "flex",
            gap: "2rem",
            marginBottom: "2rem",
            flexWrap: "wrap",
          }}
        >
          {[
            { title: "Total Bookings This Week", value: summaryStats.totalBookings },
            { title: "Most Used Facility", value: summaryStats.mostUsedFacility },
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

        {/* Peak Usage Times Bar Chart */}
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

        {/* Top Booked Facilities List with Percentage Bars */}
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h3>Facilities</h3>
          <p>Number of times facilities were booked.</p>
          <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem" }}>
            {topFacilities.map((facility, index) => {
              // Calculate percentage relative to the most booked facility
              const maxBookings = topFacilities[0].bookings;
              const percentage = Math.round((facility.bookings / maxBookings) * 100);
              
              return (
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
                        width: `${percentage}%`,
                        background: "#00c0df",
                        height: "12px",
                        borderRadius: "20px",
                      }}
                    />
                  </div>
                  <span style={{ marginLeft: "1rem", minWidth: "30px" }}>
                    {facility.bookings}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Daily Bookings Line Chart */}
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
