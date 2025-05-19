import "../../styles/signin.css";
import logo from "../../assets/logo.png";
import { useState } from "react";
import { MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import { signUpWithThirdParty } from "../../auth/auth";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";

export default function SignUp() {
  const navigate = useNavigate(); // Used to redirect the user after signup
  const [role, setRole] = useState(""); // Stores selected user role
  const [loading, setLoading] = useState(false); // Generic loading state (not used in this snippet)
  const [providerLoading, setProviderLoading] = useState(null); // Tracks which provider is loading

  // Updates the role state when the user selects a role from the dropdown
  const handleRoleChange = (event) => {
    setRole(event.target.value);
  };

  // Handles third-party (Google) sign-up
  const handleThirdPartySignUp = async (provider) => {
    // Enforce role selection before allowing sign-up
    if (!role) {
      toast.error("Please select a role first");
      return;
    }

    try {
      setProviderLoading(provider); // Disable button for this provider during the request
      let result;

      if (provider === "google") {
        // Initiate Google sign-in popup
        result = await signInWithPopup(auth, new GoogleAuthProvider());

        // Get the credential returned from Google (for validation)
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (!credential) throw new Error("No credential returned");

        // Get the Firebase ID token to send to the backend
        const idToken = await result.user.getIdToken();

        // Send token and role to backend for user creation
        const user = await signUpWithThirdParty({
          idToken,
          provider: "google",
          role: role,
        });

        // Notify user of successful signup and redirect to login
        toast.success(
          `Account created for ${user.email}. Awaiting admin approval.`
        );
        navigate("/signin");
      }
    } catch (err) {
      // Log and display errors gracefully
      console.error("Signup error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        toast.error("Signup canceled");
      } else {
        toast.error("Signup failed: " + (err.message || "Please try again"));
      }
    } finally {
      setProviderLoading(null); // Reset loading state
    }
  };

  return (
    <main className="login-container">
      {/* Logo header */}
      <header className="logo-section">
        <img src={logo} alt="Sports Sphere Logo" className="logo" />
      </header>

      {/* Signup form section */}
      <section className="form-section" aria-labelledby="signup-heading">
        <h1 id="signup-heading">Create your account</h1>
        <p>Join the Sports Sphere community</p>

        <div className="divider-text" role="separator">
          Select a role first
        </div>

        {/* Role selection dropdown */}
        <form className="login-form">
          <FormControl
            required
            fullWidth
            sx={{
              "& .MuiInputBase-root": {
                borderRadius: "999px",
                border: "2px solid #0cc0df",
                paddingLeft: "1rem",
              },
              "& .MuiInputLabel-root": {
                left: "1rem",
              },
              "& .MuiSelect-select": {
                padding: "0.75rem 1rem",
              },
            }}
          >
            <InputLabel id="role-label">Role</InputLabel>
            <Select
              labelId="role-label"
              id="role"
              value={role}
              label="Role"
              onChange={handleRoleChange}
              displayEmpty
            >
              <MenuItem value="resident">Resident</MenuItem>
              <MenuItem value="staff">Facility Staff</MenuItem>
            </Select>
          </FormControl>
        </form>

        {/* Google sign-up button with spinner and icon */}
        <button
          className="btn google-pill-btn"
          type="button"
          onClick={() => handleThirdPartySignUp("google")}
          disabled={providerLoading === "google"}
        >
          {providerLoading === "google" ? (
            <ClipLoader size={20} color="#000" />
          ) : (
            <>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google Logo"
                className="google-icon"
              />
              <span className="google-text">Sign up with Google</span>
            </>
          )}
        </button>

        {/* Link to Sign In */}
        <p className="register-text">
          Already have an account?{" "}
          <a href="/signin" className="register-link">
            Sign in here
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
