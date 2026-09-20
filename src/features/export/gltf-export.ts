import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Scene,
  Shape,
  SphereGeometry
} from "three";
import type { SceneProject } from "../../../shared/scene-schema";
import { buildDisasterPlan } from "../scene/disaster-plan";
import { buildScenePlan, getMaterialColor, type ScenePlan } from "../scene/scene-plan";
import { buildScorchedPlan, type ScorchedPlan } from "../scene/scorched-plan";

const GLB_MIME_TYPE = "model/gltf-binary";

export function buildGlbScene(project: SceneProject) {
  const plan = buildScenePlan(project);
  const scorchedPlan = project.scenario.activeMode === "scorched" ? buildScorchedPlan(project, plan) : null;
  const disasterPlan = project.scenario.activeMode === "disaster" ? buildDisasterPlan(project, plan) : null;
  const scene = new Scene();
  scene.name = "GroundTruthScene";
  scene.userData = {
    asset_generator: "GroundTruth",
    scene_id: project.id,
    scenario_mode: project.scenario.activeMode,
    units: "meters",
    up_axis: "Y",
    coordinate_system: "local tangent plane; X east, Y up, Z south"
  };

  const building = new Group();
  building.name = "Building";
  building.userData = { building_type: project.building.buildingType, height_m: plan.heightM, footprint_source: project.footprint.source };
  building.add(createBuildingMass(plan, Boolean(scorchedPlan)));
  building.add(createStoneFacade(plan, Boolean(scorchedPlan)));
  building.add(createWindows(plan, Boolean(scorchedPlan)));
  building.add(createWindowFrames(plan, Boolean(scorchedPlan)));
  building.add(createArchitecturalDetails(plan));
  building.add(createEntrance(plan));
  building.add(createFacadeModules(plan));
  building.add(createRoof(plan));
  scene.add(building);

  if (scorchedPlan) scene.add(createScorchedGroup(scorchedPlan));
  if (disasterPlan) scene.add(createDisasterGroup(disasterPlan, plan));

  return scene;
}

function createStoneFacade(plan: ScenePlan, scorched: boolean) {
  const group = new Group();
  group.name = "HokieStoneFacade";
  const colors = scorched
    ? ["#443c35", "#57493d", "#332f2a", "#625346"]
    : ["#8b877b", "#a39d8e", "#77756d", "#b2aa98"];
  colors.forEach((color, tone) => addTransforms(group, `StoneTone${tone + 1}`, plan.stoneBlocks.filter((block) => block.tone === tone), color, [1, 1, 1]));
  return group;
}

export async function buildGlbExport(project: SceneProject): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(buildGlbScene(project), {
    binary: true,
    onlyVisible: true,
    includeCustomExtensions: false
  });

  if (!(result instanceof ArrayBuffer) || result.byteLength === 0) {
    throw new Error("GLB export did not produce binary data.");
  }
  return result;
}

export function getGlbFilename(project: SceneProject) {
  return `groundtruth-${slugify(project.name || project.id)}-${project.scenario.activeMode}.glb`;
}

