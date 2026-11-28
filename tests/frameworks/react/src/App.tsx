import { useState } from "react";
import "cally";

// a function prop, which must be set as a property rather than an attribute
const isThirteenth = (date: Date) => date.getUTCDate() === 13;

export function App() {
  const [value, setValue] = useState("");

  return (
    <>
      <output>{value}</output>
      <button onClick={() => setValue("2024-03-20/2024-03-22")}>Select</button>

      <calendar-range
        locale="en-GB"
        months={2}
        focusedDate="2024-03-01"
        value={value}
        isDateDisallowed={isThirteenth}
        onchange={(event) => setValue((event.target as HTMLInputElement).value)}
      >
        <calendar-month />
        <calendar-month offset={1} />
      </calendar-range>
    </>
  );
}
