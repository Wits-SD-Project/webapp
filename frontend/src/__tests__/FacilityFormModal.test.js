import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import FacilityFormModal from "../pages/dashboards/FalicityFormModal";

/* ───── Cloudinary widget stub ───── */
jest.mock("../pages/dashboards/CloudinaryUploadWidget", () => {
  // props: { onUpload }
  return ({ onUpload }) => (
    <button
      data-testid="upload-btn"
      onClick={() => onUpload("http://img.test/img.png")}
    >
      Upload
    </button>
  );
});

/* ───── toast spy ───── */
jest.mock("react-toastify", () => {
  const toast = { success: jest.fn(), error: jest.fn() };
  return { toast };
});
import { toast } from "react-toastify";

/* helpers */
const renderModal = (props = {}) =>
  render(
    <FacilityFormModal
      open={true}
      onClose={props.onClose || jest.fn()}
      onSubmit={props.onSubmit || jest.fn()}
    />
  );

/* ───── tests ───── */
describe("FacilityFormModal", () => {
  beforeEach(() => jest.clearAllMocks());

  test("happy‑path save calls onSubmit with form data", () => {
    const onSubmit = jest.fn();
    const onClose = jest.fn();
    renderModal({ onSubmit, onClose });

    fireEvent.change(screen.getByLabelText(/Facility name/i), {
      target: { value: "Center Court" },
    });
    fireEvent.change(screen.getByLabelText(/Type/i), {
      target: { value: "Tennis Court" },
    });
    fireEvent.change(screen.getByLabelText(/Location/i), {
      target: { value: "Block B" },
    });

    fireEvent.click(screen.getByTestId("upload-btn")); // adds 1 image

    fireEvent.click(screen.getByRole("button", { name: /Save ✅/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Center Court",
        type: "Tennis Court",
        isOutdoors: "Yes", // default
        availability: "Available", // default
        location: "Block B",
        imageUrls: ["http://img.test/img.png"],
      })
    );
    expect(onClose).toHaveBeenCalled(); // modal closed
  });

  test("validation: missing fields triggers toast.error", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /Save ✅/i }));

    expect(toast.error).toHaveBeenCalledWith(
      "Facility name and type are required 🤷‍♂️"
    );
  });

  test("upload button adds thumbnail and delete icon removes it", () => {
    renderModal();

    fireEvent.click(screen.getByTestId("upload-btn"));
    const avatar = screen.getByRole("img"); // the <Avatar> has role 'img'
    expect(avatar).toBeInTheDocument();

    // delete icon is the only button inside the avatar
    const delBtn = within(avatar).getByRole("button");
    fireEvent.click(delBtn);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
