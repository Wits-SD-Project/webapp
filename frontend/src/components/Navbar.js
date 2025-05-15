import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "./Navbar.css";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
<<<<<<< HEAD
=======
import { auth } from "../firebase";
>>>>>>> 92d8f6e676a8150809db3ec0d9b73ef5820641fc

export default function Navbar() {
  const navigate = useNavigate();
  const { setAuthUser } = useAuth();

<<<<<<< HEAD
  const handleLogout = () => {
=======
  const handleLogout = async () => {
    try {
      await auth.signOut(); // Sign out from Firebase
      const response = await fetch('http://localhost:8080/api/auth/logout', {
        method: 'POST',
        credentials: 'include' // Necessary for cookies
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear server session');
      }
    } catch (err) {
      console.error("Firebase signout error:", err);
    }
>>>>>>> 92d8f6e676a8150809db3ec0d9b73ef5820641fc
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
