import { useEffect, useState } from "react";
<<<<<<< HEAD
import { Navigate } from "react-router-dom";
=======
import { useNavigate } from "react-router-dom";
>>>>>>> 92d8f6e676a8150809db3ec0d9b73ef5820641fc
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

export default function ProtectedRoute({ children, requiredRole }) {
<<<<<<< HEAD
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
=======
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
>>>>>>> 92d8f6e676a8150809db3ec0d9b73ef5820641fc
