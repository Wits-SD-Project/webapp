import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import manageFacilitiesIcon from "../assets/manage-facilities.png";
import dashboardIcon from "../assets/dashboard.png";
import viewBookingsIcon from "../assets/view-bookings.png";
import maintenanceIcon from "../assets/maintenance.png";
import logOutIcon from "../assets/log-out.png";
import "./sideBar.css"; 

export default function Sidebar({ activeItem }) {
  const navigate = useNavigate();

  const menuItems = [
    { 
      name: "Dashboard", 
      icon: dashboardIcon, 
      path: "/staff-dashboard",
      onClick: () => navigate("/staff-dashboard")
    },
    { 
      name: "Manage Facilities", 
      icon: manageFacilitiesIcon, 
      path: "/staff-manage-facilities",
      onClick: () => navigate("/staff-manage-facilities")
    },
    { 
      name: "View Bookings", 
      icon: viewBookingsIcon, 
      path: "/staff-view-bookings",
      onClick: () => navigate("/staff-view-bookings")
    },
    { 
      name: "Maintenance", 
      icon: maintenanceIcon, 
      path: "/maintenance",
      onClick: () => navigate("/maintenance")
    },
    { 
      name: "Log Out", 
      icon: logOutIcon, 
      path: "/logout",
      onClick: () => { /* handle logout logic */ }
    }
  ];

  return (
    <aside className="sidebar">
      <button className="logo-button" onClick={() => navigate("/staff-dashboard")}>
        <div className="logo-wrapper">
          <img src={logo} alt="Sports Sphere Logo" className="logo" />
        </div>
      </button>

      <nav className="nav-menu">
        <ul>
          {menuItems.map((item) => (
            <li 
              key={item.name}
              className={activeItem === item.name.toLowerCase() ? "active" : ""}
              onClick={item.onClick}
            >
              <img src={item.icon} alt={item.name} /> 
              {item.name}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}