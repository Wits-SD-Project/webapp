import { useEffect, useState } from "react";
import Sidebar from "../../components/SideBar.js";
import "../../styles/staffViewBookings.css";



//import data from db - dummy data for now
const dummyBookings = [
    {
        facilityName: "Wanderers",
        facilityType: "Cricket Ground",
        user: "Priyanka Gohil",
        datetime: "2025-06-17 14:00",
        duration: "1.5 hrs",
        status: "pending"
      },
      {
        facilityName: "Olympic Arena",
        facilityType: "Swimming Pool #2",
        user: "Jane Doe",
        datetime: "2025-06-17 16:00",
        duration: "2 hrs",
        status: "approved"
      },
      {
        facilityName: "City Dome",
        facilityType: "Basketball Court #1",
        user: "John Stark",
        datetime: "2025-06-18 09:00",
        duration: "1 hr",
        status: "pending"
      },
      {
        facilityName: "West Field",
        facilityType: "Football Pitch",
        user: "Bruce Banner",
        datetime: "2025-06-18 19:00",
        duration: "1.5 hrs",
        status: "rejected"
      },
      {
        facilityName: "Indoor Zone",
        facilityType: "Badminton Court",
        user: "Natasha R.",
        datetime: "2025-06-19 11:00",
        duration: "1 hr",
        status: "approved"
      },
      {
        facilityName: "Grand Arena",
        facilityType: "Volleyball Court",
        user: "Peter Parker",
        datetime: "2025-06-20 13:00",
        duration: "2 hrs",
        status: "pending"
      },
      {
        facilityName: "Sky Hall",
        facilityType: "Gym",
        user: "Tony Stark",
        datetime: "2025-06-20 15:00",
        duration: "1 hr",
        status: "approved"
      },
      {
        facilityName: "Zen Center",
        facilityType: "Yoga Room",
        user: "Wanda M.",
        datetime: "2025-06-21 09:30",
        duration: "1.5 hrs",
        status: "pending"
      },
      {
        facilityName: "Pro Track",
        facilityType: "Athletics Track",
        user: "Steve Rogers",
        datetime: "2025-06-22 10:00",
        duration: "2 hrs",
        status: "rejected"
      },
      {
        facilityName: "Game Hub",
        facilityType: "Esports Room",
        user: "Shuri",
        datetime: "2025-06-23 17:00",
        duration: "1 hr",
        status: "approved"
      },
      {
        facilityName: "Game Hub",
        facilityType: "Esports Room",
        user: "Shuri",
        datetime: "2025-06-23 17:00",
        duration: "1 hr",
        status: "approved"
      },
      {
        facilityName: "Game Hub",
        facilityType: "Esports Room",
        user: "Shuri",
        datetime: "2025-06-23 17:00",
        duration: "1 hr",
        status: "approved"
      },
      {
        facilityName: "Game Hub",
        facilityType: "Esports Room",
        user: "Shuri",
        datetime: "2025-06-23 17:00",
        duration: "1 hr",
        status: "approved"
      }
  
];

export default function ViewBookings() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    // Replace this with actual fetch call 
    setBookings(dummyBookings);
  }, []);

  return (
    <main className="view-bookings">
     

      <div className="container">
        <Sidebar activeItem="view bookings" />

        <main className="main-content">
          <header className="page-header">
            <h1>View Bookings</h1>
            <input type="search" placeholder="Search" className="search-box" />
          </header>

          <section className="table-section">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Facility Name</th>
                  <th>Facility Type</th>
                  <th>User</th>
                  <th>Date/Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, index) => (
                  <tr key={index}>
                    <td>{b.facilityName}</td>
                    <td>{b.facilityType}</td>
                    <td>{b.user}</td>
                    <td>{b.datetime}</td>
                    <td>{b.duration}</td>
                    <td className={`status ${b.status.toLowerCase()}`}>{b.status}</td>
                    <td className="actions">
                      {b.status === "pending" ? (
                        <>
                          <button className="approve">Approve</button>
                          <button className="reject">Reject</button>
                        </>
                      ) : (
                        <button className="view">View</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
      </div>
    </main>
  );
}
