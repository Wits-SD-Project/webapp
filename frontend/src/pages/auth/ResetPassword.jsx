import React from "react";

function ResetPassword() {
  return (
    <main className="reset-container">
      <div className="reset-content">
        <h1>Reset Your Password</h1>
        <p>Enter your new password below.</p>

        <form onSubmit={(e) => e.preventDefault()}>
          <input type="password" placeholder="New password" required />
          <input type="password" placeholder="Confirm new password" required />
          <button type="submit">Update Password</button>
        </form>
      </div>
    </main>
  );
}

export default ResetPassword;
