import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

export default function ProtectedRoute({ children, requiredRole }) {
  const { authUser } = useAuth();
  const [redirect, setRedirect] = useState(null);

  useEffect(() => {
    if (!authUser) {
      toast.error("Insufficient permissions.");
      setRedirect("/signin");
    } else if (requiredRole && authUser.role !== requiredRole) {
      toast.error("Insufficient permissions.");
      setRedirect("/signin");
    }
  }, [authUser, requiredRole]);

  if (redirect) return <Navigate to={redirect} />;

  return children;
}
