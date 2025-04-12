import "../../styles/signin.css";
import logo from "../../assets/logo.png";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInUser } from "../../auth/auth";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { doSignInWithGoogle } from "../../auth/auth";

export default function SignIn() {
//Ibram's code
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  //Ibram: "signInUser is not in a global scope so I had to create the above ^"
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
    }
  };

  //Sigining in with Email and Password
  const onSubmit = async (e) => {
    e.preventDefault()
    if(!isSigningIn){
      setIsSigningIn(true)
      await  signInUser(email, password)
    }
  }

  const onGoogleSignIn = (e) => {
    e.preventDefault()
    if(!isSigningIn) {
      setIsSigningIn(true)
      doSignInWithGoogle().catch(err => {
        setIsSigningIn(false)
      })
    }
  }


  return (
    <main className="login-container">
      <header className="logo-section">
        <img src={logo} alt="Sports Sphere Logo" className="logo" />
      </header>

      <section className="form-section" aria-labelledby="signin-heading">
        <h1 id="signin-heading">Sign in now</h1>
        <p>Welcome to Sports Sphere</p>

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
