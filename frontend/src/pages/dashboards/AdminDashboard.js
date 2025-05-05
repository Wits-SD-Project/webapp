import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/AdminSideBar.js";
import "../../styles/staffDashboard.css"; //dont delete
import "../../styles/adminDashboard.css";
import { useAuth } from "../../context/AuthContext.js";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const username = authUser?.name || "Admin";
  const [maintenanceSummary, setMaintenanceSummary] = useState({ openCount: 0, closedCount: 0 });

  const handleExportMaintenancePDF = async () => {
    const user = auth.currentUser;
    if (!user) return;
  
    try {
      const token = await user.getIdToken();
      const res = await fetch("http://localhost:8080/api/admin/maintenance-reports", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch reports");
  
      const doc = new jsPDF();
      doc.text("Maintenance Report", 14, 15);
  
      autoTable(doc, {
        startY: 25,
        head: [["Facility", "Description", "Status", "Created At"]],
        body: data.reports.map((report) => [
          report.facilityName || "Unknown",
          report.description || "-",
          report.status || "-",
          report.createdAt || "-"
        ]),
      });
  
      doc.save("Maintenance_Report.pdf");
    } catch (error) {
      console.error("PDF export error:", error.message);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      console.warn("No user is currently logged in.");
      return;
    }

    user.getIdToken()
      .then((token) => {
        console.log("Admin token:", token);
      })
      .catch((err) => console.error("Failed to get token:", err));
  }, [authUser]);

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
              <AnimatePresence mode="wait">
                <motion.p>
                  You have ?? upcoming events
                </motion.p>
              </AnimatePresence>
              <button className="view-all-btn" onClick={() => navigate("/admin-manage-events")}>
                View all
              </button>
            </div>

            <div className="card">
              <h3>Pending Applications</h3>
              <AnimatePresence mode="wait">
                <motion.p>
                  ?? users requests awaiting your approval
                </motion.p>
              </AnimatePresence>
              <button className="view-all-btn" onClick={() => navigate("/admin-manage-users")}>
                View all
              </button>
            </div>
          </div>

          <div className="graph-container">
            <div className="graph-card">
              <h3>Usage Trends by Facility</h3>
              <div className="graph-placeholder">graph here</div>
              <div className="export-buttons">
              <button>Export as PDF</button>
              <button>Export as CSV</button>
              </div>
            </div>

            <div className="graph-card">
              <h3>Maintenance Reports (Open vs. Closed Issues)</h3>
              <div className="graph-placeholder">
                <p>Open Issues: {maintenanceSummary.openCount}</p>
                <p>Closed Issues: {maintenanceSummary.closedCount}</p>
              </div>
              <div className="export-buttons">
              <button onClick={handleExportMaintenancePDF}>Export as PDF</button>
              <button>Export as CSV</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}
