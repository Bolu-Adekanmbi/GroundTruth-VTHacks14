import { render, screen } from "@testing-library/react";
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
});
