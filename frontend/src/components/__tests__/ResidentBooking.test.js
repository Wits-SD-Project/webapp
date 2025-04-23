// src/components/__tests__/ResidentBooking.test.js
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import ResidentBooking from "../ResidentBooking"; // Adjust path

describe("ResidentBooking Component", () => {
  const renderComponent = () => {
    render(<ResidentBooking />);
  };

  test("renders initial state correctly", () => {
    renderComponent();
    expect(
      screen.getByRole("heading", { name: /book a sports facility/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/select facility/i)).toBeInTheDocument();
    // Details, Date, Slots, Confirm section should not be visible initially
    expect(
      screen.queryByRole("heading", { name: /facility details/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/select date/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /available time slots/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /confirm booking/i })
    ).not.toBeInTheDocument();
  });

  test("selecting a facility shows details, date input, and slots", async () => {
    renderComponent();
    const user = userEvent.setup();
    const facilitySelect = screen.getByLabelText(/select facility/i);

    // Select "Marks Cricket Ground" (assuming its value is 1 based on mock data)
    await user.selectOptions(facilitySelect, "1");

    expect(
      await screen.findByRole("heading", { name: /facility details/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Marks Cricket Ground/)).toBeInTheDocument();
    expect(screen.getByText(/Cricket Ground/)).toBeInTheDocument();
    expect(screen.getByText(/Yes/)).toBeInTheDocument(); // Outdoor: Yes

    expect(screen.getByLabelText(/select date/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /available time slots/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "09:00 - 10:00" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "10:00 - 11:00" })
    ).toBeInTheDocument();
  });

  test("selecting date shows the day of the week", async () => {
    renderComponent();
    const user = userEvent.setup();
    const facilitySelect = screen.getByLabelText(/select facility/i);
    await user.selectOptions(facilitySelect, "1"); // Select any facility first

    const dateInput = screen.getByLabelText(/select date/i);
    fireEvent.change(dateInput, { target: { value: "2025-04-28" } }); // A Monday

    expect(await screen.findByText(/monday/i)).toBeInTheDocument();
  });

  test("selecting a slot highlights it", async () => {
    renderComponent();
    const user = userEvent.setup();
    const facilitySelect = screen.getByLabelText(/select facility/i);
    await user.selectOptions(facilitySelect, "1"); // Select Marks Cricket Ground

    const slotButton1 = screen.getByRole("button", { name: "09:00 - 10:00" });
    const slotButton2 = screen.getByRole("button", { name: "10:00 - 11:00" });

    expect(slotButton1).not.toHaveClass("selected");
    await user.click(slotButton1);
    expect(slotButton1).toHaveClass("selected");
    expect(slotButton2).not.toHaveClass("selected");

    await user.click(slotButton2);
    expect(slotButton2).toHaveClass("selected");
    expect(slotButton1).not.toHaveClass("selected");
  });

  test("selecting facility, date, and slot shows confirmation section", async () => {
    renderComponent();
    const user = userEvent.setup();
    const facilitySelect = screen.getByLabelText(/select facility/i);
    await user.selectOptions(facilitySelect, "3"); // Tennis Court A

    const dateInput = screen.getByLabelText(/select date/i);
    fireEvent.change(dateInput, { target: { value: "2025-04-29" } }); // A Tuesday

    const slotButton = screen.getByRole("button", { name: "14:00 - 15:00" });
    await user.click(slotButton);

    // Confirmation section should appear
    expect(
      await screen.findByRole("heading", { name: /confirm booking/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Tennis Court A/)).toBeInTheDocument();
    expect(screen.getByText("2025-04-29")).toBeInTheDocument();
    expect(screen.getByText(/tuesday/i)).toBeInTheDocument();
    expect(screen.getByText("14:00 - 15:00")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /book slot/i })
    ).toBeInTheDocument();
  });

  test("submitting booking shows pending status", async () => {
    renderComponent();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(/select facility/i), "3");
    fireEvent.change(screen.getByLabelText(/select date/i), {
      target: { value: "2025-04-29" },
    });
    await user.click(screen.getByRole("button", { name: "14:00 - 15:00" }));

    const submitButton = screen.getByRole("button", { name: /book slot/i });
    await user.click(submitButton);

    expect(
      await screen.findByRole("heading", { name: /booking status/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/your booking is/i)).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  test("does not show confirmation or allow submit if parts are missing", async () => {
    renderComponent();
    const user = userEvent.setup();

    // Only select facility
    await user.selectOptions(screen.getByLabelText(/select facility/i), "1");
    expect(
      screen.queryByRole("heading", { name: /confirm booking/i })
    ).not.toBeInTheDocument();

    // Add date, still no slot
    fireEvent.change(screen.getByLabelText(/select date/i), {
      target: { value: "2025-04-28" },
    });
    expect(
      screen.queryByRole("heading", { name: /confirm booking/i })
    ).not.toBeInTheDocument();

    // Select slot
    await user.click(screen.getByRole("button", { name: "09:00 - 10:00" }));
    expect(
      await screen.findByRole("heading", { name: /confirm booking/i })
    ).toBeInTheDocument(); // Now it appears

    // Attempt submit (no preventDefault check needed as it's basic state logic)
    const submitButton = screen.getByRole("button", { name: /book slot/i });
    await user.click(submitButton);
    expect(await screen.findByText(/pending/i)).toBeInTheDocument(); // Submit works now
  });
});
