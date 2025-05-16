import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

export default function ProtectedRoute({ children, requiredRole }) {
  const { authUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return; // Still verifying session

    if (!authUser) {
      toast.error("Please sign in to continue");
      navigate("/signin");
    } else if (requiredRole && authUser.role !== requiredRole) {
      toast.error("You don't have permission to access this page");
      navigate("/");
    }
  }, [authUser, requiredRole, loading, navigate]);

  if (loading) return <div className="loading-spinner">Loading...</div>;
  if (!authUser || (requiredRole && authUser.role !== requiredRole)) {
    return null; // Redirect will happen from useEffect
  }

  return children;
}
