import { useEffect, useRef, useState } from "react";
import Sidebar from "../../components/StaffSideBar.js";
import clockIcon from "../../assets/clock.png";
import editIcon from "../../assets/edit.png";
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
          `${process.env.REACT_APP_API_BASE_URL}/api/facilities/staff-facilities`,
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

  const handleEditFeatures = (id) => {
    setEditingFacilityId(id);
    setEditFeatureModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/api/facilities/${id}`,
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
        onSubmit={() => {}}
      />

      <FeatureFormModal
        open={featureModalOpen}
        onClose={() => {
          setFeatureModalOpen(false);
          setTempFacilityData(null);
        }}
        onSubmit={() => {}}
        facilityType={tempFacilityData?.type || "General"}
      />

      <FeatureFormModal
        open={editFeatureModalOpen}
        onClose={() => {
          setEditFeatureModalOpen(false);
          setEditingFacilityId(null);
        }}
        onSubmit={() => {}}
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
                      <img
                        src={editIcon}
                        alt="edit features"
                        className="icon-btn"
                        onClick={() => handleEditFeatures(f.id)}
                      />
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
