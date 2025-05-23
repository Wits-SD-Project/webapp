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

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const username = authUser?.name || "Admin";
  const [maintenanceSummary, setMaintenanceSummary] = useState({
    openCount: 0,
    closedCount: 0,
  });

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
      if (!user) {
        console.warn("No user logged in.");
        return;
      }

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
  }, []);

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
              <h3>Upcoming events</h3>
              <p>You have ?? upcoming events</p>
              <button
                className="view-all-btn"
                onClick={() => navigate("/admin-manage-events")}
              >
                View all
              </button>
            </div>

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

          <div className="graph-container">
            {/* Usage Trends Preview */}
            <div
              className="graph-card clickable"
              onClick={() => navigate("/admin/reports")}
            >
              <h3>Usage Trends by Facility</h3>
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
              <p
                style={{
                  textAlign: "center",
                  color: "#00c0df",
                  marginTop: "0.5rem",
                }}
              >
                Click to view full reports
              </p>
            </div>

            {/* Maintenance Chart */}
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
                <button>Export as CSV</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}
