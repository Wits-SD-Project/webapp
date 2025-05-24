import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../firebase"; // Import your Firebase auth instance
import { toast } from "react-toastify"; // For displaying notifications

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on initial load
useEffect(() => {
  const verifySession = async () => {
    try {
      const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        try {
          if (firebaseUser) {
            const idToken = await firebaseUser.getIdToken();
            const response = await fetch(
              `${process.env.REACT_APP_API_BASE_URL}/api/auth/verify-session`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
              }
            );

            if (!response.ok) {
              const errorData = await response.json();
              
              // Handle "Account not authorized" (403) as a soft failure
              if (errorData.message === "Account not authorized") {
                setAuthUser(null); // Ensure user is logged out
                return; // Exit early (no error thrown)
              }

              // Throw all other errors
              throw new Error(errorData.message || "Verification failed");
            }

            // Success: Set user data
            const data = await response.json();
            setAuthUser(data.user);
          } else {
            setAuthUser(null); // No Firebase user (logged out)
          }
        } catch (error) {
          console.error("Auth verification error:", error.message);
          // Handle other errors (e.g., network issues)
          toast.error("Session verification failed. Try again.");
          setAuthUser(null);
        } finally {
          setLoading(false);
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Firebase auth error:", error);
      setAuthUser(null);
      setLoading(false);
    }
  };

  verifySession();
}, []);

  const value = {
    authUser,
    setAuthUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
