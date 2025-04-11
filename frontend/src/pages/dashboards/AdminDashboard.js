import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { toast } from "react-toastify";
import "./AdminDashboard.css";
import Navbar from "../../components/Navbar";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const data = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((user) => user.email !== "admin@gmail.com");

        setUsers(data);
      } catch (err) {
        toast.error("Failed to load users.");
      }
    };

    fetchUsers();
  }, []);

  const toggleApproval = async (user) => {
    const userRef = doc(db, "users", user.email);
    const newStatus = !user.approved;

    try {
      await updateDoc(userRef, { approved: newStatus });
      setUsers((prev) =>
        prev.map((u) =>
          u.email === user.email ? { ...u, approved: newStatus } : u
        )
      );
      toast.success(
        `${user.email} has been ${newStatus ? "approved" : "revoked"}`
      );
    } catch (err) {
      toast.error("Failed to update status.");
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
