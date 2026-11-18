"use client";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Box3, Color, ShaderMaterial, Vector3 } from "three";

function Brain({ onReady, onLost }) {
  const gltf = useLoader(GLTFLoader, "/brain.glb");
  const group = useRef();
  const { gl, camera, size } = useThree();
  const frame = useMemo(() => {
    const bounds = new Box3().setFromObject(gltf.scene);
    const center = bounds.getCenter(new Vector3());
    const extent = bounds.getSize(new Vector3());
    return {
      center: [-center.x, -center.y, -center.z],
      diameter: Math.hypot(extent.x, extent.z),
      height: extent.y,
    };
  }, [gltf]);
  useEffect(() => {
    // Orthographic projection keeps anatomical proportions constant as it rotates.
    camera.zoom = Math.min(
      size.width / (frame.diameter * 1.12),
      size.height / (frame.height * 1.16),
    );
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, frame]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          deepColor: { value: new Color("#080c2b") },
          surfaceColor: { value: new Color("#293c68") },
          rimColor: { value: new Color("#91c8be") },
        },
        vertexShader: `
      varying vec3 viewNormal;
      varying vec3 viewDirection;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        viewNormal = normalize(normalMatrix * normal);
        viewDirection = -viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
        fragmentShader: `
      uniform vec3 deepColor;
      uniform vec3 surfaceColor;
      uniform vec3 rimColor;
      varying vec3 viewNormal;
      varying vec3 viewDirection;
      void main() {
        vec3 normal = normalize(viewNormal);
        vec3 direction = normalize(viewDirection);
        float light = max(dot(normal, normalize(vec3(-0.4, 0.7, 1.0))), 0.0);
        // A soft Fresnel edge follows the folds as the brain turns.
        float rim = pow(1.0 - max(dot(normal, direction), 0.0), 1.65);
        vec3 surface = mix(deepColor, surfaceColor, 0.08 + light * 0.50);
        vec3 color = mix(surface, rimColor, smoothstep(0.0, 1.0, rim) * 0.82);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
        toneMapped: false,
      }),
    [],
  );
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((object) => {
      if (object.isMesh) {
        object.geometry = object.geometry.clone();
        object.geometry.computeVertexNormals();
        object.material = material;
      }
    });
    return clone;
  }, [gltf, material]);
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onLost);
    onReady();
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl, onReady, onLost]);
  useEffect(
    () => () => {
      scene.traverse((object) => {
        if (object.isMesh) object.geometry.dispose();
      });
      material.dispose();
    },
    [scene, material],
  );
  useFrame((state, delta) => {
    group.current.rotation.y += delta * 0.18;
  });
  return (
    <group ref={group} rotation={[0, -0.15, 0]}>
      <group position={frame.center}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

export default function BrainScene({ onReady, onLost }) {
  return (
    <Canvas
      orthographic
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.12, 5], zoom: 120, near: 0.1, far: 100 }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      fallback={null}
    >
      <Suspense fallback={null}>
        <Brain onReady={onReady} onLost={onLost} />
      </Suspense>
    </Canvas>
  );
}
