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
import { getAuthToken } from "../../firebase.js";

export default function Reports() {
  const [hourlyBookings, setHourlyBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [topFacilities, setTopFacilities] = useState([]);
  const [dailyBookings, setDailyBookings] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalBookings: 0,
    mostUsedFacility: "Loading...",
    peakHour: "Loading..."
  });
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState("All");

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const token = await getAuthToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [hourlyRes, facilitiesRes, dailyRes, summaryRes] = await Promise.all([
          fetch('http://localhost:8080/api/admin/hourly-bookings', { headers }),
          fetch('http://localhost:8080/api/admin/top-facilities', { headers }),
          fetch('http://localhost:8080/api/admin/daily-bookings', { headers }),
          fetch('http://localhost:8080/api/admin/summary-stats', { headers }),
        ]);

        if (!hourlyRes.ok || !facilitiesRes.ok || !dailyRes.ok || !summaryRes.ok) {
          throw new Error('Failed to fetch report data');
        }

        const hourlyData = await hourlyRes.json();
        const facilitiesData = await facilitiesRes.json();
        const dailyData = await dailyRes.json();
        const summaryData = await summaryRes.json();

        setHourlyBookings(hourlyData.hourlyBookings);
        setTopFacilities(facilitiesData.topFacilities);
        setDailyBookings(dailyData.dailyBookings);
        setSummaryStats({
          totalBookings: summaryData.totalBookings,
          mostUsedFacility: summaryData.mostUsedFacility,
          peakHour: summaryData.peakHour,
        });
        setFilteredBookings(hourlyData.hourlyBookings);
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  // Handle facility selection from dropdown
  const handleFacilityChange = (event) => {
    const facility = event.target.value;
    setSelectedFacility(facility);
    if (facility === "All") {
      setFilteredBookings(hourlyBookings);
    } else {
      const filtered = hourlyBookings.filter(
        (entry) => entry.facility === facility
      );
      setFilteredBookings(filtered);
    }
  };

  const facilityOptions = Array.from(
    new Set(hourlyBookings.map((item) => item.facility))
  );

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
        {/* Summary Statistics */}
        <div style={{ display: "flex", gap: "2rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          {[
            { title: "Total Bookings This Week", value: summaryStats.totalBookings },
            { title: "Most Used Facility", value: summaryStats.mostUsedFacility },
            { title: "Peak Hour", value: summaryStats.peakHour },
          ].map((stat, i) => (
            <div key={i} style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              padding: "1rem 2rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              flex: "1 1 200px",
            }}>
              <h4 style={{ marginBottom: ".25rem", color: "#777" }}>{stat.title}</h4>
              <p style={{ fontSize: "1.5rem", fontWeight: 600 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Dropdown + Bar Chart */}
        <div className="card" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Peak Usage Times by Facility</h3>
            <select
              value={selectedFacility}
              onChange={handleFacilityChange}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "1rem",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            >
              <option value="All">All Facilities</option>
              {facilityOptions.map((fac, i) => (
                <option key={i} value={fac}>{fac}</option>
              ))}
            </select>
          </div>
          <p>This chart shows hourly bookings filtered by facility.</p>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={filteredBookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#00c0df" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Facility Rankings */}
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h3>Facilities</h3>
          <p>Number of times each facility was booked.</p>
          <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem" }}>
            {topFacilities.map((facility, index) => {
              const max = topFacilities[0].bookings;
              const percent = Math.round((facility.bookings / max) * 100);
              return (
                <li key={index} style={{
                  marginBottom: "0.75rem",
                  fontSize: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span>{facility.name}</span>
                  <div style={{
                    width: "60%",
                    marginLeft: "1rem",
                    background: "#e0e0e0",
                    borderRadius: "20px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${percent}%`,
                      background: "#00c0df",
                      height: "12px",
                      borderRadius: "20px",
                    }} />
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
          <p>Distribution of bookings over the past week.</p>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={dailyBookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="bookings" stroke="#00c0df" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
