import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import manageFacilitiesIcon from "../../assets/manage-facilities.png";
import dashboardIcon from "../../assets/dashboard.png";
import "../../styles/staffDashboard.css";





export default function StaffDashboard() {
  const navigate = useNavigate();



  return (
    <main className="dashboard">
     

      <div className="container">
        <aside className="sidebar">
          <button className="logo-button" onClick={() => (window.location.href = "/fkfkfkfk")}>
            <div className="logo-wrapper">
              <img src={logo} alt="Sports Sphere Logo" className="logo" />
            </div>
          </button>

          <nav className="nav-menu">
            <ul>
              <li className="active"><img src={dashboardIcon} alt="Dashboard" /> Dashboard</li>
              <li><img src={manageFacilitiesIcon} alt="Manage Facilities" /> Manage Facilities</li>
              <li onClick={() => navigate("/staff-view-bookings")}><img src="/images/view-bookings.png" alt="View Bookings" /> View Bookings</li>
              <li><img src="/images/maintenance.png" alt="Maintenance" /> Maintenance</li>
              <li><img src="/images/logout.png" alt="Logout" /> Log Out</li>
            </ul>
          </nav>
        </aside>

        <main className="main-content">
          <header className="page-header">
            <h1>Dashboard</h1>
            <div className="user-name">John Doe</div>
          </header>

          <div className="card-container">
            <div className="card">
              <h3>Upcoming facility bookings</h3>
              <p>You have 10 upcoming bookings in the next 7 days</p>
              <button className="view-all-btn">View all</button>
            </div>
            <div className="card">
              <h3>Pending Applications</h3>
              <p>5 booking requests awaiting your approval</p>
              <button className="view-all-btn">View all</button>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}
