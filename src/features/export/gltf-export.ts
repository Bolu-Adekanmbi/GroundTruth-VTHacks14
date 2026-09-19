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
  Shape
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
  building.add(createWindows(plan, Boolean(scorchedPlan)));
  building.add(createEntrance(plan));
  building.add(createRoof(plan));
  scene.add(building);

  if (scorchedPlan) scene.add(createScorchedGroup(scorchedPlan));
  if (disasterPlan) scene.add(createDisasterGroup(disasterPlan, plan));

  return scene;
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

function createRoof(plan: ScenePlan) {
  if (plan.roofType === "flat" || plan.outline.length !== 4) {
    const shape = new Shape();
    plan.outline.forEach((point, index) => index === 0 ? shape.moveTo(point.x, -point.z) : shape.lineTo(point.x, -point.z));
    shape.closePath();
    const mesh = new Mesh(new ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false }), new MeshStandardMaterial({ color: "#4d5755", roughness: 0.86 }));
    mesh.name = "Roof";
    mesh.position.set(0, plan.heightM, 0);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }
  const ridgeHeight = Math.min(5, Math.max(2, plan.heightM * 0.14));
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute([
    plan.bounds.minX, plan.heightM, plan.bounds.minZ, plan.bounds.maxX, plan.heightM, plan.bounds.minZ,
    plan.bounds.maxX, plan.heightM, plan.bounds.maxZ, plan.bounds.minX, plan.heightM, plan.bounds.maxZ,
    plan.bounds.minX, plan.heightM + ridgeHeight, 0, plan.bounds.maxX, plan.heightM + ridgeHeight, 0
  ], 3));
  geometry.setIndex([0, 1, 5, 0, 5, 4, 3, 4, 5, 3, 5, 2, 0, 4, 3, 1, 2, 5, 0, 3, 2, 0, 2, 1]);
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
  addTransforms(group, "Debris", plan.debris, "#6b6259", [1, 1, 1]);
  addTransforms(group, "ScorchPatches", plan.scorchPatches, "#241916", [1, 1, 0.04], true);
  addTransforms(group, "Overgrowth", plan.overgrowth, "#405b38", [0.55, 1, 0.55], false, "cone");
  return group;
}

function addTransforms(group: Group, name: string, transforms: ScorchedPlan["debris"], color: string, dimensions: [number, number, number], transparent = false, kind: "box" | "cone" = "box") {
  const node = new Group();
  node.name = name;
  const geometry = kind === "cone" ? new ConeGeometry(dimensions[0], dimensions[1], 5) : new BoxGeometry(...dimensions);
  const material = transparent ? new MeshBasicMaterial({ color, transparent: true, opacity: 0.78 }) : new MeshStandardMaterial({ color, roughness: 0.85 });
  transforms.forEach((transform, index) => {
    const mesh = new Mesh(geometry, material);
    mesh.name = `${name}_${index + 1}`;
    mesh.position.set(...transform.position);
    mesh.rotation.y = transform.yawRad;
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
  return group;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "scene";
}
