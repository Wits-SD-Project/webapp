import "../../styles/signin.css";
import logo from "../../assets/logo.png";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
<<<<<<< HEAD
import { signInUser } from "../../auth/auth";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuthUser } = useAuth();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target;
    try {
      const user = await signInUser({
        email: form.email.value,
        password: form.password.value,
      });
      console.log(user);
      setAuthUser(user);
      toast.success("Welcome back, " + user.email);
      if (user.role === "admin") {
        navigate("/admin-dashboard");
      } else if (user.role === "staff") {
        navigate("/staff-dashboard");
      } else {
        navigate("/user-dashboard");
      }
    } catch (err) {
      if (err.message.includes("Account not yet approved")) {
        toast.error("⏳ Waiting for Admin approval.");
      } else {
        toast.error("Sign in failed: " + err.message);
      }
    } finally {
      setLoading(false);
=======
import { signInWithThirdParty } from "../../auth/auth";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../firebase";

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState(null);
  const navigate = useNavigate();
  const { setAuthUser } = useAuth();

  const handleThirdPartySignIn = async (provider) => {
    try {
      setProviderLoading(provider);
      let result;
  
      if (provider === "google") {
        result = await signInWithPopup(auth, new GoogleAuthProvider());
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (!credential) throw new Error("No credential returned from Google");
  
        // Get the Firebase ID token
        const idToken = await result.user.getIdToken();
        
        // Send to your backend (which sets the httpOnly cookie)
        const response = await signInWithThirdParty({ idToken });
        const user = response;
  
        // Update auth context
        setAuthUser({
          email: user.email,
          role: user.role,
          name: user.name
        });
  
        toast.success(`Welcome back, ${user.name || user.email}`);
  
        // Redirect based on role
        const redirectPath = {
          admin: "/admin-dashboard",
          staff: "/staff-dashboard",
          resident: "/res-dashboard"
        }[user.role] || "/";
        
        navigate(redirectPath);
      }
    } catch (err) {
      console.error("Third-party sign in error:", err);
      console.log(err);
      // Clear any invalid auth state
      setAuthUser(null);
      
      if (err.response?.data?.message === "User not registered.") {
        toast.error("Account not registered. Please sign up first.");
      } else if (err.response?.data?.message === "Account not yet approved.") {
        toast.error("⏳ Waiting for admin approval.");
      } else if (err.response?.data?.message === "Access denied.") {
        toast.error("⛔ Access denied.");
      } else {
        toast.error("Sign in failed. Please try again.");
      }
    } finally {
      setProviderLoading(null);
>>>>>>> 92d8f6e676a8150809db3ec0d9b73ef5820641fc
    }
  };

  return (
    <main className="login-container">
      <header className="logo-section">
        <img src={logo} alt="Sports Sphere Logo" className="logo" />
      </header>

      <section className="form-section" aria-labelledby="signin-heading">
        <h1 id="signin-heading">Sign in now</h1>
        <p>Welcome to Sports Sphere</p>

<<<<<<< HEAD
        <form className="login-form" onSubmit={handleSignIn}>
          <label htmlFor="email" className="visually-hidden">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Email"
            required
          />

          <label htmlFor="password" className="visually-hidden">
            Password
          </label>
          <div className="password-wrapper">
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Password"
              required
            />
            <button
              type="button"
              className="eye-icon"
              aria-label="Show password"
            >
              👁️
            </button>
          </div>

          <p className="forgot-password">
            <a href="#">Forgot password?</a>
          </p>

          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? <ClipLoader size={20} color="#fff" /> : "Sign in"}
          </button>
        </form>

        <div className="divider-text" role="separator">
          Or continue with
        </div>

        <button className="btn secondary" type="button">
          Google
        </button>

        <p className="register-text">
          Don’t have an account?{" "}
=======
        <button
          className="btn secondary"
          onClick={() => handleThirdPartySignIn("google")}
          type="button"
          disabled={providerLoading === "google"}
        >
          {providerLoading === "google" ? (
            <ClipLoader size={20} color="#000" />
          ) : (
            "Sign in with Google"
          )}
        </button>

        <p className="register-text">
          Don't have an account?{" "}
>>>>>>> 92d8f6e676a8150809db3ec0d9b73ef5820641fc
          <a href="/signup" className="register-link">
            Register here
          </a>
        </p>
      </section>

      <footer className="footer">
        <p>&copy; 2025 Sports Sphere. All rights reserved.</p>
      </footer>
    </main>
  );
}
