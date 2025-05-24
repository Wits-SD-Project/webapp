
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

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports() {
  const [hourlyBookings, setHourlyBookings] = useState([]);
  const [topFacilities, setTopFacilities] = useState([]);
  const [dailyBookings, setDailyBookings] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalBookings: 0,
    mostUsedFacility: "Loading...",
    peakHour: "Loading...",
  });
  const [loading, setLoading] = useState(true);

  /**
 * Export Peak Usage Times data as CSV
 */
  const handleExportPeakUsageCSV = () => {
    const headers = ["Hour", "Bookings", "Facility Filter"];
    const csvRows = [
      headers.join(","),
      ...filteredHourlyBookings.map((item) => [
        `"${item.hour}"`,
        `"${item.bookings}"`,
        `"${selectedFacility}"`
      ].join(","))
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Peak_Usage_Times_${selectedFacility}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
 * Export Peak Usage Times data as PDF
 */
  const handleExportPeakUsagePDF = () => {
    const doc = new jsPDF();
    doc.text(`Peak Usage Times Report - ${selectedFacility}`, 14, 15);
    
    autoTable(doc, {
      startY: 25,
      head: [["Hour", "Bookings"]],
      body: filteredHourlyBookings.map((item) => [
        item.hour,
        item.bookings.toString()
      ]),
    });

    doc.save(`Peak_Usage_Times_${selectedFacility}.pdf`);
  };

  /**
   * Export Facilities data as CSV
   */
  const handleExportFacilitiesCSV = () => {
    const headers = ["Facility Name", "Total Bookings", "Percentage"];
    const maxBookings = topFacilities[0]?.bookings || 1;
    
    const csvRows = [
      headers.join(","),
      ...topFacilities.map((facility) => {
        const percentage = Math.round((facility.bookings / maxBookings) * 100);
        return [
          `"${facility.name}"`,
          `"${facility.bookings}"`,
          `"${percentage}%"`
        ].join(",");
      })
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Facilities_Bookings_Report.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Export Facilities data as PDF
   */
  const handleExportFacilitiesPDF = () => {
    const doc = new jsPDF();
    doc.text("Facilities Bookings Report", 14, 15);
    
    const maxBookings = topFacilities[0]?.bookings || 1;
    
    autoTable(doc, {
      startY: 25,
      head: [["Facility Name", "Total Bookings", "Percentage"]],
      body: topFacilities.map((facility) => {
        const percentage = Math.round((facility.bookings / maxBookings) * 100);
        return [
          facility.name,
          facility.bookings.toString(),
          `${percentage}%`
        ];
      }),
    });

    doc.save("Facilities_Bookings_Report.pdf");
  };

  // 1. ADD NEW STATE for selected facility (add this after existing useState declarations)
  const [selectedFacility, setSelectedFacility] = useState("All");

  // 2. ADD FILTERING LOGIC (add this before the return statement)
  const filteredHourlyBookings = selectedFacility === "All" 
  ? hourlyBookings 
  : hourlyBookings.filter(booking => booking.facility === selectedFacility);


  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const token = await getAuthToken();
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        // Fetch all data in parallel
        const [hourlyRes, facilitiesRes, dailyRes, summaryRes] =
          await Promise.all([
            fetch(
              `${process.env.REACT_APP_API_BASE_URL}/api/admin/hourly-bookings`,
              { headers }
            ),
            fetch(
              `${process.env.REACT_APP_API_BASE_URL}/api/admin/top-facilities`,
              { headers }
            ),
            fetch(
              `${process.env.REACT_APP_API_BASE_URL}/api/admin/daily-bookings`,
              { headers }
            ),
            fetch(
              `${process.env.REACT_APP_API_BASE_URL}/api/admin/summary-stats`,
              { headers }
            ),
          ]);

        if (
          !hourlyRes.ok ||
          !facilitiesRes.ok ||
          !dailyRes.ok ||
          !summaryRes.ok
        ) {
          throw new Error("Failed to fetch report data");
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
      } catch (error) {
        console.error("Error fetching report data:", error);
        // You might want to set some error state here
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
        <Sidebar activeItem="reports" />
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      <Sidebar activeItem="dashboard" />
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

        
        {/* Peak Usage Times Chart */}
        <div className="card" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3>Peak Usage Times</h3>
              <p>This chart shows the number of bookings per hour.</p>
            </div>
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                border: "1px solid #ddd",
                backgroundColor: "#fff",
                fontSize: "0.9rem",
                minWidth: "200px"
              }}
            >
              <option value="All">All Facilities</option>
              {topFacilities.map((facility, index) => (
                <option key={index} value={facility.name}>
                  {facility.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={filteredHourlyBookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#00c0df" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* ADD EXPORT BUTTONS */}
          <div className="export-buttons" style={{ 
            display: "flex", 
            gap: "0.5rem", 
            justifyContent: "flex-end",
            marginTop: "1rem"
          }}>
            <button 
              onClick={handleExportPeakUsagePDF}
              style={{
                backgroundColor: "transparent",
                border: "1px solid #00c0df",
                color: "#00c0df",
                padding: "0.5rem 1rem",
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                transition: "background-color 0.3s ease, color 0.3s ease"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#00c0df";
                e.target.style.color = "#fff";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#00c0df";
              }}
            >
              Export as PDF
            </button>
            <button 
              onClick={handleExportPeakUsageCSV}
              style={{
                backgroundColor: "transparent",
                border: "1px solid #00c0df",
                color: "#00c0df",
                padding: "0.5rem 1rem",
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                transition: "background-color 0.3s ease, color 0.3s ease"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#00c0df";
                e.target.style.color = "#fff";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#00c0df";
              }}
            >
              Export as CSV
            </button>
          </div>
        </div>

        
        {/* Top Booked Facilities */}
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h3>Facilities</h3>
          <p>Number of times facilities were booked.</p>
          <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem" }}>
            {topFacilities.map((facility, index) => {
              // Calculate percentage relative to the most booked facility
              const maxBookings = topFacilities[0].bookings;
              const percentage = Math.round(
                (facility.bookings / maxBookings) * 100
              );

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
          {/* ADD EXPORT BUTTONS */}
          <div className="export-buttons" style={{ 
            display: "flex", 
            gap: "0.5rem", 
            justifyContent: "flex-end",
            marginTop: "1rem"
          }}>
            <button 
              onClick={handleExportFacilitiesPDF}
              style={{
                backgroundColor: "transparent",
                border: "1px solid #00c0df",
                color: "#00c0df",
                padding: "0.5rem 1rem",
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                transition: "background-color 0.3s ease, color 0.3s ease"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#00c0df";
                e.target.style.color = "#fff";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#00c0df";
              }}
            >
              Export as PDF
            </button>
            <button 
              onClick={handleExportFacilitiesCSV}
              style={{
                backgroundColor: "transparent",
                border: "1px solid #00c0df",
                color: "#00c0df",
                padding: "0.5rem 1rem",
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
                transition: "background-color 0.3s ease, color 0.3s ease"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#00c0df";
                e.target.style.color = "#fff";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#00c0df";
              }}
            >
              Export as CSV
            </button>
          </div>
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
