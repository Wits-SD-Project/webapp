import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ResidentBooking from "../components/ResidentBooking";

/* tiny helpers */
const select = (el, value) => fireEvent.change(el, { target: { value } });
const click = (text) => fireEvent.click(screen.getByText(text));

describe("ResidentBooking component – stable tests", () => {
  beforeEach(() => render(<ResidentBooking />));

  /* 1 ─ initial render */
  it("shows heading only on first load", () => {
    expect(
      screen.getByRole("heading", { name: /book a sports facility/i })
    ).toBeInTheDocument();
    const oldSlot = screen.queryByText("09:00 - 10:00");
    expect(oldSlot).toBeNull(); // it disappeared after facility change
  });

  /* 2 ─ happy path */
  it("lets user book and shows pending status", () => {
    // choose facility #1
    select(screen.getByRole("combobox"), "1");

    // verify specific facility header exists (use *all* to avoid clash with <option>)
    const detailsParas = screen.getAllByText(/marks cricket ground/i);
    expect(detailsParas.length).toBeGreaterThan(0); // at least one occurrence

    // choose date
    const dateInput = screen.getByRole("textbox", { name: "" }); // <input type="date">
    fireEvent.change(dateInput, { target: { value: "2025-05-15" } }); // Thursday

    // choose slot
    click("09:00 - 10:00");
    expect(screen.getByText("09:00 - 10:00")).toHaveClass("selected");

    // submit
    fireEvent.submit(screen.getByRole("button", { name: /book slot/i }));
    expect(screen.getByText(/your booking is/i)).toHaveTextContent(/pending/i);
  });

  /* 3 ─ guard: missing date ⇒ no status + no submit button */
  it("does not create booking if date is missing", () => {
    // facility then slot
    select(screen.getByRole("combobox"), "2");
    click("11:00 - 12:00");

    // confirm form should NOT appear → no Book Slot button
    expect(screen.queryByRole("button", { name: /book slot/i })).toBeNull();
    expect(screen.queryByText(/your booking is/i)).toBeNull();
  });

  /* 4 ─ changing facility resets previous selection */
  it("change facility clears previously selected slot", () => {
    // first facility + slot
    select(screen.getByRole("combobox"), "1");
    click("09:00 - 10:00");
    expect(screen.getByText("09:00 - 10:00")).toHaveClass("selected");

    // switch to facility 3
    select(screen.getByRole("combobox"), "3");

    // old slot button is now gone from DOM entirely
    expect(screen.queryByText("09:00 - 10:00")).toBeNull();
  });
});
