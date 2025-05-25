// Import necessary React hooks, components, and libraries
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/AdminSideBar.js";
import "../../styles/staffDashboard.css";
import "../../styles/adminDashboard.css";
import { auth } from "../../firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

// Register ChartJS components for creating charts
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

// Main AdminDashboard component
export default function AdminDashboard() {
  // Navigation hook for routing
  const navigate = useNavigate();

  // Set fixed username display
  const username = "Admin";

  // State for storing maintenance summary data
  const [maintenanceSummary, setMaintenanceSummary] = useState({
    openCount: 0,
    closedCount: 0,
  });

  const [topFacilities, setTopFacilities] = useState([]);

  /**
   * Function to export maintenance reports as CSV
   */
  const handleExportMaintenanceCSV = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/admin/maintenance-reports`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch reports");

      function formatDate(timestamp) {
        try {
          // Handle both Firestore Timestamp objects and ISO strings
          const date = timestamp?.toDate
            ? timestamp.toDate()
            : new Date(timestamp);

          if (isNaN(date.getTime())) return "-";

          return date.toLocaleString("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch {
          return "-";
        }
      }

      const headers = ["Facility", "Description", "Status", "Created At"];
      const csvRows = [
        headers.join(","),
        ...data.reports.map((report) =>
          [
            `"${(report.facilityName || "Unknown").replace(/"/g, '""')}"`,
            `"${(report.description || "-").replace(/"/g, '""')}"`,
            `"${(report.status || "-").replace(/"/g, '""')}"`,
            `"${formatDate(report.createdAt)}"`,
          ].join(",")
        ),
      ];

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "Maintenance_Report.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("CSV export error:", error.message);
    }
  };

  /**
   * Function to export maintenance reports as PDF
   */
  const handleExportMaintenancePDF = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/admin/maintenance-reports`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch reports");

      const doc = new jsPDF();
      doc.text("Maintenance Report", 14, 15);

      function formatDate(timestamp) {
        try {
          // Handle both Firestore Timestamp objects and ISO strings
          const date = timestamp?.toDate
            ? timestamp.toDate()
            : new Date(timestamp);

          if (isNaN(date.getTime())) return "-";

          return date.toLocaleString("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch {
          return "-";
        }
      }

      autoTable(doc, {
        startY: 25,
        head: [["Facility", "Description", "Status", "Created At"]],
        body: data.reports.map((report) => [
          report.facilityName || "Unknown",
          report.description || "-",
          report.status || "-",
          formatDate(report.createdAt),
        ]),
      });

      doc.save("Maintenance_Report.pdf");
    } catch (error) {
      console.error("PDF export error:", error.message);
    }
  };

  useEffect(() => {
    const fetchMaintenanceSummary = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/admin/maintenance-summary`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to fetch summary");

        setMaintenanceSummary({
          openCount: data.openCount,
          closedCount: data.closedCount,
        });
      } catch (err) {
        console.error("Maintenance summary error:", err.message);
      }
    };

    fetchMaintenanceSummary();

    const fetchTopFacilities = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/api/admin/top-4-facilities`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();
        if (!res.ok)
          throw new Error(data.message || "Failed to fetch top facilities");

        setTopFacilities(data.top4Facilities);
      } catch (err) {
        console.error("Top facilities error:", err.message);
      }
    };

    // Call this function
    fetchTopFacilities();
  }, []);

  const barData = {
    labels: topFacilities.map((facility) => facility.name),
    datasets: [
      {
        label: "Bookings",
        data: topFacilities.map((facility) => facility.bookings),
        backgroundColor: "#00c0df",
      },
    ],
  };

  const chartData = {
    labels: ["Open Issues", "Closed Issues"],
    datasets: [
      {
        label: "Maintenance Issues",
        data: [maintenanceSummary.openCount, maintenanceSummary.closedCount],
        backgroundColor: ["#ff6384", "#36a2eb"],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };

  return (
    <main className="dashboard">
      <div className="container">
        <Sidebar activeItem="dashboard" />
        <main className="main-content">
          <header className="page-header">
            <h1>Dashboard</h1>
            <div className="user-name">{username}</div>
          </header>

          <div className="card-container">
            <div className="card">
              <h3>Upcoming Events</h3>
              <p>These are the upcoming events for the facility.</p>
              <button
                className="view-all-btn"
                onClick={() => navigate("/admin-manage-events")}
              >
                View all
              </button>
            </div>

            <div className="card">
              <h3>Pending Applications</h3>
              <p>These are the admin requests awaiting your approval.</p>
              <button
                className="view-all-btn"
                onClick={() => navigate("/admin-manage-users")}
              >
                View all
              </button>
            </div>
          </div>

          <div className="graph-container">
            <div
              className="graph-card clickable"
              onClick={() => navigate("/admin/reports")}
            >
              <h3>Usage Trends of Top 4 Facilities</h3>
              <div
                className="graph-placeholder"
                style={{ backgroundColor: "#fff", padding: 0 }}
              >
                <Bar
                  data={barData}
                  height={200}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
              <div className="export-buttons">
                {" "}
                <button>View full reports</button>{" "}
              </div>
            </div>

            <div className="graph-card">
              <h3>Maintenance Reports (Open vs. Closed Issues)</h3>
              <div className="graph-placeholder">
                <Doughnut data={chartData} options={chartOptions} />
              </div>
              <p>Open Issues: {maintenanceSummary.openCount}</p>
              <p>Closed Issues: {maintenanceSummary.closedCount}</p>
              <div className="export-buttons">
                <button onClick={handleExportMaintenancePDF}>
                  Export as PDF
                </button>
                <button onClick={handleExportMaintenanceCSV}>
                  Export as CSV
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}
