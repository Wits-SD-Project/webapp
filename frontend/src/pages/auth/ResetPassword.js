import React from "react";

function ResetPassword() {
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <main className="reset-container">
      <div className="reset-content">
        <h1>Reset Your Password</h1>
        <p>Enter your new password below.</p>

        <form onSubmit={handleSubmit} data-testid="reset-form">
          <input type="password" placeholder="New password" required />
          <input type="password" placeholder="Confirm new password" required />
          <button type="submit">Update Password</button>
        </form>
      </div>
    </main>
  );
}

export default ResetPassword;
