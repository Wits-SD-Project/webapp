import React from "react";
import { useNavigate } from "react-router-dom";

const COLORS = {
  primary: "#00BCD4",
  accent: "#0097A7",
  background: "#F5F7FA",
  text: "#222B45",
  white: "#fff"
};

const styles = {
  body: {
    background: COLORS.background,
    color: COLORS.text,
    fontFamily: "'Segoe UI', sans-serif",
    margin: 0,
    minHeight: "100vh",
  },
  header: {
    background: COLORS.primary,
    color: COLORS.white,
    padding: "1.5rem 2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  nav: {
    display: "flex",
    gap: "1.5rem"
  },
  navLink: {
    color: COLORS.white,
    textDecoration: "none",
    fontWeight: 500
  },
  logo: {
    fontWeight: 700,
    fontSize: "1.7rem",
    letterSpacing: "2px"
  },
  hero: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "3rem 2rem",
    background: COLORS.white,
    borderRadius: "18px",
    margin: "2rem auto",
    maxWidth: "1100px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)"
  },
  heroContent: { maxWidth: "600px" },
  heroTitle: {
    fontSize: "2.5rem",
    color: COLORS.accent,
    marginBottom: "1rem",
    fontWeight: 700
  },
  heroSubtitle: {
    fontSize: "1.2rem",
    marginBottom: "2rem"
  },
  ctaBtn: {
    background: COLORS.primary,
    color: COLORS.white,
    border: "none",
    borderRadius: "6px",
    padding: "1rem 2rem",
    fontSize: "1.2rem",
    cursor: "pointer",
    marginRight: "1rem"
  },
  heroImg: {
    borderRadius: "14px",
    width: "330px",
    height: "auto",
    objectFit: "cover",
    boxShadow: "0 2px 10px rgba(0,0,0,0.07)"
  },
  features: {
    display: "flex",
    justifyContent: "center",
    gap: "2rem",
    margin: "3rem 0"
  },
  featureCard: {
    background: COLORS.white,
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    padding: "2rem",
    width: "300px",
    textAlign: "center"
  },
  featureIcon: {
    fontSize: "2rem",
    marginBottom: "1rem",
    color: COLORS.primary
  },
  howItWorks: {
    maxWidth: "900px",
    margin: "3rem auto",
    padding: "2rem",
    background: COLORS.white,
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  },
  howTitle: {
    color: COLORS.accent,
    fontWeight: 700,
    fontSize: "1.6rem",
    marginBottom: "1.5rem"
  },
  steps: {
    display: "flex",
    justifyContent: "space-between",
    gap: "2rem"
  },
  step: {
    flex: 1,
    textAlign: "center"
  },
  stepNum: {
    background: COLORS.primary,
    color: COLORS.white,
    borderRadius: "50%",
    width: "38px",
    height: "38px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "1.2rem",
    marginBottom: "0.8rem"
  },
  testimonials: {
    maxWidth: "900px",
    margin: "3rem auto",
    display: "flex",
    gap: "2rem",
    flexWrap: "wrap"
  },
  testimonial: {
    background: COLORS.white,
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    padding: "1.5rem",
    flex: 1,
    minWidth: "250px",
    fontStyle: "italic"
  },
  ctaSection: {
    textAlign: "center",
    margin: "3.5rem 0"
  },
  ctaSectionTitle: {
    fontWeight: 700,
    fontSize: "2rem",
    marginBottom: "1.2rem"
  },
  footer: {
    background: COLORS.primary,
    color: COLORS.white,
    padding: "1.2rem 2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  footerLinks: {
    display: "flex",
    gap: "1.2rem"
  },
  footerLink: {
    color: COLORS.white,
    textDecoration: "none",
    fontSize: "1rem"
  }
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ height: "100vh", overflowY: "auto", background: COLORS.background }}>
      <div style={styles.body}>
        {/* Header */}
        <header style={styles.header}>
          <span style={styles.logo}>SportEase</span>
          <nav style={styles.nav}>
            <a href="#" style={styles.navLink}>Home</a>
            <a href="#" style={styles.navLink}>Facilities</a>
            <a href="#" style={styles.navLink}>Bookings</a>
            <a href="#" style={styles.navLink}>Events</a>
            <a href="#" style={styles.navLink}>Contact</a>
          </nav>
          <button style={styles.ctaBtn} onClick={() => navigate("/signin")}>
            Login / Sign Up
          </button>
        </header>

        {/* Hero */}
        <section style={styles.hero}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>Manage. Book. Play.</h1>
            <div style={styles.heroSubtitle}>
              The easiest way to manage and book sports facilities in your community.
            </div>
            <button
              style={styles.ctaBtn}
              onClick={() => navigate("/signup")}
            >
              Get Started
            </button>
            <button
              style={{ ...styles.ctaBtn, background: COLORS.accent }}
              onClick={() => navigate("/signin")}
            >
              Login
            </button>
            <div style={{ marginTop: "1.5rem", color: COLORS.accent, fontWeight: 600 }}>
              Trusted by 10,000+ residents
            </div>
          </div>
          <img
            style={styles.heroImg}
            src="https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=400&q=80"
            alt="People playing basketball"
          />
        </section>

        {/* Features */}
        <section style={styles.features}>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📅</div>
            <h3>Effortless Booking</h3>
            <p>Reserve courts and facilities in seconds with our easy-to-use platform.</p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>🏟️</div>
            <h3>Facility Management</h3>
            <p>Admins can manage schedules, events, and maintenance with ease.</p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📲</div>
            <h3>Instant Notifications</h3>
            <p>Stay updated on bookings, events, and announcements instantly.</p>
          </div>
        </section>

        {/* How It Works */}
        <section style={styles.howItWorks}>
          <div style={styles.howTitle}>How It Works</div>
          <div style={styles.steps}>
            <div style={styles.step}>
              <div style={styles.stepNum}>1</div>
              <div><b>Sign Up</b></div>
              <div>Create your account in minutes.</div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNum}>2</div>
              <div><b>Book a Facility</b></div>
              <div>Reserve your favorite spots with a click.</div>
            </div>
            <div style={styles.step}>
              <div style={styles.stepNum}>3</div>
              <div><b>Stay Informed</b></div>
              <div>Get instant notifications and updates.</div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section style={styles.testimonials}>
          <div style={styles.testimonial}>
            “Managing our community courts has never been easier!”<br />
            <span style={{ color: COLORS.primary, fontWeight: 600 }}>— Resident, Sunview Apartments</span>
          </div>
          <div style={styles.testimonial}>
            “I love how quickly I can book a slot!”<br />
            <span style={{ color: COLORS.primary, fontWeight: 600 }}>— Resident, Lakewood Towers</span>
          </div>
        </section>

        {/* CTA */}
        <section style={styles.ctaSection}>
          <div style={styles.ctaSectionTitle}>Ready to simplify your sports facility experience?</div>
          <button style={styles.ctaBtn} onClick={() => navigate("/signup")}>
            Create Your Free Account
          </button>
        </section>



        {/* Footer */}
        <footer style={styles.footer}>
          <div>© 2025 Sport Sphere</div>
        </footer>
      </div>
    </div>
  );
}
