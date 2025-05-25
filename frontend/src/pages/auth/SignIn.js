// Import styles and assets
import "../../styles/signin.css";
import logo from "../../assets/logo.png";

// Import hooks and libraries
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithThirdParty } from "../../auth/auth"; // Custom backend auth handler
import { ClipLoader } from "react-spinners"; // Loading spinner
import { toast } from "react-toastify"; // Toast notifications
import { useAuth } from "../../context/AuthContext"; // Custom auth context
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"; // Firebase auth
import { auth } from "../../firebase"; // Firebase configuration

export default function SignIn() {
  const [loading, setLoading] = useState(false); // Not used here, can be removed or added to spinner logic
  const [providerLoading, setProviderLoading] = useState(null); // Tracks which provider (e.g., Google) is loading
  const navigate = useNavigate(); // For redirecting users after login
  const { setAuthUser } = useAuth(); // Auth context setter for global user state

  /**
   * Handles third-party sign-in, currently only supports Google
   * @param {string} provider - Name of the third-party provider (e.g., "google")
   */
  const handleThirdPartySignIn = async (provider) => {
  try {
    setProviderLoading(provider);
    let result;

    if (provider === "google") {
      result = await signInWithPopup(auth, new GoogleAuthProvider());

      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential) throw new Error("No credential returned from Google");

      const idToken = await result.user.getIdToken();

      const response = await signInWithThirdParty({ idToken });

      setAuthUser({
        email: response.email,
        role: response.role,
        name: response.name,
      });

      toast.success(`Welcome back, ${response.name || response.email}`);

      const redirectPath = {
        admin: "/admin-dashboard",
        staff: "/staff-dashboard",
        resident: "/res-events",
      }[response.role] || "/";

      navigate(redirectPath);
    }
  } catch (err) {
    console.error("Third-party sign in error:", err);
    setAuthUser(null);

    // Use the `err.data.message` for toast messages
    const message = err.data?.message || err.message;

    if (message === "User not registered.") {
      toast.error("Account not registered. Please sign up first.");
    } else if (message === "Account not yet approved.") {
      toast.error("⏳ Waiting for admin approval.");
    } else if (message === "Access denied.") {
      toast.error("⛔ Access denied.");
    } else {
      toast.error(message || "Sign in failed. Please try again.");
    }
  } finally {
    setProviderLoading(null);
  }
};


  return (
    <main className="login-container">
      {/* Logo header */}
      <header className="logo-section">
        <img src={logo} alt="Sports Sphere Logo" className="logo" />
      </header>

      {/* Sign-in section */}
      <section className="form-section" aria-labelledby="signin-heading">
        <h1 id="signin-heading">Sign in now</h1>
        <p>Welcome to Sports Sphere</p>

        {/* Google Sign-in button */}
        <button
          className="btn google-pill-btn"
          onClick={() => handleThirdPartySignIn("google")}
          type="button"
          disabled={providerLoading === "google"} // Disable button while signing in
        >
          {providerLoading === "google" ? (
            // Show loading spinner while signing in
            <ClipLoader size={20} color="#000" />
          ) : (
            // Default Google sign-in button
            <>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google Logo"
                className="google-icon"
              />
              <span className="google-text">Sign in with Google</span>
            </>
          )}
        </button>

        {/* Sign-up link for new users */}
        <p className="register-text">
          Don't have an account?{" "}
          <a href="/signup" className="register-link">
            Register here
          </a>
        </p>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2025 Sports Sphere. All rights reserved.</p>
      </footer>
    </main>
  );
}
