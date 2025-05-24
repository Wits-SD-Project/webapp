// Import necessary React hooks, components, and libraries
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/AdminSideBar.js";
import "../../styles/staffDashboard.css";
import "../../styles/adminDashboard.css";
import { useAuth } from "../../context/AuthContext.js";
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
  
  // Authentication context to get current user
  const { authUser } = useAuth();
  const username = authUser?.name || "Admin";
  
  // State for storing maintenance summary data
  const [maintenanceSummary, setMaintenanceSummary] = useState({
    openCount: 0,
    closedCount: 0,
  });

   /**
   * Function to export maintenance reports as CSV
   * 1. Gets current authenticated user
   * 2. Fetches maintenance reports from backend API
   * 3. Creates CSV document with formatted data
   * 4. Downloads the CSV
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
          if (!timestamp || typeof timestamp._seconds !== "number") return "-";
          const date = new Date(timestamp._seconds * 1000);
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
  
      // Create CSV content
      const headers = ["Facility", "Description", "Status", "Created At"];
      const csvRows = [
        headers.join(","), // Header row
        ...data.reports.map((report) => [
          `"${(report.facilityName || "Unknown").replace(/"/g, '""')}"`,
          `"${(report.description || "-").replace(/"/g, '""')}"`,
          `"${(report.status || "-").replace(/"/g, '""')}"`,
          `"${formatDate(report.createdAt)}"`,
        ].join(","))
      ];
  
      const csvContent = csvRows.join("\n");
  
      // Create and download the file
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
   * 1. Gets current authenticated user
   * 2. Fetches maintenance reports from backend API
   * 3. Creates PDF document with formatted data
   * 4. Downloads the PDF
   */
  const handleExportMaintenancePDF = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Get authentication token
      const token = await user.getIdToken();
      
      // Fetch maintenance reports from API
      const res = await fetch("http://localhost:8080/api/admin/maintenance-reports", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch reports");

      // Create new PDF document
      const doc = new jsPDF();
      doc.text("Maintenance Report", 14, 15);

      // Helper function to format timestamps
      function formatDate(timestamp) {
        try {
          if (!timestamp || typeof timestamp._seconds !== "number") return "-";
          const date = new Date(timestamp._seconds * 1000);
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

      // Add table to PDF using autoTable plugin
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

      // Save PDF file
      doc.save("Maintenance_Report.pdf");
    } catch (error) {
      console.error("PDF export error:", error.message);
    }
  };

  /**
   * useEffect hook to fetch maintenance summary data on component mount
   * 1. Gets current authenticated user
   * 2. Fetches summary data from backend API
   * 3. Updates state with the received data
   */
  useEffect(() => {
    const fetchMaintenanceSummary = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.warn("No user logged in.");
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch("http://localhost:8080/api/admin/maintenance-summary", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

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
  }, []);

  // Data for facility usage bar chart
  const barData = {
    labels: ["Tennis", "Soccer", "Basketball", "Swimming"],
    datasets: [
      {
        label: "Bookings",
        data: [25, 40, 20, 15],
        backgroundColor: "#00c0df",
      },
    ],
  };

  // Data for maintenance doughnut chart (using state data)
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

  // Chart configuration options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };

  // Main component render
  return (
    <main className="dashboard">
      <div className="container">
        {/* Admin sidebar component */}
        <Sidebar activeItem="dashboard" />

        {/* Main content area */}
        <main className="main-content">
          {/* Page header with title and username */}
          <header className="page-header">
            <h1>Dashboard</h1>
            <div className="user-name">{username}</div>
          </header>

          {/* Card container for quick stats */}
          <div className="card-container">
            {/* Upcoming events card */}
            <div className="card">
              <h3>Upcoming events</h3>
              <p>You have ?? upcoming events</p>
              <button
                className="view-all-btn"
                onClick={() => navigate("/admin-manage-events")}
              >
                View all
              </button>
            </div>

            {/* Pending applications card */}
            <div className="card">
              <h3>Pending Applications</h3>
              <p>?? users requests awaiting your approval</p>
              <button
                className="view-all-btn"
                onClick={() => navigate("/admin-manage-users")}
              >
                View all
              </button>
            </div>
          </div>

          {/* Graph container for data visualization */}
          <div className="graph-container">
            {/* Usage trends preview (clickable to view full reports) */}
            <div className="graph-card clickable" onClick={() => navigate("/admin/reports")}>
              <h3>Usage Trends by Facility</h3>
              <div className="graph-placeholder" style={{ backgroundColor: "#fff", padding: 0 }}>
                <Bar data={barData} height={200} options={{ responsive: true, plugins: { legend: { display: false } } }} />
              </div>
              <p style={{ textAlign: "center", color: "#00c0df", marginTop: "0.5rem" }}>
                Click to view full reports
              </p>
            </div>

            {/* Maintenance status chart with export options */}
            <div className="graph-card">
              <h3>Maintenance Reports (Open vs. Closed Issues)</h3>
              <div className="graph-placeholder">
                <Doughnut data={chartData} options={chartOptions} />
              </div>
              <p>Open Issues: {maintenanceSummary.openCount}</p>
              <p>Closed Issues: {maintenanceSummary.closedCount}</p>
              <div className="export-buttons">
                <button onClick={handleExportMaintenancePDF}>Export as PDF</button>
                <button onClick={handleExportMaintenanceCSV}>Export as CSV</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}
