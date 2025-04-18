import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/SideBar.js";
import "../../styles/staffDashboard.css";





export default function StaffDashboard() {
  const navigate = useNavigate();



  return (
    <main className="dashboard">
     

      <div className="container">
      <Sidebar activeItem="dashboard" />

        <main className="main-content">
          <header className="page-header">
            <h1>Dashboard</h1>
            <div className="user-name">John Doe</div>
          </header>

          <div className="card-container">
            <div className="card">
              <h3>Upcoming facility bookings</h3>
              <p>You have 10 upcoming bookings in the next 7 days</p>
              <button className="view-all-btn" onClick={() => navigate("/staff-upcoming-bookings")}>View all</button>
            </div>
            <div className="card">
              <h3>Pending Applications</h3>
              <p>5 booking requests awaiting your approval</p>
              <button className="view-all-btn" onClick={() => navigate("/staff-view-bookings")}>View all</button>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}
