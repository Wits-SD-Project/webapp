import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Auth & Context
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Admin Pages
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import AdminManageUsers from "./pages/dashboards/AdminManageUsers";
import AdminManageEvents from "./pages/dashboards/AdminManageEvents";
import AdminMaintenance from "./pages/dashboards/AdminMaintenance";
import Reports from "./pages/dashboards/Reports"; 

// Staff Pages
import StaffDashboard from "./pages/dashboards/StaffDashboard";
import StaffViewBookings from "./pages/dashboards/StaffViewBookings";
import StaffUpcomingBookings from "./pages/dashboards/StaffUpcomingBookings";
import StaffEditTimeSlots from "./pages/dashboards/StaffEditTimeSlots";
import StaffManageFacilities from "./pages/dashboards/StaffManageFacilities";
import StaffMaintenance from "./pages/dashboards/StaffMaintenance";

// Resident Pages
import ResDashboard from "./pages/dashboards/ResDashboard";
import ResNotifications from "./pages/dashboards/ResNotifications";
import ResMaintenance from "./pages/dashboards/ResMaintenance";
import ResEvents from "./pages/dashboards/ResEvents";
import UserDashboard from "./pages/dashboards/UserDashboard";
import FacilityDetail from "./pages/dashboards/FacilityDetail";
import ResidentBooking from "./components/ResidentBooking";

// Styles
import "./forgot.css";
import "./reset.css";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<SignIn />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Admin Protected Routes */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-manage-users"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminManageUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-manage-events"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminManageEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-maintenance"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminMaintenance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute requiredRole="admin">
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* Staff Protected Routes */}
        <Route
          path="/staff-dashboard"
          element={
            <ProtectedRoute requiredRole="staff">
              <StaffDashboard />
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
        <Route
          path="/staff-maintenance"
          element={
            <ProtectedRoute requiredRole="staff">
              <StaffMaintenance />
            </ProtectedRoute>
          }
        />

        {/* Resident Protected Routes */}
        <Route
          path="/res-dashboard"
          element={
            <ProtectedRoute requiredRole="resident">
              <ResDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/res-notifications"
          element={
            <ProtectedRoute requiredRole="resident">
              <ResNotifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/res-maintenance"
          element={
            <ProtectedRoute requiredRole="resident">
              <ResMaintenance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/res-events"
          element={
            <ProtectedRoute requiredRole="resident">
              <ResEvents />
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
          path="/facility/:id"
          element={
            <ProtectedRoute requiredRole="resident">
              <FacilityDetail />
            </ProtectedRoute>
          }
        />
      </Routes>

      <ToastContainer position="top-center" autoClose={3000} />
    </AuthProvider>
  );
}

export default App;
