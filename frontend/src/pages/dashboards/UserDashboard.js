import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";

export default function UserDashboard() {
  const navigate = useNavigate(); 

  const handleBookingClick = () => {
    navigate('/resident-booking'); 
  };

  return (
    <>
      <Navbar />
      <main style={{ padding: "2rem" }}>
        <h1>Welcome Resident</h1>
        
        <button onClick={handleBookingClick}>
          Book a facility
        </button>
      </main>
    </>
  );
}
