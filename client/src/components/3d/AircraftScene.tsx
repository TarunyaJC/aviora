import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, ContactShadows } from '@react-three/drei';
import { Group } from 'three';
import { cn } from '@/utils/cn';

/** Detect WebGL support without crashing when unavailable. */
function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Low-poly abstract aircraft built from primitives — elegant, not gamey. */
function AircraftModel() {
  const group = useRef<Group>(null);
  const { pointer } = useThree();

  useFrame((_state, delta) => {
    if (!group.current) return;
    // Subtle idle rotation + mouse parallax.
    group.current.rotation.y += delta * 0.15;
    const targetY = pointer.y * 0.15;
    const targetX = pointer.x * 0.3;
    group.current.rotation.x += (targetY - group.current.rotation.x) * 0.04;
    group.current.rotation.z += (-targetX * 0.2 - group.current.rotation.z) * 0.04;
  });

  const fuselageColor = '#1b2743';
  const metalColor = '#d4b06a';
  const bodyMaterial = <meshStandardMaterial color={fuselageColor} metalness={0.75} roughness={0.25} />;

  return (
    <group ref={group}>
      {/* Fuselage */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.42, 3.4, 8, 24]} />
        {bodyMaterial}
      </mesh>
      {/* Nose cone */}
      <mesh position={[2.15, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.42, 0.9, 24]} />
        {bodyMaterial}
      </mesh>
      {/* Wings */}
      <mesh position={[-0.1, -0.05, 0]} rotation={[0, 0, 0.06]}>
        <boxGeometry args={[1.1, 0.07, 6.4]} />
        <meshStandardMaterial color={fuselageColor} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Winglets */}
      <mesh position={[-0.1, 0.18, 3.2]} rotation={[0.35, 0, 0.06]}>
        <boxGeometry args={[0.7, 0.5, 0.06]} />
        <meshStandardMaterial color={metalColor} metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[-0.1, 0.18, -3.2]} rotation={[-0.35, 0, 0.06]}>
        <boxGeometry args={[0.7, 0.5, 0.06]} />
        <meshStandardMaterial color={metalColor} metalness={0.85} roughness={0.20} />
      </mesh>
      {/* Tail fin */}
      <mesh position={[-2.0, 0.55, 0]}>
        <boxGeometry args={[0.85, 1.15, 0.07]} />
        <meshStandardMaterial color={metalColor} metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Horizontal stabilizers */}
      <mesh position={[-2.0, 0.05, 0]}>
        <boxGeometry args={[0.55, 0.05, 2.3]} />
        <meshStandardMaterial color={fuselageColor} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Engines */}
      {[-1.35, 1.35].map((z) => (
        <group key={z} position={[0.05, -0.28, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.26, 0.22, 0.85, 20]} />
            <meshStandardMaterial color="#0a0f1c" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.24, 0.035, 10, 28]} />
            <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

interface AircraftSceneProps {
  className?: string;
}

export default function AircraftScene({ className }: AircraftSceneProps) {
  const [webglOk] = useState(supportsWebGL);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent): void => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    setMounted(true);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!mounted) return <div className={cn('min-h-[420px]', className)} aria-hidden />;

  const disabled = !webglOk || prefersReducedMotion;

  return (
    <div className={cn('relative min-h-[420px]', className)} aria-hidden>
      {/* Elegant fallback — ambient CSS glow + typographic mark */}
      {disabled ? (
        <div className="grid h-full min-h-[420px] place-items-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_50%_at_50%_45%,rgba(212,176,106,0.10),transparent_70%)]" />
          <svg viewBox="0 0 200 200" className="size-56 text-champagne/40" fill="none" aria-hidden>
            <circle cx="100" cy="100" r="78" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="54" stroke="currentColor" strokeWidth="0.5" />
            <path
              d="M30 104 L150 88 L172 100 L150 112 Z M118 92 L104 64 L116 62 L134 90 M118 108 L106 134 L114 138 L138 112"
              fill="currentColor"
              opacity="0.85"
            />
          </svg>
        </div>
      ) : (
        <Canvas
          camera={{ position: [4.6, 1.7, 5.6], fov: 42 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.35} />
            <directionalLight position={[6, 8, 4]} intensity={1.1} color="#f4ead2" />
            <directionalLight position={[-6, -2, -6]} intensity={0.4} color="#38bdf8" />
            <Float speed={1.1} rotationIntensity={0.15} floatIntensity={0.5}>
              <AircraftModel />
            </Float>
            <ContactShadows position={[0, -1.9, 0]} opacity={0.35} scale={14} blur={2.6} far={4} color="#000000" />
            <Environment preset="city" />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
