import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "./AdminDashboard.css";
import Navbar from "../../components/Navbar";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(
          "https://ssbackend-aka9gddqdxesexh5.canadacentral-01.azurewebsites.net/api/admin/users"
        );
        const data = await res.json();

        if (!res.ok) throw new Error(data.message);
        setUsers(data);
      } catch (err) {
        console.log(err);
        toast.error("Failed to load users." + err);
      }
    };

    fetchUsers();
  }, []);

  const toggleApproval = async (user) => {
    try {
      const res = await fetch(
        "https://ssbackend-aka9gddqdxesexh5.canadacentral-01.azurewebsites.net/api/admin/toggle-approval",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      setUsers((prev) =>
        prev.map((u) =>
          u.email === user.email ? { ...u, approved: data.approved } : u
        )
      );

      toast.success(data.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <main className="admin-dashboard">
      <Navbar />
      <h1>Admin Dashboard</h1>
      <table className="user-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Approved</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.email}>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.approved ? "Yes" : "No"}</td>
              <td>
                <button
                  className={`btn ${user.approved ? "revoke" : "approve"}`}
                  onClick={() => toggleApproval(user)}
                >
                  {user.approved ? "Revoke" : "Approve"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
