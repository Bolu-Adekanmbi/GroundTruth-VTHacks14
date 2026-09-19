import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renders the GroundTruth placeholder", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "GroundTruth" })).toBeInTheDocument();
    expect(screen.getByText(/field-to-scene workspace/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /check api health/i })).toHaveAttribute(
      "href",
      "/api/health"
    );
  });
});
