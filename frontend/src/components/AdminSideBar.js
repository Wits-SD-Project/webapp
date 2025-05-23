import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import manageFacilitiesIcon from "../assets/manage-facilities.png";
import dashboardIcon from "../assets/dashboard.png";
import viewBookingsIcon from "../assets/view-bookings.png";
import maintenanceIcon from "../assets/maintenance.png";
import logOutIcon from "../assets/log-out.png";
import "./staffSideBar.css";
import { toast } from "react-toastify";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ activeItem }) {
  const navigate = useNavigate();
  const { setAuthUser } = useAuth();

  const handleLogout = async () => {
    try {
      await auth.signOut(); // Sign out from Firebase
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/auth/logout`,
        {
          method: "POST",
          credentials: "include", // Necessary for cookies
        }
      );

      if (!response.ok) {
        throw new Error("Failed to clear server session");
      }
    } catch (err) {
      console.error("Firebase signout error:", err);
    }
    setAuthUser(null); // remove auth context
    toast.success("Logged out");
    navigate("/signin");
  };

  const menuItems = [
    {
      name: "Dashboard",
      icon: dashboardIcon,
      path: "/admin-dashboard",
      onClick: () => navigate("/admin-dashboard"),
    },
    {
      name: "Manage Events",
      icon: manageFacilitiesIcon,
      path: "/admin-manage-events",
      onClick: () => navigate("/admin-manage-events"),
    },
    {
      name: "Manage Users",
      icon: viewBookingsIcon,
      path: "/admin-manage-users",
      onClick: () => navigate("/admin-manage-users"),
    },
    {
      name: "Maintenance",
      icon: maintenanceIcon,
      path: "/admin-maintenance",
      onClick: () => navigate("/admin-maintenance"),
    },
    {
      name: "Log Out",
      icon: logOutIcon,
      path: "/logout",
      onClick: () => handleLogout(),
    },
  ];

  return (
    <aside className="sidebar">
      <button
        className="logo-button"
        onClick={() => navigate("/admin-dashboard")}
      >
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
