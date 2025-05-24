// Import React hooks and utilities
import { useEffect, useRef, useState } from "react";
// Import components and assets
import Sidebar from "../../components/StaffSideBar.js";
import clockIcon from "../../assets/clock.png";
import editIcon from "../../assets/edit.png";
import binIcon from "../../assets/bin.png";
// Import styles
import "../../styles/staffManageFacilities.css";
// Import routing and utilities
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "../../firebase";
import { toast } from "react-toastify";
// Import modal components
import FacilityFormModal from "../../components/FacilityFormModal";
import FeatureFormModal from "../../components/FeatureFormModal.js";

export default function ManageFacilities() {
  // State management
  const [facilities, setFacilities] = useState([]); // List of facilities
  const [modalOpen, setModalOpen] = useState(false); // Facility form modal visibility
  const [originalFacilities, setOriginalFacilities] = useState({}); // Stores original values during edits
  const [featureModalOpen, setFeatureModalOpen] = useState(false); // Feature form modal visibility
  const [editFeatureModalOpen, setEditFeatureModalOpen] = useState(false); // Edit feature modal visibility
  const [tempFacilityData, setTempFacilityData] = useState(null); // Temporary storage for new facility data
  const [editingFacilityId, setEditingFacilityId] = useState(null); // Currently editing facility ID
  const [loading, setLoading] = useState(true); // Loading state

  // Modal control functions
  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  // Navigation and refs
  const navigate = useNavigate();
  const tableRef = useRef(null);

  /**
   * useEffect hook for initial data fetching
   * Runs once when component mounts (empty dependency array)
   */
  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const token = await getAuthToken();
        
        // Fetch facilities from backend API
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

        // Process and store facility data with editing flag
        const data = await res.json();
        setFacilities(data.facilities.map((f) => ({ ...f, isEditing: false })));
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("Failed to load facilities: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFacilities();
  }, []);

  /**
   * Update facility information in backend
   * @param {Object} facility - Facility data to update
   */
  const handleUpdateFacility = async (facility) => {
    try {
      const token = await getAuthToken();
      
      // Send update request to backend
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

      // Update local state with new data
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

  /**
   * Cancel editing a facility
   * @param {string} id - Facility ID to cancel editing for
   */
  const handleCancelEdit = (id) => {
    const facility = facilities.find((f) => f.id === id);

    if (facility.isNew) {
      // Remove new facility if canceled
      setFacilities((prev) => prev.filter((f) => f.id !== id));
    } else {
      // Restore original values
      setFacilities((prev) =>
        prev.map((f) =>
          f.id === id ? { ...originalFacilities[id], isEditing: false } : f
        )
      );

      // Clean up original values storage
      setOriginalFacilities((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

  /**
   * Toggle edit mode for a facility
   * @param {string} id - Facility ID to toggle edit mode
   */
  const handleEditToggle = (id) => {
    // Enable editing for the selected facility
    setFacilities((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isEditing: true } : f))
    );

    // Store original values if not already stored
    setOriginalFacilities((prev) => {
      const alreadyStored = prev[id];
      if (alreadyStored) return prev;
      const original = facilities.find((f) => f.id === id);
      return { ...prev, [id]: { ...original } };
    });
  };

  /**
   * Handle adding a new facility (first step - basic info)
   * @param {Object} formData - Basic facility information
   */
  const handleAddFacility = async (formData) => {
    setTempFacilityData(formData);
    setFeatureModalOpen(true);
    closeModal();
  };

  /**
   * Complete adding a new facility (second step - features)
   * @param {Object} featureData - Feature information for the new facility
   */
  const handleCompleteFacility = async (featureData) => {
    try {
      const token = await getAuthToken();
      // Combine basic info and features
      const completeData = {
        ...tempFacilityData,
        ...featureData,
        isOutdoors: tempFacilityData.isOutdoors === "Yes",
      };

      // Send complete facility data to backend
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

      // Add new facility to local state
      setFacilities((prev) => [
        ...prev,
        { ...data.facility, isEditing: false },
      ]);
      toast.success("Facility created successfully");
    } catch (err) {
      toast.error(err.message);
    } finally {
      // Clean up
      setFeatureModalOpen(false);
      setTempFacilityData(null);
    }
  };

  /**
   * Update facility features
   * @param {Object} featureData - New feature data
   */
  const handleUpdateFeatures = async (featureData) => {
    try {
      const token = await getAuthToken();
      const facility = facilities.find((f) => f.id === editingFacilityId);

      // Send feature update to backend
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

      // Update local state with new features
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
      // Clean up
      setEditFeatureModalOpen(false);
      setEditingFacilityId(null);
    }
  };

  /**
   * Delete a facility
   * @param {string} id - Facility ID to delete
   */
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

      // Remove facility from local state
      setFacilities((prev) => prev.filter((f) => f.id !== id));
      toast.success("Facility deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete facility");
    }
  };

  /**
   * Open feature editor for a facility
   * @param {string} id - Facility ID to edit features for
   */
  const handleEditFeatures = (id) => {
    setEditingFacilityId(id);
    setEditFeatureModalOpen(true);
  };

  /**
   * Get CSS class for availability status
   * @param {string} status - Availability status
   * @returns {string} CSS class name
   */
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

  // Loading state render
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

  // Main render
  return (
    <main className="manage-facilities">
      {/* Facility Form Modal */}
      <FacilityFormModal
        open={modalOpen}
        onClose={closeModal}
        onSubmit={handleAddFacility}
      />

      {/* Feature Form Modal (for new facilities) */}
      <FeatureFormModal
        open={featureModalOpen}
        onClose={() => {
          setFeatureModalOpen(false);
          setTempFacilityData(null);
        }}
        onSubmit={handleCompleteFacility}
        facilityType={tempFacilityData?.type || "General"}
      />

      {/* Feature Form Modal (for editing existing facilities) */}
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
        {/* Sidebar Navigation */}
        <Sidebar activeItem="manage facilities" />
        
        {/* Main Content Area */}
        <main className="main-content">
          {/* Page Header */}
          <header className="page-header">
            <h1>Manage Facilities</h1>
            <button className="add-btn" onClick={openModal}>
              Add New Facility
            </button>
          </header>

          {/* Facilities Table Section */}
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
                {/* Render each facility as a table row */}
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
                      {/* Timeslots navigation button */}
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
                      
                      {/* Edit Features button (hidden during editing) */}
                      {!f.isEditing && (
                        <button
                          className="features-btn"
                          onClick={() => handleEditFeatures(f.id)}
                        >
                          Edit Features
                        </button>
                      )}
                      
                      {/* Conditional render based on edit mode */}
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
                      
                      {/* Delete button */}
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
