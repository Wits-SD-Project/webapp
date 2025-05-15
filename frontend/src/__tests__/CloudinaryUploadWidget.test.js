// src/__tests__/CloudinaryUploadWidget.test.js
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import CloudinaryUploadWidget from "../pages/dashboards/CloudinaryUploadWidget";

describe("CloudinaryUploadWidget", () => {
  let originalCloudinary;
  let cbRef;
  let mockWidget;

  beforeAll(() => {
    // Preserve any existing window.cloudinary
    originalCloudinary = window.cloudinary;
  });

  beforeEach(() => {
    cbRef = null;
    mockWidget = {
      open: jest.fn(),
    };
    window.cloudinary = {
      createUploadWidget: jest.fn((config, cb) => {
        cbRef = cb;
        return mockWidget;
      }),
    };
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  afterAll(() => {
    window.cloudinary = originalCloudinary;
  });

  test("initializes the Cloudinary widget on mount", () => {
    const config = { foo: "bar" };
    const onUpload = jest.fn();

    render(<CloudinaryUploadWidget uwConfig={config} onUpload={onUpload} />);

    // Should have called createUploadWidget with the same config
    expect(window.cloudinary.createUploadWidget).toHaveBeenCalledWith(
      config,
      expect.any(Function)
    );
    // And stored the callback
    expect(typeof cbRef).toBe("function");
  });

  test("opens the widget when clicking the button", () => {
    render(<CloudinaryUploadWidget uwConfig={{}} onUpload={jest.fn()} />);

    const btn = screen.getByRole("button", { name: /upload/i });
    fireEvent.click(btn);

    // widget.open should have been called
    expect(mockWidget.open).toHaveBeenCalled();
  });

  test("calls onUpload when widget reports success", () => {
    const onUpload = jest.fn();
    render(<CloudinaryUploadWidget uwConfig={{}} onUpload={onUpload} />);

    // simulate success event from the widget
    const fakeResult = {
      event: "success",
      info: { secure_url: "https://cdn.test/image.jpg" },
    };
    cbRef(null, fakeResult);

    expect(onUpload).toHaveBeenCalledWith("https://cdn.test/image.jpg");
  });

  test("removes click listener on unmount", () => {
    // spy on the button's add/removeEventListener
    const addSpy = jest.spyOn(HTMLButtonElement.prototype, "addEventListener");
    const removeSpy = jest.spyOn(
      HTMLButtonElement.prototype,
      "removeEventListener"
    );

    const { unmount } = render(
      <CloudinaryUploadWidget uwConfig={{}} onUpload={jest.fn()} />
    );

    // We should have added a click listener
    expect(addSpy).toHaveBeenCalledWith("click", expect.any(Function));

    // Unmount and expect the listener to be removed
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("click", expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
