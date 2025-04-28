import { useEffect, useRef, useState } from "react";
import Sidebar from "../../components/SideBar";
import clockIcon from "../../assets/clock.png";
import editIcon from "../../assets/edit.png";
import binIcon from "../../assets/bin.png";
import "../../styles/staffManageFacilities.css";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "../../firebase";
import { auth } from "../../firebase";
import { toast } from "react-toastify";
import FacilityFormModal from "./FalicityFormModal";

export default function ManageFacilities() {
  const [facilities, setFacilities] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [originalFacilities, setOriginalFacilities] = useState({});
  const [facilityName, setFacilityName] = useState("");
  const [facilityType, setFacilityType] = useState("");
  const [facilityDescription, setFacilityDescription] = useState("");
  // const [isDeleting, setIsDeleting] = useState(false);

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const navigate = useNavigate();
  const tableRef = useRef(null);

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(
          "http://localhost:8080/api/facilities/staff-facilities",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch facilities");

        const data = await res.json();
        // Add isEditing flag to all facilities
        setFacilities(data.facilities.map((f) => ({ ...f, isEditing: false })));
      } catch (err) {
        console.log(err);
        toast.error("Failed to load facilities: " + err.message);
      }
    };

    fetchFacilities();
  }, []);
  const handleAddFacility = async (formData) => {
    /* formData === {
         name, type, isOutdoors, availability, location, imageUrls:[...]
       } */
    try {
      const token = await getAuthToken();
      console.log(formData);
      const res = await fetch("http://localhost:8080/api/facilities/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          ...formData,
          isOutdoors: formData.isOutdoors === "Yes",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setFacilities((prev) => [
        ...prev,
        { ...data.facility, isEditing: false },
      ]);
      toast.success("Facility created");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreateFacility = async (facilityData) => {
    try {
      const token = await getAuthToken();
      const res = await fetch("http://localhost:8080/api/facilities/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: facilityData.name,
          type: facilityData.type,
          isOutdoors: facilityData.isOutdoors === "Yes",
          availability: facilityData.availability,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Replace temporary facility with the one from the server
      setFacilities((prev) =>
        prev.map((f) =>
          f.id === facilityData.id ? { ...data.facility, isEditing: false } : f
        )
      );

      toast(data.message);
    } catch (err) {
      toast(err.message);
    }
  };

  const handleUpdateFacility = async (facility) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(
        `http://localhost:8080/api/facilities/updateFacility/${facility.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: facility.name,
            type: facility.type,
            isOutdoors: facility.isOutdoors === "Yes",
            availability: facility.availability,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      // Update local state with modified facility
      setFacilities((prev) =>
        prev.map((f) =>
          f.id === facility.id ? { ...data.facility, isEditing: false } : f
        )
      );

      toast.success(data.message);
    } catch (err) {
      console.error("Update facility error:", err);
      toast.error(err.message || "Failed to update facility");
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `http://localhost:8080/api/facilities/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Delete failed");
      }

      setFacilities((prev) => prev.filter((f) => f.id !== id));
      toast.success("Facility deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete facility");
    }
  };

  const confirmDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this facility?")) {
      handleDelete(id);
    }
  };

  const handleEditToggle = (id) => {
    setFacilities((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isEditing: true } : f))
    );

    // Store a backup only if not already stored
    setOriginalFacilities((prev) => {
      const alreadyStored = prev[id];
      if (alreadyStored) return prev;
      const original = facilities.find((f) => f.id === id);
      return { ...prev, [id]: { ...original } };
    });
  };

  const handleCancelEdit = (id) => {
    const facility = facilities.find((f) => f.id === id);

    if (facility.isNew) {
      // Remove unsaved new facility
      setFacilities((prev) => prev.filter((f) => f.id !== id));
    } else {
      // Restore backup and exit edit mode
      setFacilities((prev) =>
        prev.map((f) =>
          f.id === id ? { ...originalFacilities[id], isEditing: false } : f
        )
      );

      // Remove backup from memory
      setOriginalFacilities((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

  const handleFieldChange = (id, field, value) => {
    setFacilities((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  // const handleAddFacility = () => {
  //   setFacilities((prev) => [
  //     ...prev,
  //     {
  //       id: Date.now().toString(),
  //       name: "",
  //       type: "",
  //       isOutdoors: "Yes",
  //       availability: "Available",
  //       isEditing: true,
  //       isNew: true,
  //     },
  //   ]);

  //   setTimeout(() => {
  //     tableRef.current?.scrollTo({
  //       top: tableRef.current.scrollHeight,
  //       behavior: "smooth",
  //     });
  //   }, 100);
  // };

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
      <FacilityFormModal
        open={modalOpen}
        onClose={closeModal}
        onSubmit={handleAddFacility}
      />
      <div className="container">
        <Sidebar activeItem="manage facilities" />
        <main className="main-content">
          <header className="page-header">
            <h1>Manage Facilities</h1>
            {/* <button className="add-btn" onClick={handleAddFacility}>
              Add New Facility
            </button> */}
            <button className="add-btn" onClick={openModal}>
              Add New Facility
            </button>
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
                          value={f.name}
                          onChange={(e) =>
                            handleFieldChange(f.id, "name", e.target.value)
                          }
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
                          value={f.type}
                          onChange={(e) =>
                            handleFieldChange(f.id, "type", e.target.value)
                          }
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
                          onChange={(e) =>
                            handleFieldChange(
                              f.id,
                              "isOutdoors",
                              e.target.value
                            )
                          }
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
                          onChange={(e) =>
                            handleFieldChange(
                              f.id,
                              "availability",
                              e.target.value
                            )
                          }
                        >
                          <option value="Available">Available</option>
                          <option value="Closed">Closed</option>
                          <option value="Under Maintenance">
                            Under Maintenance
                          </option>
                        </select>
                      ) : (
                        <span className={getAvailabilityClass(f.availability)}>
                          {f.availability}
                        </span>
                      )}
                    </td>
                    <td className="icon-actions">
                      <img
                        src={clockIcon}
                        alt="timeslots"
                        className="icon-btn"
                        onClick={() =>
                          navigate(`/staff-edit-time-slots/${f.id}`, {
                            state: { facilityName: f.name },
                          })
                        }
                      />
                      {f.isEditing ? (
                        <>
                          <button
                            className="save-btn"
                            onClick={() => {
                              if (f.isNew) {
                                handleCreateFacility(f);
                              } else {
                                handleUpdateFacility(f);
                              }
                            }}
                          >
                            Save
                          </button>
                          <button
                            className="cancel-btn"
                            onClick={() => handleCancelEdit(f.id)}
                          >
                            Cancel
                          </button>
                        </>
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
                        onClick={() => confirmDelete(f.id)}
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
