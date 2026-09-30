import { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Group, Points } from 'three';
import { cn } from '@/utils/cn';

/** Slowly rotating abstract "flight network" — golden nodes and orbit rings. */
function FlightNetwork() {
  const group = useRef<Group>(null);
  const nodesRef = useRef<Points>(null);

  const nodePositions = useMemo(() => {
    const positions = new Float32Array(48 * 3);
    for (let i = 0; i < 48; i += 1) {
      // Fibonacci sphere for even, elegant distribution.
      const y = 1 - (i / 47) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = 2.399963 * i; // golden angle
      positions[i * 3] = Math.cos(theta) * radius * 1.6;
      positions[i * 3 + 1] = y * 1.6;
      positions[i * 3 + 2] = Math.sin(theta) * radius * 1.6;
    }
    return positions;
  }, []);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.08;
    if (nodesRef.current) nodesRef.current.rotation.y -= delta * 0.03;
  });

  return (
    <group ref={group}>
      {/* Core sphere */}
      <mesh>
        <sphereGeometry args={[1.32, 48, 48]} />
        <meshStandardMaterial color="#0a0f1c" metalness={0.9} roughness={0.35} />
      </mesh>
      {/* Destination nodes */}
      <points ref={nodesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nodePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.055} color="#d4b06a" sizeAttenuation transparent opacity={0.9} />
      </points>
      {/* Orbit rings */}
      {[1.85, 2.1].map((r) => (
        <mesh key={r} rotation={[Math.PI / 2.4, 0, r * 0.7]}>
          <torusGeometry args={[r, 0.006, 8, 128]} />
          <meshStandardMaterial color="#96a0b5" metalness={0.6} roughness={0.4} transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

export default function FlightWorld({ className }: { className?: string }) {
  const [webglOk] = useState(() => {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
    } catch {
      return false;
    }
  });
  const [reduced, setReduced] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent): void => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    setMounted(true);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!mounted) return <div className={cn('min-h-[380px]', className)} aria-hidden />;

  return (
    <div className={cn('relative min-h-[380px]', className)} aria-hidden>
      {!webglOk || reduced ? (
        // Fallback: static constellation rings in CSS/SVG.
        <div className="grid h-full place-items-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_50%_50%,rgba(56,189,248,0.07),transparent_70%)]" />
          <svg viewBox="0 0 200 200" className="size-52 text-silver/25" fill="none" aria-hidden>
            <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.6" />
            <circle cx="100" cy="100" r="56" stroke="currentColor" strokeWidth="0.6" />
            <circle cx="100" cy="100" r="32" stroke="currentColor" strokeWidth="0.6" />
            <circle cx="156" cy="76" r="2.5" fill="#d4b06a" />
            <circle cx="60" cy="140" r="2" fill="#d4b06a" />
            <circle cx="118" cy="34" r="1.8" fill="#d4b06a" />
          </svg>
        </div>
      ) : (
        <Canvas camera={{ position: [0, 1.4, 5.2], fov: 45 }} dpr={[1, 1.6]} gl={{ alpha: true, powerPreference: 'low-power' }} style={{ background: 'transparent' }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 6, 3]} intensity={1.2} color="#f4ead2" />
            <directionalLight position={[-5, -3, -4]} intensity={0.5} color="#38bdf8" />
            <FlightNetwork />
            <Environment preset="sunset" />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
