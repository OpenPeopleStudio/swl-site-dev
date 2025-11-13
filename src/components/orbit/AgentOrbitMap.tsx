"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

interface AgentStates {
  ui: number;
  content: number;
  schema: number;
  functionality: number;
  debugger: number;
}

function AgentNode({
  position,
  color,
  intensity,
}: {
  position: [number, number, number];
  color: string;
  intensity: number;
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial emissive={color} emissiveIntensity={intensity} color={color} />
    </mesh>
  );
}

function OrbitRing({ radius }: { radius: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.02, radius + 0.02, 64]} />
      <meshBasicMaterial color="#ffffff" opacity={0.2} transparent side={2} />
    </mesh>
  );
}

type AgentOrbitMapProps = {
  height?: number | string;
};

export default function AgentOrbitMap({ height = 600 }: AgentOrbitMapProps) {
  const [states, setStates] = useState<AgentStates>({
    ui: 0.3,
    content: 0.3,
    schema: 0.3,
    functionality: 0.3,
    debugger: 0.3,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStates({
        ui: Math.random() * 0.9,
        content: Math.random() * 0.9,
        schema: Math.random() * 0.9,
        functionality: Math.random() * 0.9,
        debugger: Math.random() * 0.9,
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Canvas
      style={{
        height,
        width: "100%",
        background: "black",
        borderRadius: 16,
      }}
    >
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#00F3FF" />

      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial emissive="#00F3FF" emissiveIntensity={0.8} />
      </mesh>

      <OrbitRing radius={3} />
      <OrbitRing radius={4.2} />
      <OrbitRing radius={5.4} />

      <AgentNode position={[3, 0, 0]} color="#00F3FF" intensity={states.ui} />
      <AgentNode position={[0, 3, 0]} color="#FF8EFF" intensity={states.content} />
      <AgentNode position={[-3, 0, 0]} color="#00FF9C" intensity={states.schema} />
      <AgentNode position={[0, -3, 0]} color="#EC742E" intensity={states.functionality} />
      <AgentNode position={[0, 0, 3]} color="#FF4444" intensity={states.debugger} />

      <OrbitControls enablePan={false} minDistance={4} maxDistance={12} autoRotate autoRotateSpeed={0.5} />
    </Canvas>
  );
}
