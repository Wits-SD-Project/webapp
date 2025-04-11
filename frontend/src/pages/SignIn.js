import "../styles/signin.css";
import logo from "../assets/logo.png";

export default function SignIn() {
  return (
    <main className="login-container">
      <header className="logo-section">
        <img src={logo} alt="Sports Sphere Logo" className="logo" />
      </header>

      <section className="form-section" aria-labelledby="signin-heading">
        <h1 id="signin-heading">Sign in now</h1>
        <p>Welcome to Sports Sphere</p>

        <form className="login-form" method="post" action="#">
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

          <button type="submit" className="btn primary">
            Sign in
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
          <a href="#" className="register-link">
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
