import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, vi } from "vitest";
import { useSceneStore } from "../store/scene-store";
import { App } from "./App";

let revokeObjectURLMock: ReturnType<typeof vi.fn>;

function imageFile(name: string, type = "image/jpeg", content = "photo") {
  return new File([content], name, { type });
}

describe("App", () => {
  beforeEach(() => {
    revokeObjectURLMock = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn((file: File) => `blob:app-${file.name}`)
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURLMock
    });
    useSceneStore.getState().resetSession();
  });

  it("renders the GroundTruth workspace shell", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "GroundTruth" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Scene mode" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Capture and traits" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Evidence and output" })).toBeInTheDocument();
    expect(screen.getByLabelText("Photo upload")).toBeInTheDocument();
    expect(await screen.findByLabelText("GIS map with active footprint")).toBeInTheDocument();
    expect(screen.getByLabelText("GIS metadata")).toBeInTheDocument();
    expect(await screen.findByLabelText("3D scene unavailable")).toBeInTheDocument();
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
    expect(screen.getByText("83% evidence-backed")).toBeInTheDocument();
    expect(screen.getAllByText("40.7958, -77.8644").length).toBeGreaterThan(0);
  });

  it("accepts custom uploads, rejects invalid files, and keeps truthful generation status", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("Address"));
    await user.type(screen.getByLabelText("Address"), "55 Demo Lane");
    fireEvent.drop(screen.getByText("Drop or choose JPEG, PNG, or WebP photos"), {
      dataTransfer: {
        files: [imageFile("front.jpg"), imageFile("notes.txt", "text/plain")]
      }
    });

    expect(screen.getByRole("combobox", { name: "Curated example" })).toHaveValue(
      "custom-session"
    );
    expect(screen.getByText("55 Demo Lane")).toBeInTheDocument();
    expect(screen.getByText("notes.txt is not a JPEG, PNG, or WebP image.")).toBeInTheDocument();
    expect(screen.getAllByText("Assumed; review required").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Generate scene" }));

    expect(await screen.findByText("Manual placement required")).toBeInTheDocument();
    expect(screen.getByText("Using manual-rectangle geometry")).toBeInTheDocument();
  });

  it("removes custom evidence and restores curated state when switching samples", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.upload(screen.getByLabelText("Photo upload"), [
      imageFile("front.jpg"),
      imageFile("side.png", "image/png")
    ]);
    await user.click(screen.getByRole("button", { name: "Remove User source photo 1" }));

    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:app-front.jpg");
    expect(screen.queryByLabelText("Select User source photo 1")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Curated example" }), "willard-building");

    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:app-side.png");
    expect(screen.getByDisplayValue("640 Pollock Road, University Park, PA 16802")).toBeInTheDocument();
    expect(screen.getByText("Willard Building east view")).toBeInTheDocument();
  });

  it("opens selected evidence in a navigable focused viewer", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.upload(screen.getByLabelText("Photo upload"), [
      imageFile("front.jpg"),
      imageFile("side.jpg")
    ]);
    await user.click(screen.getByRole("button", { name: "Expand User source photo 1" }));

    expect(screen.getByRole("dialog", { name: "Expanded evidence photo" })).toBeInTheDocument();
    expect(screen.getAllByAltText("User-uploaded source photo 1.")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Next evidence photo" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("User source photo 2");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Expanded evidence photo" })).not.toBeInTheDocument();
  });

  it("confirms reset only when user-uploaded evidence would be lost", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Reset session" }));

    expect(confirmSpy).not.toHaveBeenCalled();

    await user.upload(screen.getByLabelText("Photo upload"), [imageFile("front.jpg")]);
    await user.click(screen.getByRole("button", { name: "Reset session" }));

    expect(confirmSpy).toHaveBeenCalledWith("Reset the session and remove uploaded photo previews?");
    expect(screen.getByRole("combobox", { name: "Curated example" })).toHaveValue(
      "custom-session"
    );

    confirmSpy.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Reset session" }));

    expect(screen.getByRole("combobox", { name: "Curated example" })).toHaveValue("burruss-hall");
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:app-front.jpg");
  });

  it("edits traits through canonical state and restores the selected seed", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.change(screen.getByLabelText("Floors"), { target: { value: "7" } });
    await user.selectOptions(screen.getByLabelText("Material"), "metal");

    expect(useSceneStore.getState().activeProject.building.floors).toBe(7);
    expect(useSceneStore.getState().activeProject.building.material).toBe("metal");
    expect(screen.getAllByText("Manually edited")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Reset Floors" }));
    expect(useSceneStore.getState().activeProject.building.floors).toBe(5);

    await user.click(screen.getByRole("button", { name: "Reset scene edits" }));
    expect(useSceneStore.getState().activeProject.building.material).toBe("brick");
  });

  it("keeps facade color and visible-facade window density as editable scene traits", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.upload(screen.getByLabelText("Photo upload"), [imageFile("front.jpg")]);
    fireEvent.change(screen.getByLabelText("Facade color"), { target: { value: "#9a5b45" } });
    fireEvent.change(screen.getByLabelText("Windows across visible facade"), { target: { value: "8" } });

    expect(useSceneStore.getState().activeProject.building.facadeColor).toBe("#9a5b45");
    expect(useSceneStore.getState().activeProject.building.windowColumns).toBe(8);
  });

  it("keeps visible facade modules explicit and editable", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByLabelText("Canopy"));
    await user.click(screen.getByLabelText("Portico"));

    expect(useSceneStore.getState().activeProject.building.facadeModules).toEqual(["canopy", "portico"]);
  });

  it("shows generated scorched controls without changing source traits", async () => {
    const user = userEvent.setup();
    render(<App />);
    const sourceFloors = useSceneStore.getState().activeProject.building.floors;

    await user.click(screen.getByRole("radio", { name: "Scorched Nebraska" }));
    fireEvent.change(screen.getByLabelText("Scorch intensity"), { target: { value: "0.9" } });

    expect(screen.getByText("Generated scenario attributes")).toBeInTheDocument();
    expect(screen.getByText("Heavy fire damage")).toBeInTheDocument();
    expect(useSceneStore.getState().activeProject.building.floors).toBe(sourceFloors);
    expect(useSceneStore.getState().activeProject.scenario.scorched.scorchIntensity).toBe(0.9);
  });

  it("shows operational Disaster controls with a generated, editable responder summary", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("radio", { name: "Disaster Response" }));
    await user.selectOptions(screen.getByLabelText("Damage type"), "fire");
    fireEvent.change(screen.getByLabelText("Damage severity"), { target: { value: "0.6" } });
    await user.click(screen.getByLabelText("Primary entrance blocked"));

    expect(screen.getByLabelText("Disaster overlay legend")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Requires verification/)).toBeInTheDocument();
    expect(useSceneStore.getState().activeProject.scenario.disaster.blockedEntrances).toEqual(["primary"]);
  });

  it("offers an active-scenario GLB download alongside GIS exports", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Download GLB 3D model" })).toBeEnabled();
    expect(screen.getByText("glTF 2.0 binary · meters · Y-up · active scenario")).toBeInTheDocument();
  });
});