export function downloadGlb(filename: string, binary: ArrayBuffer) {
  const blob = new Blob([binary], { type: GLB_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createBuildingMass(plan: ScenePlan, scorched: boolean) {
  const shape = new Shape();
  plan.outline.forEach((point, index) => index === 0 ? shape.moveTo(point.x, -point.z) : shape.lineTo(point.x, -point.z));
  shape.closePath();
  const mesh = new Mesh(
    new ExtrudeGeometry(shape, { depth: plan.heightM, bevelEnabled: false }),
    new MeshStandardMaterial({ color: scorched ? "#4c403b" : getMaterialColor(plan.material, plan.facadeColor), metalness: plan.material === "metal" ? 0.42 : 0.05, roughness: 0.9 })
  );
  mesh.name = "BuildingMass";
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function createWindows(plan: ScenePlan, scorched: boolean) {
  const group = new Group();
  group.name = "Windows";
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshStandardMaterial({ color: scorched ? "#1c2223" : "#d5e7e6", emissive: scorched ? "#080b0b" : "#203a3b", emissiveIntensity: scorched ? 0.03 : 0.16, metalness: 0.12, roughness: scorched ? 0.78 : 0.22 });
  plan.windows.forEach((window, index) => {
    const mesh = new Mesh(geometry, material);
    mesh.name = `Window_${index + 1}`;
    mesh.position.set(...window.position);
    mesh.rotation.y = window.yawRad;
    mesh.scale.set(...window.scale);
    group.add(mesh);
  });
  return group;
}

function createEntrance(plan: ScenePlan) {
  const mesh = new Mesh(new BoxGeometry(3.2, 2.7, 0.42), new MeshStandardMaterial({ color: "#263639", metalness: 0.18, roughness: 0.48 }));
  mesh.name = "PrimaryEntrance";
  mesh.position.set(...plan.entrance.position);
  mesh.rotation.y = plan.entrance.yawRad;
  return mesh;
}

function createWindowFrames(plan: ScenePlan, scorched: boolean) {
  const group = new Group();
  group.name = "WindowFrames";
  const material = new MeshStandardMaterial({ color: scorched ? "#211b18" : "#334443", roughness: 0.55, metalness: 0.16 });
  plan.windows.forEach((window, index) => {
    const tangent = { x: Math.cos(window.yawRad), z: -Math.sin(window.yawRad) };
    [-1, 1].forEach((side) => {
      const frame = new Mesh(new BoxGeometry(0.09, window.scale[1] + 0.18, 0.1), material);
      frame.name = `WindowFrameVertical_${index + 1}_${side > 0 ? "R" : "L"}`;
      frame.position.set(window.position[0] + tangent.x * window.scale[0] * 0.52 * side, window.position[1], window.position[2] + tangent.z * window.scale[0] * 0.52 * side);
      frame.rotation.y = window.yawRad;
      group.add(frame);
    });
    [-1, 1].forEach((side) => {
      const frame = new Mesh(new BoxGeometry(window.scale[0] + 0.18, 0.09, 0.1), material);
      frame.name = `WindowFrameHorizontal_${index + 1}_${side > 0 ? "T" : "B"}`;
      frame.position.set(window.position[0], window.position[1] + window.scale[1] * 0.52 * side, window.position[2]);
      frame.rotation.y = window.yawRad;
      group.add(frame);
    });
  });
  return group;
}

function createArchitecturalDetails(plan: ScenePlan) {
  const group = new Group();
  group.name = "ArchitecturalDetails";
  addTransforms(group, "FacadeBands", plan.facadeBands, "#78817a", [1, 1, 1]);
  if (plan.roofType === "flat") addTransforms(group, "ParapetEdges", plan.parapetEdges, "#495754", [1, 1, 1]);
  addTransforms(group, "EntranceSteps", plan.entranceSteps, "#68706b", [1, 1, 1]);
  return group;
}

function createFacadeModules(plan: ScenePlan) {
  const group = new Group();
  group.name = "VisibleFacadeModules";
  plan.facadeModules.forEach((module, index) => {
    const mesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial({ color: module.type === "canopy" ? "#3c4a49" : "#7a6759", roughness: 0.82 })
    );
    mesh.name = `${module.type}_${index + 1}`;
    mesh.position.set(...module.position);
    mesh.rotation.y = module.yawRad;
    mesh.scale.set(...module.scale);
    group.add(mesh);
  });
  return group;
}

function createRoof(plan: ScenePlan) {
  if (plan.roofType === "flat") {
    const shape = new Shape();
    plan.outline.forEach((point, index) => index === 0 ? shape.moveTo(point.x, -point.z) : shape.lineTo(point.x, -point.z));
    shape.closePath();
    const mesh = new Mesh(new ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false }), new MeshStandardMaterial({ color: "#4d5755", roughness: 0.86 }));
    mesh.name = "Roof";
    mesh.position.set(0, plan.heightM, 0);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }
  const ridgeHeight = Math.min(7, Math.max(2.4, plan.heightM * 0.18));
  const centerX = (plan.bounds.minX + plan.bounds.maxX) / 2;
  const centerZ = (plan.bounds.minZ + plan.bounds.maxZ) / 2;
  const longOnX = plan.bounds.width >= plan.bounds.depth;
  const ridgeFor = (point: { x: number; z: number }): [number, number, number] => plan.roofType === "hip"
    ? [centerX, plan.heightM + ridgeHeight, centerZ]
    : [longOnX ? point.x : centerX, plan.heightM + ridgeHeight, longOnX ? centerZ : point.z];
  const vertices: number[] = [];
  plan.outline.forEach((point, index) => {
    const next = plan.outline[(index + 1) % plan.outline.length];
    const ridgeA = ridgeFor(point);
    const ridgeB = ridgeFor(next);
    vertices.push(point.x, plan.heightM, point.z, next.x, plan.heightM, next.z, ...ridgeB, point.x, plan.heightM, point.z, ...ridgeB, ...ridgeA);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: "#55615d", roughness: 0.74, side: DoubleSide }));
  mesh.name = "Roof";
  return mesh;
}

function createScorchedGroup(plan: ScorchedPlan) {
  const group = new Group();
  group.name = "ScorchedScenario";
  addTransforms(group, "BoardedWindows", plan.boardedWindows, "#76543a", [1, 1, 1]);
  addTransforms(group, "BrokenWindows", plan.brokenWindows, "#101516", [1, 1, 1]);
  addTransforms(group, "RoofDamage", plan.roofDamage, "#241916", [1, 1, 1]);
  addTransforms(group, "Debris", plan.debris, "#6b6259", [1, 1, 1]);
  addTransforms(group, "ScorchPatches", plan.scorchPatches, "#241916", [1, 1, 0.04], true);
  addTransforms(group, "DecayPatches", plan.decayPatches, "#6b6256", [1, 1, 1]);
  addTransforms(group, "Overgrowth", plan.overgrowth, "#4f9147", [0.55, 1, 0.55], false, "cone");
  addTransforms(group, "FacadeVines", plan.facadeVines, "#39713d", [1, 1, 1]);
  addTransforms(group, "Embers", plan.embers, "#ff5a1f", [1, 1, 1], false, "sphere");
  return group;
}

