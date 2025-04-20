import { useEffect, useRef, useState } from "react";
import Sidebar from "../../components/SideBar";
import clockIcon from "../../assets/clock.png";
import editIcon from "../../assets/edit.png";
import binIcon from "../../assets/bin.png";
import "../../styles/staffManageFacilities.css";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuthToken } from "../../firebase"; // adjust path if needed
import { auth } from "../../firebase";

const initialFacilities = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  name: `Facility ${i + 1}`,
  type: "Sport Type",
  isOutdoors: "Yes",
  availability: "Available",
  isEditing: false,
}));

export default function ManageFacilities() {
  const [facilities, setFacilities] = useState(initialFacilities);
  const [facilityName, setFacilityName] = useState("");
  const [facilityType, setFacilityType] = useState("");
  const [facilityDescription, setFacilityDescription] = useState("");

  const navigate = useNavigate();
  const tableRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newFacility = {
      name: facilityName, // state values from inputs
      description: facilityDescription,
      type: facilityType,
      createdAt: new Date(),
      createdBy: auth.currentUser?.email || "Unknown",
    };
  
    handleCreateFacility(newFacility);
  };

  const handleCreateFacility = async (facilityData) => {
    try {
      const token = await getAuthToken();
      const db = getFirestore();
  
      await addDoc(collection(db, "facilities"), facilityData);
  
      console.log("Facility successfully added!");
      // Optional: show a toast/snackbar here
    } catch (error) {
      console.error("Error adding facility:", error);
      // Optional: show an error toast/snackbar
    }
  };

  const handleEditToggle = (id) => {
    setFacilities((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isEditing: !f.isEditing } : f))
    );
  };

  const handleFieldChange = (id, field, value) => {
    setFacilities((prev) =>
      prev.map((f) => 
        f.id === id ? { ...f, [field]: value } : f // Update the specific field for the specific facility
      )
    );
  };

  const handleDelete = (id) => {
    setFacilities((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAddFacility = () => {
    setFacilities((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "", // Empty initially to allow user to type
        type: "", // Empty initially to allow user to type
        isOutdoors: "Yes",
        availability: "Available",
        isEditing: true,
      },
    ]);

    // Scroll to the bottom
    setTimeout(() => {
      tableRef.current?.scrollTo({ top: tableRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  const getAvailabilityClass = (status) => {
    switch (status) {
      case "Available":
        return "status available";
      case "Closed":
        return "status closed";
      case "Under Maintenance":
        return "status maintenance";
      default:
        return "status";
    }
  };

  return (
    <main className="manage-facilities">
      <div className="container">
        <Sidebar activeItem="manage facilities" />

        <main className="main-content">
          <header className="page-header">
            <h1>Manage Facilities</h1>
            <button className="add-btn" onClick={handleAddFacility}>Add New Facility</button>
          </header>

          <section className="table-section" ref={tableRef}>
            <table className="facilities-table">
              <thead>
                <tr>
                  <th>Facility Name</th>
                  <th>Type</th>
                  <th>Outdoors</th>
                  <th>Availability</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((f) => (
                  <tr key={f.id}>
                    <td>
                      {f.isEditing ? (
                        <input
                          type="text"
                          value={f.name} // Bind to the name value for editing
                          onChange={(e) => handleFieldChange(f.id, "name", e.target.value)} // Update name when changed
                          placeholder="Facility Name"
                        />
                      ) : (
                        f.name
                      )}
                    </td>
                    <td>
                      {f.isEditing ? (
                        <input
                          type="text"
                          value={f.type} // Bind to the type value for editing
                          onChange={(e) => handleFieldChange(f.id, "type", e.target.value)} // Update type when changed
                          placeholder="Type"
                        />
                      ) : (
                        f.type
                      )}
                    </td>
                    <td>
                      {f.isEditing ? (
                        <select
                          value={f.isOutdoors}
                          onChange={(e) => handleFieldChange(f.id, "isOutdoors", e.target.value)}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      ) : (
                        f.isOutdoors
                      )}
                    </td>
                    <td>
                      {f.isEditing ? (
                        <select
                          value={f.availability}
                          onChange={(e) => handleFieldChange(f.id, "availability", e.target.value)}
                        >
                          <option value="Available">Available</option>
                          <option value="Closed">Closed</option>
                          <option value="Under Maintenance">Under Maintenance</option>
                        </select>
                      ) : (
                        <span className={getAvailabilityClass(f.availability)}>{f.availability}</span>
                      )}
                    </td>
                    <td className="icon-actions">
                      <img
                        src={clockIcon}
                        alt="timeslots"
                        className="icon-btn"
                        onClick={() => navigate("/edit-timeslots")}
                      />
                      {f.isEditing ? (
                        <button
                          className="save-btn"
                          onClick={() => handleEditToggle(f.id)}
                        >
                          Save
                        </button>
                      ) : (
                        <img
                          src={editIcon}
                          alt="edit"
                          className="icon-btn"
                          onClick={() => handleEditToggle(f.id)}
                        />
                      )}
                      <img
                        src={binIcon}
                        alt="delete"
                        className="icon-btn"
                        onClick={() => handleDelete(f.id)}
                      />
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
