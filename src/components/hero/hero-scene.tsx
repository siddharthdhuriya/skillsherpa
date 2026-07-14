"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line } from "@react-three/drei";
import * as THREE from "three";

// Lazy-loaded 3D hero (homepage only). One cohesive composition that echoes
// the SkillSherpa logo mark: an ascending guide-path of glowing nodes climbing
// to a summit point, wrapped in a light wireframe sphere and a soft particle
// drift. Everything lives in the right half of the viewport so it never
// collides with the headline, and every material is a light glacier tone;
// nothing dark, nothing opaque enough to swallow text. The reduced-motion /
// low-end fallback lives in hero.tsx, not here.

// Deterministic PRNG (mulberry32): render-pure and the field looks identical
// on every visit, which also keeps React strict-mode re-renders stable.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Particles({ count = 260 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const rand = mulberry32(1337);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rand() - 0.5) * 16;
      arr[i * 3 + 1] = (rand() - 0.5) * 9;
      arr[i * 3 + 2] = (rand() - 0.5) * 5 - 2.5;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.012;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#8fd6de" transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

// The logo mark in 3D: an ascending zigzag path of nodes ending in a summit
// point, matching the "guide path + summit dot" of the brand icon.
const PATH: [number, number, number][] = [
  [-1.7, -1.35, 0.2],
  [-0.9, -0.45, -0.15],
  [-0.15, -0.85, 0.1],
  [0.7, 0.15, -0.1],
  [1.35, -0.25, 0.15],
  [2.05, 0.95, 0],
];
const SUMMIT = PATH[PATH.length - 1];

function GuidePath() {
  const summitRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!summitRef.current) return;
    // Gentle breathing glow on the summit node.
    const s = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.12;
    summitRef.current.scale.setScalar(s);
  });

  return (
    <group>
      <Line points={PATH} color="#26a5b3" lineWidth={2} transparent opacity={0.8} />
      {PATH.slice(0, -1).map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshStandardMaterial color="#3fb5c2" emissive="#3fb5c2" emissiveIntensity={0.35} />
        </mesh>
      ))}
      <mesh ref={summitRef} position={SUMMIT}>
        <sphereGeometry args={[0.14, 20, 20]} />
        <meshStandardMaterial color="#5fd6e0" emissive="#5fd6e0" emissiveIntensity={0.9} />
      </mesh>
      {/* Soft halo behind the summit */}
      <mesh position={[SUMMIT[0], SUMMIT[1], SUMMIT[2] - 0.05]}>
        <sphereGeometry args={[0.3, 20, 20]} />
        <meshBasicMaterial color="#9fe4ea" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

function Composition() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    // Subtle pointer parallax, transform-only.
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      -state.pointer.y * 0.08,
      0.04,
    );
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      state.pointer.x * 0.12,
      0.04,
    );
  });

  return (
    // Anchored in the right half of the viewport, clear of the headline.
    <group ref={group} position={[2.9, 0.1, -0.5]}>
      <Float speed={1} rotationIntensity={0.15} floatIntensity={0.5}>
        <GuidePath />
        {/* Light wireframe sphere enclosing the path: the "world of
            knowledge" the guide path climbs through. detail=1 keeps it cheap. */}
        <mesh>
          <icosahedronGeometry args={[2.6, 1]} />
          <meshBasicMaterial color="#7cc7d1" wireframe transparent opacity={0.28} />
        </mesh>
      </Float>
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      // No antialiasing + capped DPR: meaningfully cheaper on high-DPI screens.
      dpr={[1, 1.75]}
      gl={{ antialias: false, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 5.5], fov: 50 }}
      aria-hidden="true"
      className="pointer-events-none"
      style={{ position: "absolute", inset: 0 }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 3]} intensity={0.7} />
      <Composition />
      <Particles />
    </Canvas>
  );
}
