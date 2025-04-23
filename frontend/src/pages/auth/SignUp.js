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
  const navigate = useNavigate();
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState(null);

  const handleRoleChange = (event) => {
    setRole(event.target.value);
  };

  const handleThirdPartySignUp = async (provider) => {
    if (!role) {
      toast.error("Please select a role first");
      return;
    }

    try {
      setProviderLoading(provider);
      let result;
      
      if (provider === 'google') {
        result = await signInWithPopup(auth, new GoogleAuthProvider());
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (!credential) throw new Error("No credential returned");
        
        const idToken = await result.user.getIdToken();
        const user = await signUpWithThirdParty({
          idToken,
          provider: 'google',
          role: role
        });
        
        toast.success(`Account created for ${user.email}. Awaiting admin approval.`);
        navigate('/signin');
      }
    } catch (err) {
      console.error("Signup error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        toast.error("Signup canceled");
      } else {
        toast.error("Signup failed: " + (err.message || "Please try again"));
      }
    } finally {
      setProviderLoading(null);
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

        <form className="login-form"s>
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

        <div className="divider-text" role="separator">
          Or continue with
        </div>

        <button 
          className="btn secondary" 
          type="button"
          onClick={() => handleThirdPartySignUp('google')}
          disabled={providerLoading === 'google'}
        >
          {providerLoading === 'google' ? (
            <ClipLoader size={20} color="#000" />
          ) : (
            'Google'
          )}
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