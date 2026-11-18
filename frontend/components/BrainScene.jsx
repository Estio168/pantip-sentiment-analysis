"use client";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshStandardMaterial, DoubleSide } from "three";
function Brain({ onReady, onLost }) {
  const gltf = useLoader(GLTFLoader, "/brain.glb");
  const group = useRef(),
    plane = useRef(),
    time = useRef(0);
  const { gl, camera, size } = useThree();
  useEffect(() => {
    // Keep the widest angle of the rotating mesh inside a portrait frame.
    const aspect = size.width / Math.max(1, size.height);
    camera.zoom = Math.min(1, aspect / 1.2);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#314d69",
        roughness: 0.51,
        metalness: 0.17,
      }),
    [],
  );
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((o) => {
      if (o.isMesh) o.material = material;
    });
    return clone;
  }, [gltf, material]);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onLost);
    onReady();
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl, onReady, onLost]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((state, dt) => {
    time.current += dt;
    group.current.rotation.y += dt * 0.34;
    plane.current.position.y = Math.sin(time.current * 0.7) * 0.76;
  });
  return (
    <>
      <group ref={group} rotation={[0, -0.26, 0]} position={[0, 0.08, 0]}>
        <primitive object={scene} />
      </group>
      <mesh ref={plane} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.23, 80]} />
        <meshBasicMaterial
          color="#4fded2"
          transparent
          opacity={0.036}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </>
  );
}
export default function BrainScene({ onReady, onLost }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.32, 3.65], fov: 39 }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      onCreated={({ camera }) => camera.lookAt(0, -0.08, 0)}
      fallback={null}
    >
      <ambientLight intensity={0.72} />
      <directionalLight position={[-2, 3, 3]} color="#d6edff" intensity={3.0} />
      <directionalLight position={[3, 1, 1]} color="#65ebda" intensity={2.9} />
      <directionalLight
        position={[-1, 2, -2]}
        color="#91caff"
        intensity={4.1}
      />
      <Suspense fallback={null}>
        <Brain onReady={onReady} onLost={onLost} />
      </Suspense>
    </Canvas>
  );
}
