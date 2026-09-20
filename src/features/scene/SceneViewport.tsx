import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Grid, OrbitControls } from "@react-three/drei";
import {
  BufferGeometry,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  InstancedMesh,
  Matrix4,
  Object3D,
  PerspectiveCamera,
  Shape
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { SceneProject } from "../../../shared/scene-schema";
import { buildScenePlan, getMaterialColor, type ScenePlan } from "./scene-plan";
import { buildScorchedPlan, type ScorchedPlan, type ScorchedTransform } from "./scorched-plan";
import { buildDisasterPlan, type DisasterPlan } from "./disaster-plan";

export interface SceneViewportHandle {
  fitBuilding: () => void;
  resetView: () => void;
}

type CameraCommand = "fit" | "reset";

export const SceneViewport = forwardRef<SceneViewportHandle, { project: SceneProject; }>(
  function SceneViewport({ project }, ref) {
    const [command, setCommand] = useState<{ id: number; type: CameraCommand; }>({ id: 0, type: "fit" });
    const canRender = useWebGlAvailability();
    const plan = useMemo(() => buildScenePlan(project), [project]);
    const scorchedPlan = useMemo(
      () => project.scenario.activeMode === "scorched" ? buildScorchedPlan(project, plan) : null,
      [plan, project]
    );
    const disasterPlan = useMemo(
      () => project.scenario.activeMode === "disaster" ? buildDisasterPlan(project, plan) : null,
      [plan, project]
    );

    useImperativeHandle(
      ref,
      () => ({
        fitBuilding: () => setCommand((current) => ({ id: current.id + 1, type: "fit" })),
        resetView: () => setCommand((current) => ({ id: current.id + 1, type: "reset" }))
      }),
      []
    );

    if (!canRender) {
      return <SceneFallback />;
    }

    return (
      <div className={`scene-stage${scorchedPlan ? " scene-stage--scorched" : ""}${disasterPlan ? " scene-stage--disaster" : ""}`} aria-label="Interactive 3D building scene">
        <Canvas
          camera={{ fov: 42, near: 0.1, far: 2000, position: [0, 100, 18] }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
          onCreated={({ gl }) => gl.setClearColor(new Color("#d8e0dc"))}
        >
          <SceneContents command={command} plan={plan} scorchedPlan={scorchedPlan} disasterPlan={disasterPlan} />
        </Canvas>
        <div className="scene-north" aria-label="North points toward the top of the model">N</div>
        <div className="scene-scale" aria-hidden="true"><span /> 20 m</div>
      </div>
    );
  }
);

function SceneContents({ command, plan, scorchedPlan, disasterPlan }: { command: { id: number; type: CameraCommand; }; plan: ScenePlan; scorchedPlan: ScorchedPlan | null; disasterPlan: DisasterPlan | null; }) {
  return (
    <>
      <color attach="background" args={[scorchedPlan ? "#596059" : disasterPlan ? "#c7d0cc" : "#d8e0dc"]} />
      <ambientLight intensity={0.62} />
      <directionalLight castShadow intensity={2.6} position={[55, 85, 35]} shadow-mapSize={[2048, 2048]} />
      <hemisphereLight args={["#e7f3ef", "#45504b", 0.72]} />
      <BuildingMass plan={plan} scorched={Boolean(scorchedPlan)} />
      <StoneFacade plan={plan} scorched={Boolean(scorchedPlan)} />
      <WindowInstances plan={plan} scorched={Boolean(scorchedPlan)} />
      <WindowFrames plan={plan} scorched={Boolean(scorchedPlan)} />
      <ArchitecturalDetails plan={plan} />
      <Entrance plan={plan} />
      <FacadeModules plan={plan} />
      <Roof plan={plan} />
      {scorchedPlan ? <ScorchedLayers plan={scorchedPlan} /> : null}
      {disasterPlan ? <DisasterLayers plan={disasterPlan} /> : null}
      <Ground />
      <CameraController command={command} plan={plan} />
    </>
  );
}

const BuildingMass = memo(function BuildingMass({ plan, scorched }: { plan: ScenePlan; scorched: boolean; }) {
  const geometry = useMemo(() => {
    const shape = new Shape();
    plan.outline.forEach((point, index) => {
      if (index === 0) {
        shape.moveTo(point.x, -point.z);
      } else {
        shape.lineTo(point.x, -point.z);
      }
    });
    shape.closePath();
    return new ExtrudeGeometry(shape, { depth: plan.heightM, bevelEnabled: false });
  }, [plan.outline, plan.heightM]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh castShadow geometry={geometry} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color={scorched ? "#4c403b" : getMaterialColor(plan.material, plan.facadeColor)} metalness={plan.material === "metal" ? 0.42 : 0.05} roughness={0.9} />
    </mesh>
  );
});

function StoneFacade({ plan, scorched }: { plan: ScenePlan; scorched: boolean; }) {
  const palettes = scorched
    ? ["#443c35", "#57493d", "#332f2a", "#625346"]
    : ["#8b877b", "#a39d8e", "#77756d", "#b2aa98"];
  return <group>
    {palettes.map((color, tone) => (
      <TransformInstances
        color={color}
        geometry="block"
        key={color}
        transforms={plan.stoneBlocks.filter((block) => block.tone === tone)}
      />
    ))}
  </group>;
}

const WindowInstances = memo(function WindowInstances({ plan, scorched }: { plan: ScenePlan; scorched: boolean; }) {
  const meshRef = useRef<InstancedMesh>(null);
  const matrices = useMemo(() => {
    const object = new Object3D();
    return plan.windows.map((window) => {
      object.position.set(...window.position);
      object.rotation.set(0, window.yawRad, 0);
      object.scale.set(...window.scale);
      object.updateMatrix();
      return object.matrix.clone();
    });
  }, [plan.windows]);

  useLayoutEffect(() => {
    matrices.forEach((matrix, index) => meshRef.current?.setMatrixAt(index, matrix));
    if (meshRef.current) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [matrices]);

  return (
    <instancedMesh castShadow ref={meshRef} args={[undefined, undefined, matrices.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={scorched ? "#111718" : "#486d71"} emissive={scorched ? "#060808" : "#172d30"} emissiveIntensity={scorched ? 0.02 : 0.08} metalness={0.22} roughness={scorched ? 0.82 : 0.3} />
    </instancedMesh>
  );
});

const WindowFrames = memo(function WindowFrames({ plan, scorched }: { plan: ScenePlan; scorched: boolean; }) {
  const { vertical, horizontal } = useMemo(() => {
    const object = new Object3D();
    const vertical: Matrix4[] = [];
    const horizontal: Matrix4[] = [];
    plan.windows.forEach((window) => {
      const tangent = { x: Math.cos(window.yawRad), z: -Math.sin(window.yawRad) };
      [-1, 1].forEach((side) => {
        object.position.set(
          window.position[0] + tangent.x * window.scale[0] * 0.52 * side,
          window.position[1],
          window.position[2] + tangent.z * window.scale[0] * 0.52 * side
        );
        object.rotation.set(0, window.yawRad, 0);
        object.scale.set(0.09, window.scale[1] + 0.18, 0.1);
        object.updateMatrix();
        vertical.push(object.matrix.clone());
      });
      [-1, 1].forEach((side) => {
        object.position.set(window.position[0], window.position[1] + window.scale[1] * 0.52 * side, window.position[2]);
        object.rotation.set(0, window.yawRad, 0);
        object.scale.set(window.scale[0] + 0.18, 0.09, 0.1);
        object.updateMatrix();
        horizontal.push(object.matrix.clone());
      });
    });
    return { vertical, horizontal };
  }, [plan.windows]);

  return <>
    <FrameInstances matrices={vertical} color={scorched ? "#211b18" : "#334443"} />
    <FrameInstances matrices={horizontal} color={scorched ? "#211b18" : "#334443"} />
  </>;
});

function FrameInstances({ matrices, color }: { matrices: Matrix4[]; color: string; }) {
  const meshRef = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    matrices.forEach((matrix, index) => meshRef.current?.setMatrixAt(index, matrix));
    if (meshRef.current) meshRef.current.instanceMatrix.needsUpdate = true;
  }, [matrices]);
  if (matrices.length === 0) return null;
  return <instancedMesh castShadow ref={meshRef} args={[undefined, undefined, matrices.length]}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color={color} roughness={0.55} metalness={0.16} />
  </instancedMesh>;
}

function ArchitecturalDetails({ plan }: { plan: ScenePlan; }) {
  return <group>
    {plan.facadeBands.map((band, index) => <mesh castShadow key={`band-${index}`} position={band.position} rotation={[0, band.yawRad, 0]} scale={band.scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#78817a" roughness={0.78} />
    </mesh>)}
    {plan.roofType === "flat" ? plan.parapetEdges.map((edge, index) => <mesh castShadow key={`parapet-${index}`} position={edge.position} rotation={[0, edge.yawRad, 0]} scale={edge.scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#495754" roughness={0.8} />
    </mesh>) : null}
    {plan.entranceSteps.map((step, index) => <mesh castShadow key={`step-${index}`} position={step.position} rotation={[0, step.yawRad, 0]} scale={step.scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#68706b" roughness={0.9} />
    </mesh>)}
  </group>;
}

function ScorchedLayers({ plan }: { plan: ScorchedPlan; }) {
  return (
    <group>
      <TransformInstances transforms={plan.boardedWindows} color="#76543a" geometry="board" />
      <TransformInstances transforms={plan.brokenWindows} color="#0d1110" geometry="window" />
      <TransformInstances transforms={plan.roofDamage} color="#241916" geometry="debris" />
      <TransformInstances transforms={plan.debris} color="#4c4038" geometry="debris" />
      <TransformInstances transforms={plan.decayPatches} color="#6b6256" geometry="block" />
      {plan.facadeVines.map((vine, index) => <mesh castShadow key={`vine-${index}`} position={vine.position} rotation={[0, vine.yawRad, 0]} scale={vine.scale}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={index % 2 === 0 ? "#63cf4f" : "#35a94a"} side={DoubleSide} />
      </mesh>)}
      {plan.scorchPatches.map((patch, index) => (
        <mesh key={`scorch-${index}`} position={patch.position} rotation={[0, patch.yawRad, 0]} scale={patch.scale}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={index % 3 === 0 ? "#090604" : "#2c150d"} opacity={0.94} transparent polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      ))}
      {plan.overgrowth.map((tuft, index) => (
        <mesh castShadow key={`overgrowth-${index}`} position={tuft.position} rotation={[0, tuft.yawRad, 0]} scale={tuft.scale}>
          <coneGeometry args={[0.55, 1, 5]} />
          <meshStandardMaterial color={index % 3 === 0 ? "#78bd4f" : "#45a34b"} roughness={0.95} />
        </mesh>
      ))}
      {plan.embers.map((ember, index) => <mesh key={`ember-${index}`} position={ember.position} scale={ember.scale}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#ff8a32" emissive="#ff4b18" emissiveIntensity={2.4} roughness={0.5} />
      </mesh>)}
    </group>
  );
}

function TransformInstances({ transforms, color, geometry }: { transforms: ScorchedTransform[]; color: string; geometry: "board" | "window" | "debris" | "block"; }) {
  const meshRef = useRef<InstancedMesh>(null);
  const matrices = useMemo(() => {
    const object = new Object3D();
    return transforms.map((transform) => {
      object.position.set(...transform.position);
      object.rotation.set(0, transform.yawRad, 0);
      object.scale.set(...transform.scale);
      object.updateMatrix();
      return object.matrix.clone();
    });
  }, [transforms]);

  useLayoutEffect(() => {
    matrices.forEach((matrix, index) => meshRef.current?.setMatrixAt(index, matrix));
    if (meshRef.current) meshRef.current.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  if (matrices.length === 0) return null;

  return (
    <instancedMesh castShadow ref={meshRef} args={[undefined, undefined, matrices.length]}>
      {geometry === "window" ? <boxGeometry args={[1, 1, 1]} /> : <boxGeometry args={[1, 1, 1]} />}
      <meshStandardMaterial color={color} roughness={geometry === "board" ? 0.9 : 0.82} />
    </instancedMesh>
  );
}

function DisasterLayers({ plan }: { plan: DisasterPlan; }) {
  const { simulatedDamage } = plan;
  return (
    <group>
      {/* Hazard zone glow */}
      {plan.hazardZone.active ? (
        <mesh position={[0, 0.2, 0]} scale={[5.5, 0.2, 5.5]}>
          <cylinderGeometry args={[1, 1, 1, 32]} />
          <meshStandardMaterial color="#e74c3c" opacity={0.15} transparent emissive={new Color("#e74c3c")} emissiveIntensity={0.3} />
        </mesh>
      ) : null}

      {/* Operational access markers stay distinct from simulated damage. */}
      {plan.overlays.map((overlay, index) => {
        const colorMap: Record<string, string> = {
          "access-blocked": "#c0392b",
          "hazard-zone": "#e67e22",
          "damage-roof": "#3d3028",
          "damage-facade": "#3d3028"
        };

        return (
          <mesh
            key={`disaster-${index}`}
            position={overlay.position}
            rotation={[0, overlay.yawRad, 0]}
            scale={overlay.scale}
          >
            {overlay.type === "access-blocked" ? (
              <>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color={colorMap[overlay.type]} emissive={new Color(colorMap[overlay.type])} emissiveIntensity={0.5} />
              </>
            ) : (
              <>
                <boxGeometry args={[1, 1, 0.25]} />
                <meshStandardMaterial color={colorMap[overlay.type]} emissive={new Color(colorMap[overlay.type])} emissiveIntensity={0.35} opacity={0.72} transparent />
              </>
            )}
          </mesh>
        );
      })}
      <DamageMeshes transforms={simulatedDamage.fireScorch} color="#2b1712" opacity={0.92} />
      <DamageMeshes transforms={simulatedDamage.roofBreaches} color="#0b0a08" />
      {simulatedDamage.fireFlames.map((flame, index) => <group key={`flame-${index}`} position={flame.position} scale={flame.scale}>
        <mesh position={[0, 0.45, 0]}>
          <coneGeometry args={[0.62, 2, 9]} />
          <meshStandardMaterial color="#ff7a18" emissive="#ff3d00" emissiveIntensity={3.2} transparent opacity={0.92} />
        </mesh>
        <mesh position={[0, 0.15, 0]} scale={[0.52, 0.62, 0.52]}>
          <coneGeometry args={[0.7, 2, 9]} />
          <meshStandardMaterial color="#ffd45c" emissive="#ff9800" emissiveIntensity={3.8} />
        </mesh>
      </group>)}
      {simulatedDamage.fireSmoke.map((smoke, index) => <mesh key={`smoke-${index}`} position={smoke.position} scale={smoke.scale}>
        <sphereGeometry args={[1, 12, 9]} />
        <meshStandardMaterial color={index % 3 === 0 ? "#242321" : "#4b4945"} depthWrite={false} opacity={0.4} transparent roughness={1} />
      </mesh>)}
      {simulatedDamage.floodWater ? (
        <mesh position={simulatedDamage.floodWater.position} scale={simulatedDamage.floodWater.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#245f72" emissive="#163d4a" emissiveIntensity={0.18} opacity={0.55} transparent roughness={0.28} metalness={0.18} />
        </mesh>
      ) : null}
      <DamageMeshes transforms={simulatedDamage.floodStains} color="#315a60" opacity={0.82} />
      <DamageMeshes transforms={simulatedDamage.floodDebris} color="#685640" />
      <DamageMeshes transforms={simulatedDamage.windBreaches} color="#111817" />
      <DamageMeshes transforms={simulatedDamage.windPanels} color="#7b817b" />
      <DamageMeshes transforms={simulatedDamage.windDebris} color="#5e625d" />
      <DamageMeshes transforms={simulatedDamage.structuralCracks} color="#261714" opacity={0.96} />
      <DamageMeshes transforms={simulatedDamage.structuralBraces} color="#b56a2e" />
      <DamageMeshes transforms={simulatedDamage.collapsedPanels} color="#6f685d" />
    </group>
  );
}

function DamageMeshes({ transforms, color, opacity = 1 }: { transforms: DisasterPlan["simulatedDamage"]["fireScorch"]; color: string; opacity?: number; }) {
  return <>
    {transforms.map((transform, index) => (
      <mesh key={`${color}-${index}`} castShadow position={transform.position} rotation={transform.rotation ?? [0, transform.yawRad, 0]} scale={transform.scale}>
        <boxGeometry args={[1, 1, 0.08]} />
        <meshStandardMaterial color={color} emissive={opacity < 1 ? color : "#000000"} emissiveIntensity={opacity < 1 ? 0.08 : 0} opacity={opacity} transparent={opacity < 1} roughness={0.74} metalness={color === "#73827b" ? 0.42 : 0.06} />
      </mesh>
    ))}
  </>;
}

function Entrance({ plan }: { plan: ScenePlan; }) {
  return (
    <mesh castShadow position={plan.entrance.position} rotation={[0, plan.entrance.yawRad, 0]}>
      <boxGeometry args={[3.2, 2.7, 0.42]} />
      <meshStandardMaterial color="#263639" metalness={0.18} roughness={0.48} />
    </mesh>
  );
}

function FacadeModules({ plan }: { plan: ScenePlan; }) {
  return (
    <group>
      {plan.facadeModules.map((module, index) => <FacadeModule key={`${module.type}-${index}`} module={module} />)}
    </group>
  );
}

function FacadeModule({ module }: { module: ScenePlan["facadeModules"][number]; }) {
  const stone = module.type === "canopy" ? "#394746" : "#817d72";
  if (module.type === "portico") {
    return <group position={module.position} rotation={[0, module.yawRad, 0]}>
      <mesh castShadow position={[0, module.scale[1] * 0.45, 0]} scale={[module.scale[0], 0.38, module.scale[2]]}><boxGeometry /><meshStandardMaterial color="#79766c" roughness={0.86} /></mesh>
      {[-0.38, 0.38].map((x) => <mesh castShadow key={x} position={[x * module.scale[0], 0, module.scale[2] * 0.3]} scale={[0.48, module.scale[1], 0.48]}><cylinderGeometry args={[0.55, 0.7, 1, 10]} /><meshStandardMaterial color="#a09b8c" roughness={0.9} /></mesh>)}
    </group>;
  }
  return <group position={module.position} rotation={[0, module.yawRad, 0]}>
    <mesh castShadow scale={module.scale}><boxGeometry /><meshStandardMaterial color={stone} roughness={0.82} /></mesh>
    {module.type === "tower" ? <mesh castShadow position={[0, module.scale[1] * 0.56, 0]} scale={[module.scale[0] * 1.08, 1.1, module.scale[2] * 1.08]}><boxGeometry /><meshStandardMaterial color="#4d5550" roughness={0.84} /></mesh> : null}
    {module.type === "bay" ? <mesh position={[0, 0, module.scale[2] * 0.52]} scale={[module.scale[0] * 0.78, module.scale[1] * 0.72, 0.12]}><boxGeometry /><meshStandardMaterial color="#a9c2bf" metalness={0.14} roughness={0.24} /></mesh> : null}
  </group>;
}

function Roof({ plan }: { plan: ScenePlan; }) {
  const flatGeometry = useMemo(() => {
    const shape = new Shape();
    plan.outline.forEach((point, index) => {
      if (index === 0) {
        shape.moveTo(point.x, -point.z);
      } else {
        shape.lineTo(point.x, -point.z);
      }
    });
    shape.closePath();
    return new ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false });
  }, [plan.outline]);
  const pitchedGeometry = useMemo(() => createPitchedRoofGeometry(plan), [plan]);

  useEffect(() => () => flatGeometry.dispose(), [flatGeometry]);
  useEffect(() => () => pitchedGeometry.dispose(), [pitchedGeometry]);

  if (plan.roofType === "flat") {
    return <mesh castShadow geometry={flatGeometry} position={[0, plan.heightM, 0]} rotation={[-Math.PI / 2, 0, 0]}><meshStandardMaterial color="#4d5755" roughness={0.86} /></mesh>;
  }

  return <mesh castShadow geometry={pitchedGeometry}><meshStandardMaterial color={plan.roofType === "gable" ? "#4a5552" : "#59625c"} roughness={0.72} side={DoubleSide} /></mesh>;
}

function createPitchedRoofGeometry(plan: ScenePlan) {
  const vertices: number[] = [];
  const ridgeHeight = Math.min(7, Math.max(2.4, plan.heightM * 0.18));
  const centerX = (plan.bounds.minX + plan.bounds.maxX) / 2;
  const centerZ = (plan.bounds.minZ + plan.bounds.maxZ) / 2;
  const longOnX = plan.bounds.width >= plan.bounds.depth;
  const ridgeFor = (point: { x: number; z: number }): [number, number, number] => plan.roofType === "hip"
    ? [centerX, plan.heightM + ridgeHeight, centerZ]
    : [longOnX ? point.x : centerX, plan.heightM + ridgeHeight, longOnX ? centerZ : point.z];
  plan.outline.forEach((point, index) => {
    const next = plan.outline[(index + 1) % plan.outline.length];
    const ridgeA = ridgeFor(point);
    const ridgeB = ridgeFor(next);
    vertices.push(
      point.x, plan.heightM, point.z,
      next.x, plan.heightM, next.z,
      ...ridgeB,
      point.x, plan.heightM, point.z,
      ...ridgeB,
      ...ridgeA
    );
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function Ground() {
  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[420, 420]} />
        <meshStandardMaterial color="#aeb9af" roughness={1} />
      </mesh>
      <Grid args={[260, 260]} cellColor="#9da8a1" cellSize={10} cellThickness={0.12} fadeDistance={120} fadeStrength={1.8} sectionColor="#88958d" sectionSize={50} sectionThickness={0.22} />
      <ContactShadows blur={2.2} far={90} frames={1} opacity={0.48} position={[0, 0.02, 0]} resolution={1024} scale={120} />
    </>
  );
}

function CameraController({ command, plan }: { command: { id: number; type: CameraCommand; }; plan: ScenePlan; }) {
  const { camera, size } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const previousProjectId = useRef("");
  const planRef = useRef(plan);
  planRef.current = plan;

  const fit = useCallback(() => {
    const currentPlan = planRef.current;
    const perspectiveCamera = camera as PerspectiveCamera;
    const verticalHalfFov = (perspectiveCamera.fov * Math.PI) / 360;
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * (size.width / size.height));
    const horizontalDistance = currentPlan.bounds.width / (2 * Math.tan(horizontalHalfFov));
    const verticalDistance = Math.max(currentPlan.bounds.depth, currentPlan.heightM) /
      (2 * Math.tan(verticalHalfFov));
    const distance = Math.max(horizontalDistance, verticalDistance, 26) * 1.2;
    // Map-aligned elevated view: east is screen-right and north (-Z) is screen-top.
    camera.position.set(distance * 0.72, distance * 0.82, distance * 0.68);
    controls.current?.target.set(0, currentPlan.heightM * 0.4, 0);
    controls.current?.update();
    controls.current?.saveState();
  }, [camera, size.height, size.width]);

  useEffect(() => {
    if (previousProjectId.current !== plan.projectId) {
      previousProjectId.current = plan.projectId;
      fit();
    }
  }, [fit, plan.projectId]);

  useEffect(() => {
    if (command.id === 0) {
      return;
    }
    if (command.type === "reset") {
      controls.current?.reset();
    } else {
      fit();
    }
  }, [command, fit]);

  return <OrbitControls ref={controls} enablePan={false} maxDistance={340} maxPolarAngle={Math.PI / 2.08} minDistance={10} minPolarAngle={0.24} />;
}

function useWebGlAvailability() {
  const [available, setAvailable] = useState(() => !navigator.userAgent.includes("jsdom"));

  useEffect(() => {
    if (navigator.userAgent.includes("jsdom")) {
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      setAvailable(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
    } catch {
      setAvailable(false);
    }
  }, []);

  return available;
}

function SceneFallback() {
  return (
    <div className="scene-stage scene-stage--fallback" aria-label="3D scene unavailable">
      <p>3D preview is unavailable in this browser. Map, metadata, and exports remain available.</p>
    </div>
  );
}
