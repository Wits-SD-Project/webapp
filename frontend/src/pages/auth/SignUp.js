import "../../styles/signin.css";
import logo from "../../assets/logo.png";
import { useState } from "react";
// import { useNavigate } from "react-router-dom";
import { MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import { signUpUser } from "../../auth/auth";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";

export default function SignUp() {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  // const navigate = useNavigate();

  const handleRoleChange = (event) => {
    setRole(event.target.value);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const form = e.target;
      const user = await signUpUser({
        name: form.name.value,
        email: form.email.value,
        password: form.password.value,
        role,
      });

      toast.success(
        `Account created for ${user.email}. Awaiting admin approval.`
      );
    } catch (err) {
      toast.error("Signup failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-container">
      <header className="logo-section">
        <img src={logo} alt="Sports Sphere Logo" className="logo" />
      </header>

      <section className="form-section" aria-labelledby="signup-heading">
        <h1 id="signup-heading">Create your account</h1>
        <p>Join the Sports Sphere community</p>

        <form className="login-form" onSubmit={handleSignUp}>
          <label htmlFor="name" className="visually-hidden">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Full Name"
            required
          />

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
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="staff">Facility Staff</MenuItem>
            </Select>
          </FormControl>

          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? <ClipLoader size={20} color="#fff" /> : "Sign up"}
          </button>
        </form>

        <div className="divider-text" role="separator">
          Or continue with
        </div>

        <button className="btn secondary" type="button">
          Google
        </button>

        <p className="register-text">
          Already have an account?{" "}
          <a href="/signin" className="register-link">
            Sign in here
          </a>
        </p>
      </section>

      <footer className="footer">
        <p>&copy; 2025 Sports Sphere. All rights reserved.</p>
      </footer>
    </main>
  );
}
