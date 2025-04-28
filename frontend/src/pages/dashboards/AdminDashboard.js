import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/AdminSideBar.js";
import "../../styles/staffDashboard.css"; //dont delete
import "../../styles/adminDashboard.css";
import { useAuth } from "../../context/AuthContext.js";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { motion, AnimatePresence } from "framer-motion";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const username = authUser?.name || "Admin";

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
  }, [authUser]);

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
              <div className="graph-placeholder">graph here</div>
              <div className="export-buttons">
                <button>Export as PDF</button>
                <button>Export as CSV</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}