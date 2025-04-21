import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Auth & Context
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Dashboard Pages
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import StaffDashboard from "./pages/dashboards/StaffDashboard";
import UserDashboard from "./pages/dashboards/UserDashboard";
import StaffViewBookings from "./pages/dashboards/StaffViewBookings";
import StaffUpcomingBookings from "./pages/dashboards/StaffUpcomingBookings";
import StaffEditTimeSlots from "./pages/dashboards/StaffEditTimeSlots";
import StaffManageFacilities from "./pages/dashboards/StaffManageFacilities";

// Resident Feature
import ResidentBooking from "./components/ResidentBooking";

// Styles
import "./forgot.css";
import "./reset.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<SignIn />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff-dashboard"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resident-dashboard"
            element={
              <ProtectedRoute requiredRole="resident">
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resident-booking"
            element={
              <ProtectedRoute requiredRole="resident">
                <ResidentBooking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff-view-bookings"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffViewBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff-upcoming-bookings"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffUpcomingBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff-manage-facilities"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffManageFacilities />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff-edit-time-slots/:id"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffEditTimeSlots />
              </ProtectedRoute>
            }
          />
        </Routes>

        <ToastContainer position="top-center" autoClose={3000} />
      </Router>
    </AuthProvider>
  );
}

export default App;
