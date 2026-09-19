import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("App", () => {
  it("renders the GroundTruth workspace shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "GroundTruth" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Scene mode" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Capture and traits" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Evidence and output" })).toBeInTheDocument();
    expect(screen.getByText("Map initializes in Phase 5")).toBeInTheDocument();
    expect(screen.getByText("3D scene initializes in Phase 7")).toBeInTheDocument();
  });

  it("updates catalog-backed scene details when a sample is selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText("Curated example"), "willard-building");

    expect(screen.getByRole("combobox", { name: "Curated example" })).toHaveValue(
      "willard-building"
    );
    expect(screen.getByDisplayValue("640 Pollock Road, University Park, PA 16802")).toBeInTheDocument();
    expect(screen.getByText("Willard Building east view")).toBeInTheDocument();
    expect(screen.getByText("Concrete")).toBeInTheDocument();
    expect(screen.getByText("83%")).toBeInTheDocument();
  });
});
