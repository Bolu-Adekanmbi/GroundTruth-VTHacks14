import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SegmentedControl } from "./SegmentedControl";

const options = [
  { value: "base", label: "Base" },
  { value: "scorched", label: "Scorched Nebraska" },
  { value: "disaster", label: "Disaster Response" }
] as const;

function TestSegmentedControl() {
  const [value, setValue] = useState<(typeof options)[number]["value"]>("base");

  return <SegmentedControl label="Scene mode" onChange={setValue} options={options} value={value} />;
}

describe("SegmentedControl", () => {
  it("changes the selected option on click", async () => {
    const user = userEvent.setup();
    render(<TestSegmentedControl />);

    await user.click(screen.getByRole("radio", { name: "Scorched Nebraska" }));

    expect(screen.getByRole("radio", { name: "Scorched Nebraska" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("supports arrow, home, and end keyboard navigation", async () => {
    const user = userEvent.setup();
    render(<TestSegmentedControl />);

    const base = screen.getByRole("radio", { name: "Base" });
    base.focus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Scorched Nebraska" })).toHaveAttribute(
      "aria-checked",
      "true"
    );

    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "Disaster Response" })).toHaveAttribute(
      "aria-checked",
      "true"
    );

    await user.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: "Base" })).toHaveAttribute("aria-checked", "true");
  });
});
