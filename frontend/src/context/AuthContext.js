import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../firebase"; // Import your Firebase auth instance

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on initial load
  useEffect(() => {
    const verifySession = async () => {
      try {
        // First check Firebase auth state
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
          if (firebaseUser) {
            // If Firebase has a user, verify with our backend
            const idToken = await firebaseUser.getIdToken();
            const response = await fetch("http://localhost:8080/api/auth/verify-session", {
              method: "POST", // or "GET" if your backend supports it
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ idToken }),
            });
            
            if (!response.ok) {
              throw new Error(response.message);
            }
            const data = await response.json();
            setAuthUser(data.user);
          }
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Session verification failed:", error);
        setAuthUser(null);
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const value = {
    authUser,
    setAuthUser,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
