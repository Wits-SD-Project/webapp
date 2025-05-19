import { useEffect, useRef, useState } from "react";
import Sidebar from "../../components/StaffSideBar.js";
import clockIcon from "../../assets/clock.png";
import editIcon from "../../assets/edit.png"
import binIcon from "../../assets/bin.png";
import "../../styles/staffManageFacilities.css";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "../../firebase";
import { toast } from "react-toastify";
import FacilityFormModal from "../../components/FalicityFormModal";
import FeatureFormModal from "../../components/FeatureFormModal.js";

export default function ManageFacilities() {
  const [facilities, setFacilities] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [originalFacilities, setOriginalFacilities] = useState({});
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [editFeatureModalOpen, setEditFeatureModalOpen] = useState(false);
  const [tempFacilityData, setTempFacilityData] = useState(null);
  const [editingFacilityId, setEditingFacilityId] = useState(null);
  const [loading, setLoading] = useState(true);

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
        setFacilities(data.facilities.map((f) => ({ ...f, isEditing: false })));
      } catch (err) {
        console.log(err);
        toast.error("Failed to load facilities: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFacilities();
  }, []);
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
            description: facility.description,
            features: facility.features,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      setFacilities((prev) =>
        prev.map((f) =>
          f.id === facility.id ? { ...data.facility, isEditing: false } : f
        )
      );

      toast.success("Facility updated successfully");
    } catch (err) {
      console.error("Update facility error:", err);
      toast.error(err.message || "Failed to update facility");
    }
  };
   const handleCancelEdit = (id) => {
    const facility = facilities.find((f) => f.id === id);

    if (facility.isNew) {
      setFacilities((prev) => prev.filter((f) => f.id !== id));
    } else {
      setFacilities((prev) =>
        prev.map((f) =>
          f.id === id ? { ...originalFacilities[id], isEditing: false } : f
        )
      );

      setOriginalFacilities((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

   const handleEditToggle = (id) => {
    setFacilities((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isEditing: true } : f))
    );

    setOriginalFacilities((prev) => {
      const alreadyStored = prev[id];
      if (alreadyStored) return prev;
      const original = facilities.find((f) => f.id === id);
      return { ...prev, [id]: { ...original } };
    });
  };

  const handleAddFacility = async (formData) => {
    setTempFacilityData(formData);
    setFeatureModalOpen(true);
    closeModal();
  };

  const handleCompleteFacility = async (featureData) => {
    try {
      const token = await getAuthToken();
      const completeData = {
        ...tempFacilityData,
        ...featureData,
        isOutdoors: tempFacilityData.isOutdoors === "Yes",
      };

      console.log("Uploading facility:", completeData);

      const res = await fetch("http://localhost:8080/api/facilities/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(completeData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      console.log(data);
      setFacilities((prev) => [
        ...prev,
        { ...data.facility, isEditing: false },
      ]);
      toast.success("Facility created successfully");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setFeatureModalOpen(false);
      setTempFacilityData(null);
    }
  };

  const handleUpdateFeatures = async (featureData) => {
    try {
      const token = await getAuthToken();
      const facility = facilities.find((f) => f.id === editingFacilityId);

      const res = await fetch(
        `http://localhost:8080/api/facilities/updateFacility/${editingFacilityId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...facility,
            description: featureData.description,
            features: featureData.features,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      setFacilities((prev) =>
        prev.map((f) =>
          f.id === editingFacilityId
            ? { ...data.facility, isEditing: false }
            : f
        )
      );

      toast.success("Facility features updated successfully");
    } catch (err) {
      console.error("Update features error:", err);
      toast.error(err.message || "Failed to update features");
    } finally {
      setEditFeatureModalOpen(false);
      setEditingFacilityId(null);
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

  const handleEditFeatures = (id) => {
    setEditingFacilityId(id);
    setEditFeatureModalOpen(true);
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

  if (loading) {
    return (
      <div className="manage-facilities">
        <div className="container">
          <Sidebar activeItem="manage facilities" />
          <main className="main-content">
            <header className="page-header">
              <h1>Manage Facilities</h1>
              <button className="add-btn" disabled>
                Add New Facility
              </button>
            </header>
            <div className="loading-placeholder">
              <p>Loading facilities...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <main className="manage-facilities">
      <FacilityFormModal
        open={modalOpen}
        onClose={closeModal}
        onSubmit={handleAddFacility}
      />

      <FeatureFormModal
        open={featureModalOpen}
        onClose={() => {
          setFeatureModalOpen(false);
          setTempFacilityData(null);
        }}
        onSubmit={handleCompleteFacility}
        facilityType={tempFacilityData?.type || "General"}
      />

      <FeatureFormModal
        open={editFeatureModalOpen}
        onClose={() => {
          setEditFeatureModalOpen(false);
          setEditingFacilityId(null);
        }}
        onSubmit={handleUpdateFeatures}
        facilityType={
          facilities.find((f) => f.id === editingFacilityId)?.type || "General"
        }
        initialData={facilities.find((f) => f.id === editingFacilityId)}
        isEditMode={true}
      />

      <div className="container">
        <Sidebar activeItem="manage facilities" />
        <main className="main-content">
          <header className="page-header">
            <h1>Manage Facilities</h1>
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
                    <td>{f.name}</td>
                    <td>{f.type}</td>
                    <td>{f.isOutdoors}</td>
                    <td>
                      <span className={getAvailabilityClass(f.availability)}>
                        {f.availability}
                      </span>
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
                      {!f.isEditing && (
                        <button
                          className="features-btn"
                          onClick={() => handleEditFeatures(f.id)}
                        >
                          Edit Features
                        </button>
                      )}
                      {f.isEditing ? (
                        <>
                          <button
                            className="save-btn"
                            onClick={() => {
                              if (f.isNew) {
                                handleAddFacility(f);
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
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete this facility?"
                            )
                          ) {
                            handleDelete(f.id);
                          }
                        }}
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