function addTransforms(group: Group, name: string, transforms: { position: [number, number, number]; scale: [number, number, number]; yawRad: number; rotation?: [number, number, number]; }[], color: string, dimensions: [number, number, number], transparent = false, kind: "box" | "cone" | "sphere" = "box") {
  const node = new Group();
  node.name = name;
  const geometry = kind === "cone"
    ? new ConeGeometry(dimensions[0], dimensions[1], 7)
    : kind === "sphere" ? new SphereGeometry(dimensions[0], 12, 8) : new BoxGeometry(...dimensions);
  const material = transparent ? new MeshBasicMaterial({ color, transparent: true, opacity: 0.78 }) : new MeshStandardMaterial({ color, roughness: 0.85 });
  transforms.forEach((transform, index) => {
    const mesh = new Mesh(geometry, material);
    mesh.name = `${name}_${index + 1}`;
    mesh.position.set(...transform.position);
    if (transform.rotation) mesh.rotation.set(...transform.rotation);
    else mesh.rotation.y = transform.yawRad;
    mesh.scale.set(...transform.scale);
    node.add(mesh);
  });
  group.add(node);
}

function createDisasterGroup(disaster: ReturnType<typeof buildDisasterPlan>, scene: ScenePlan) {
  const group = new Group();
  group.name = "DisasterResponseScenario";
  group.userData = { access_status: disaster.accessStatus, damage_type: disaster.operational.damageType, severity: disaster.operational.severity };
  if (disaster.hazardZone.active) {
    const hazard = new Mesh(new BoxGeometry(scene.bounds.width * 1.3, 0.08, scene.bounds.depth * 1.3), new MeshBasicMaterial({ color: "#e74c3c", transparent: true, opacity: 0.15 }));
    hazard.name = "HazardZone";
    hazard.position.set(0, 0.04, 0);
    group.add(hazard);
  }
  disaster.overlays.forEach((overlay, index) => {
    const colors: Record<typeof overlay.type, string> = { "access-blocked": "#c0392b", "hazard-zone": "#e67e22", "damage-roof": "#e74c3c", "damage-facade": "#c0392b" };
    const mesh = new Mesh(new BoxGeometry(1, 1, overlay.type === "access-blocked" ? 1 : 0.25), new MeshStandardMaterial({ color: colors[overlay.type], emissive: new Color(colors[overlay.type]), emissiveIntensity: 0.35, transparent: overlay.type !== "access-blocked", opacity: 0.72 }));
    mesh.name = `Disaster_${overlay.type}_${index + 1}`;
    mesh.position.set(...overlay.position);
    mesh.rotation.y = overlay.yawRad;
    mesh.scale.set(...overlay.scale);
    group.add(mesh);
  });
  addTransforms(group, "FireScorch", disaster.simulatedDamage.fireScorch, "#2b1712", [1, 1, 0.08], true);
  addTransforms(group, "RoofBreaches", disaster.simulatedDamage.roofBreaches, "#0b0a08", [1, 1, 1]);
  addTransforms(group, "FireFlames", disaster.simulatedDamage.fireFlames, "#ff5a18", [0.7, 2, 0.7], false, "cone");
  addTransforms(group, "FireSmoke", disaster.simulatedDamage.fireSmoke, "#3f3d39", [1, 1, 1], true, "sphere");
  if (disaster.simulatedDamage.floodWater) {
    const water = disaster.simulatedDamage.floodWater;
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: "#245f72", emissive: "#163d4a", emissiveIntensity: 0.18, transparent: true, opacity: 0.55, roughness: 0.28, metalness: 0.18 }));
    mesh.name = "FloodWater";
    mesh.position.set(...water.position);
    mesh.scale.set(...water.scale);
    group.add(mesh);
  }
  addTransforms(group, "FloodStains", disaster.simulatedDamage.floodStains, "#315a60", [1, 1, 0.08], true);
  addTransforms(group, "FloodDebris", disaster.simulatedDamage.floodDebris, "#685640", [1, 1, 1]);
  addTransforms(group, "WindBreaches", disaster.simulatedDamage.windBreaches, "#111817", [1, 1, 0.08]);
  addTransforms(group, "WindDisplacement", disaster.simulatedDamage.windPanels, "#73827b", [1, 1, 0.08]);
  addTransforms(group, "WindDebris", disaster.simulatedDamage.windDebris, "#5e625d", [1, 1, 1]);
  addTransforms(group, "StructuralCracks", disaster.simulatedDamage.structuralCracks, "#261714", [1, 1, 0.08], true);
  addTransforms(group, "StructuralBraces", disaster.simulatedDamage.structuralBraces, "#b56a2e", [1, 1, 0.08]);
  addTransforms(group, "CollapsedPanels", disaster.simulatedDamage.collapsedPanels, "#6f685d", [1, 1, 1]);
  return group;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "scene";
}
