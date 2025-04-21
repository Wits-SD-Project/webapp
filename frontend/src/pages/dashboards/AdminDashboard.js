// src/pages/admin/AdminDashboard.js
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Navbar from "../../components/Navbar";
import {
  Box,
  Typography,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
} from "@mui/material";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(
          "https://ssbackend-aka9gddqdxesexh5.canadacentral-01.azurewebsites.net/api/admin/users"
        );
        const text = await res.text();
        if (!res.ok) throw new Error(text || res.statusText);
        const data = JSON.parse(text);

        setUsers(
          data.map((u) => ({
            ...u,
            approved: !!u.approved,
            accepted: !!u.accepted,
          }))
        );
      } catch (err) {
        console.error("fetchUsers error:", err);
        toast.error("Failed to load users: " + err.message);
      }
    };

    fetchUsers();
  }, []);

  const handleToggle = async (user, endpoint, flagKey) => {
    try {
      const res = await fetch(
        `https://ssbackend-aka9gddqdxesexh5.canadacentral-01.azurewebsites.net/api/admin/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        }
      );

      // read raw text first
      const text = await res.text();
      if (!res.ok) throw new Error(text || res.statusText);

      // parse json
      const data = JSON.parse(text);

      setUsers((prev) =>
        prev.map((u) =>
          u.email !== user.email ? u : { ...u, [flagKey]: data[flagKey] }
        )
      );

      toast.success(data.message);
    } catch (err) {
      console.error(`${endpoint} error:`, err);
      toast.error(err.message);
    }
  };

  const toggleApproval = (u) => handleToggle(u, "toggle-approval", "approved");
  const toggleAccepted = (u) => handleToggle(u, "toggle-accepted", "accepted");

  return (
    <Box component="main" sx={{ p: 2 }}>
      <Navbar />

      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      <TableContainer
        component={Paper}
        sx={{ maxHeight: "calc(100vh - 200px)" }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Approved?</TableCell>
              <TableCell>Access Granted?</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No users found.
                </TableCell>
              </TableRow>
            )}

            {users.map((user) => (
              <TableRow key={user.email} hover>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.approved ? "Yes" : "No"}</TableCell>
                <TableCell>{user.accepted ? "Yes" : "No"}</TableCell>
                <TableCell align="center">
                  <Button
                    variant="contained"
                    size="small"
                    color={user.approved ? "error" : "success"}
                    onClick={() => toggleApproval(user)}
                  >
                    {user.approved ? "Revoke" : "Approve"}
                  </Button>

                  <Button
                    sx={{ ml: 1 }}
                    variant="contained"
                    size="small"
                    color={user.accepted ? "error" : "primary"}
                    disabled={!user.approved}
                    onClick={() => toggleAccepted(user)}
                  >
                    {user.accepted ? "Revoke Access" : "Grant Access"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
