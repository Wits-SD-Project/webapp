import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "./Navbar.css";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

export default function Navbar() {
  const navigate = useNavigate();
  const { setAuthUser } = useAuth();

  const handleLogout = () => {
    setAuthUser(null); // remove auth context
    toast.success("Logged out");
    navigate("/signin");
  };

  return (
    <nav className="navbar">
      <img src={logo} alt="Logo" className="navbar-logo" />
      <button onClick={handleLogout} className="logout-button">
        Logout
      </button>
    </nav>
  );
}
