import React from 'react';
import './forgot.css';

function ForgotPassword() {
  return (
    <main className="forgot-container">
      <h1>Forgot your password?</h1>
      <p>Enter your email address and we'll send you a link to reset your password.</p>
      <form onSubmit={(e) => e.preventDefault()}>
        <input type="email" placeholder="Enter your email" required />
        <button type="submit">Send reset link</button>
      </form>
      <a href="/">Return to Sign in</a>
    </main>
  );
}

export default ForgotPassword;
