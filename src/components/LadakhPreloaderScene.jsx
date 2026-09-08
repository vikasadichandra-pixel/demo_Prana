import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Center, Environment, Lightformer, Text3D } from '@react-three/drei';
import * as THREE from 'three';
import helvetikerBold from 'three/examples/fonts/helvetiker_bold.typeface.json';
import {
  LETTER_HOLD_SECONDS,
  LETTER_RIGS,
  LETTER_SEQUENCE_SECONDS,
  MOUNTAIN_REVEAL_SECONDS,
  clamp01,
  easeOutBounce,
  easeOutCubic,
  landingImpact,
  letterProgress,
} from '../lib/ladakhPreloader';

const PEAKS = [
  { x: -5.55, h: 2.75, w: 1.2 },
  { x: -2.82, h: 2.05, w: 1.05 },
  { x: 0.05, h: 3.75, w: 1.3 },
  { x: 2.92, h: 1.95, w: 1.02 },
  { x: 5.55, h: 2.5, w: 1.15 },
];

const saturate = value => Math.max(0, Math.min(1, value));
const fract = value => value - Math.floor(value);

function hash2(x, y, seed = 0) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123);
}

function smoothNoise(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, ux), THREE.MathUtils.lerp(c, d, ux), uy);
}

function fbm(x, y, seed = 0) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let octave = 0; octave < 4; octave += 1) {
    value += smoothNoise(x * frequency, y * frequency, seed + octave * 17) * amplitude;
    frequency *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

export function terrainHeight(x, z, seed = 2) {
  const depthSoftening = 1 - 0.045 * Math.abs(z);
  let height = -1.72;
  for (const peak of PEAKS) {
    const dx = (x - peak.x) / peak.w;
    const ridge = Math.exp(-0.5 * dx * dx);
    height += peak.h * ridge * depthSoftening;
  }
  const sharp = (fbm(x * 0.34 + 9, z * 0.45 - 4, seed) - 0.5) * 1.05;
  const striation = Math.sin(x * 2.1 + z * 1.25) * 0.13 + Math.sin(x * 4.8 - z * 1.7) * 0.055;
  const valley = -Math.pow(Math.abs(z) / 5.3, 1.55) * 0.72;
  return height + sharp + striation + valley;
}

function makeTerrainGeometry({ width = 16.5, depth = 8.5, xSegments = 118, zSegments = 58, seed = 2, heightScale = 1, snowBias = 0 }) {
  const geometry = new THREE.PlaneGeometry(width, depth, xSegments, zSegments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const rock = new THREE.Color('#10161d');
  const slate = new THREE.Color('#27323b');
  const snow = new THREE.Color('#d7e1e8');
  const moonSnow = new THREE.Color('#eef4f7');
  const color = new THREE.Color();

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = terrainHeight(x, z, seed) * heightScale;
    position.setY(i, y);

    const grain = fbm(x * 0.72, z * 0.72, seed + 33);
    const snowLine = saturate((y + snowBias - 0.05) / 2.6);
    const windPacked = saturate(snowLine * 1.26 + (grain - 0.52) * 0.92);
    color.copy(rock).lerp(slate, saturate(grain * 0.9));
    color.lerp(snow, windPacked * 0.78);
    color.lerp(moonSnow, windPacked * windPacked * 0.22);
    color.toArray(colors, i * 3);
  }

  position.needsUpdate = true;
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function MountainMesh({ distant = false, foreground = false }) {
  const geometry = useMemo(() => makeTerrainGeometry({
    width: distant ? 21 : foreground ? 18.5 : 16.5,
    depth: distant ? 7 : foreground ? 7.5 : 8.5,
    xSegments: distant ? 92 : 118,
    zSegments: distant ? 42 : 58,
    seed: distant ? 11 : foreground ? 27 : 2,
    heightScale: distant ? 0.74 : foreground ? 0.82 : 1,
    snowBias: distant ? -0.28 : foreground ? -0.58 : 0,
  }), [distant, foreground]);

  return (
    <mesh
      geometry={geometry}
      position={distant ? [0, -0.45, -5.8] : foreground ? [0, -2.1, 3.6] : [0, 0, 0]}
      scale={distant ? [1.08, 1, 1.08] : foreground ? [1.13, 1, 1.04] : 1}
      rotation={distant ? [0, 0.02, 0] : foreground ? [0, -0.015, 0] : [0, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        vertexColors
        roughness={0.96}
        metalness={0.02}
        side={THREE.DoubleSide}
        fog
      />
    </mesh>
  );
}

function makeSoftParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,.92)');
  gradient.addColorStop(0.56, 'rgba(220,235,245,.42)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function SnowField({ count = 760, size = 0.075, speed = 1, opacity = 0.78, near = false }) {
  const points = useRef();
  const texture = useMemo(makeSoftParticleTexture, []);
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocity = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const j = i * 3;
      const r1 = hash2(i, 1, near ? 19 : 7);
      const r2 = hash2(i, 2, near ? 19 : 7);
      const r3 = hash2(i, 3, near ? 19 : 7);
      positions[j] = THREE.MathUtils.lerp(-10.5, 10.5, r1);
      positions[j + 1] = THREE.MathUtils.lerp(-2.5, 9.2, r2);
      positions[j + 2] = THREE.MathUtils.lerp(near ? 2.2 : -7.8, near ? 8.4 : 3.5, r3);
      velocity[j] = THREE.MathUtils.lerp(0.58, 1.36, hash2(i, 4, 5)) * speed;
      velocity[j + 1] = THREE.MathUtils.lerp(0.55, 1.5, hash2(i, 5, 8)) * speed;
      velocity[j + 2] = THREE.MathUtils.lerp(-0.08, 0.08, hash2(i, 6, 11));
    }
    return { positions, velocity };
  }, [count, near, speed]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.045);
    const position = points.current?.geometry.attributes.position;
    if (!position) return;
    const array = position.array;
    const gust = 0.22 + Math.sin(state.clock.elapsedTime * 0.55) * 0.075;
    for (let i = 0; i < count; i += 1) {
      const j = i * 3;
      array[j] += (data.velocity[j] + gust) * dt;
      array[j + 1] -= data.velocity[j + 1] * dt;
      array[j + 2] += data.velocity[j + 2] * dt;
      if (array[j] > 11.2 || array[j + 1] < -3.2) {
        array[j] = -10.8 + hash2(i, Math.floor(state.clock.elapsedTime), 91) * 3.1;
        array[j + 1] = 8 + hash2(i, Math.floor(state.clock.elapsedTime) + 2, 37) * 2.2;
        array[j + 2] = THREE.MathUtils.lerp(near ? 2.2 : -7.8, near ? 8.4 : 3.5, hash2(i, 9, 15));
      }
    }
    position.needsUpdate = true;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        alphaMap={texture}
        transparent
        opacity={opacity}
        size={size}
        sizeAttenuation
        depthWrite={false}
        color="#eef6fb"
        blending={near ? THREE.NormalBlending : THREE.AdditiveBlending}
      />
    </points>
  );
}

function NightStars() {
  const positions = useMemo(() => {
    const points = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i += 1) {
      points[i * 3] = THREE.MathUtils.lerp(-13, 13, hash2(i, 31, 4));
      points[i * 3 + 1] = THREE.MathUtils.lerp(3.8, 10.5, hash2(i, 32, 6));
      points[i * 3 + 2] = THREE.MathUtils.lerp(-12, -6.8, hash2(i, 33, 8));
    }
    return points;
  }, []);
  return (
    <points>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial size={0.025} color="#d9e8f2" transparent opacity={0.58} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function FogBanks() {
  const group = useRef();
  const texture = useMemo(makeSoftParticleTexture, []);
  const banks = useMemo(() => Array.from({ length: 9 }, (_, i) => ({
    x: THREE.MathUtils.lerp(-8.5, 8.5, hash2(i, 51, 14)),
    y: THREE.MathUtils.lerp(-1.5, 1.35, hash2(i, 52, 15)),
    z: THREE.MathUtils.lerp(-1.6, 4.8, hash2(i, 53, 16)),
    scale: THREE.MathUtils.lerp(2.4, 5.8, hash2(i, 54, 17)),
  })), []);
  useFrame((state) => {
    if (group.current) group.current.position.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.42;
  });
  return (
    <group ref={group}>
      {banks.map((bank, index) => (
        <sprite key={index} position={[bank.x, bank.y, bank.z]} scale={[bank.scale * 1.8, bank.scale, 1]}>
          <spriteMaterial map={texture} transparent opacity={0.055 + (index % 3) * 0.018} color="#9eb4c2" depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

function Moon() {
  const glow = useMemo(makeSoftParticleTexture, []);
  return (
    <group position={[5.15, 6.15, -8.6]}>
      <sprite scale={[2.7, 2.7, 1]}><spriteMaterial map={glow} transparent opacity={0.33} color="#d8e8f5" depthWrite={false} /></sprite>
      <mesh>
        <sphereGeometry args={[0.47, 32, 32]} />
        <meshBasicMaterial color="#e6eef4" toneMapped={false} />
      </mesh>
      <pointLight intensity={28} distance={22} decay={2} color="#b8d7ed" />
    </group>
  );
}

function ImpactBurst({ rig, index, visualRef }) {
  const group = useRef();
  const material = useRef();
  const baseY = terrainHeight(rig.x, rig.z) + 0.04;
  const positions = useMemo(() => {
    const count = 64;
    const array = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = hash2(i, index + 70, 42) * Math.PI * 2;
      const radius = 0.12 + hash2(i, index + 71, 43) * 0.88;
      array[i * 3] = Math.cos(angle) * radius;
      array[i * 3 + 1] = hash2(i, index + 72, 44) * 0.58;
      array[i * 3 + 2] = Math.sin(angle) * radius * 0.46;
    }
    return array;
  }, [index]);
  const texture = useMemo(makeSoftParticleTexture, []);

  useFrame(() => {
    const local = letterProgress(visualRef.current, index);
    const impact = landingImpact(local);
    if (group.current) {
      group.current.visible = impact > 0.001;
      group.current.scale.setScalar(0.62 + impact * 1.35);
    }
    if (material.current) material.current.opacity = impact * 0.82;
  });

  return (
    <group ref={group} position={[rig.x, baseY, rig.z]} visible={false}>
      <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
        <pointsMaterial ref={material} map={texture} transparent depthWrite={false} size={0.085} color="#f3f8fb" sizeAttenuation />
      </points>
    </group>
  );
}

function FallingLetter({ rig, index, visualRef }) {
  const group = useRef();
  const baseY = terrainHeight(rig.x, rig.z) + 0.06;

  useFrame(() => {
    const local = letterProgress(visualRef.current, index);
    if (!group.current) return;
    group.current.visible = local > 0.001;
    const eased = easeOutBounce(local);
    const settle = easeOutCubic(local);
    group.current.position.set(
      rig.x + rig.drift * (1 - settle),
      baseY + rig.fall * (1 - eased),
      rig.z + 1.2 * (1 - settle),
    );
    group.current.rotation.set(
      -0.05 + 0.42 * (1 - settle),
      rig.yaw + (index % 2 ? 0.72 : -0.72) * (1 - settle),
      rig.tilt + (index % 2 ? -0.58 : 0.58) * (1 - settle),
    );
    const squash = local > 0.86 ? 1 - landingImpact(local) * 0.055 : 1;
    group.current.scale.set(rig.scale / squash, rig.scale * squash, rig.scale / squash);
  });

  return (
    <group ref={group} visible={false}>
      <Center bottom>
        <Text3D
          font={helvetikerBold}
          size={1.42}
          height={0.34}
          curveSegments={8}
          bevelEnabled
          bevelThickness={0.065}
          bevelSize={0.038}
          bevelSegments={4}
          castShadow
        >
          {rig.glyph}
          <meshPhysicalMaterial
            color="#87939d"
            metalness={0.72}
            roughness={0.28}
            clearcoat={0.34}
            clearcoatRoughness={0.22}
            envMapIntensity={1.35}
          />
        </Text3D>
      </Center>
      {rig.macron && (
        <mesh position={[0, 1.72, 0.11]} castShadow>
          <boxGeometry args={[0.9, 0.12, 0.42]} />
          <meshPhysicalMaterial color="#aab6bf" metalness={0.72} roughness={0.3} clearcoat={0.28} />
        </mesh>
      )}
      {rig.dot && (
        <mesh position={[0, -0.11, 0.08]} castShadow>
          <sphereGeometry args={[0.105, 18, 18]} />
          <meshPhysicalMaterial color="#aab6bf" metalness={0.66} roughness={0.32} />
        </mesh>
      )}
      <pointLight position={[0, 0.75, 0.9]} intensity={1.65} distance={3.2} decay={2.1} color="#c9e7ff" />
    </group>
  );
}

function SceneDirector({ loadProgress, mountainRef, visualRef, onSequenceComplete }) {
  const elapsed = useRef(0);
  const hold = useRef(0);
  const completed = useRef(false);
  const { camera } = useThree();

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.045);
    elapsed.current += dt;
    const mountainReveal = easeOutCubic(elapsed.current / MOUNTAIN_REVEAL_SECONDS);
    if (mountainRef.current) mountainRef.current.position.y = THREE.MathUtils.lerp(-5.4, 0, mountainReveal);

    const timeGate = clamp01((elapsed.current - MOUNTAIN_REVEAL_SECONDS) / LETTER_SEQUENCE_SECONDS);
    const loadGate = clamp01(loadProgress / 100);
    const target = Math.min(timeGate, loadGate);
    const damping = 1 - Math.exp(-7.4 * dt);
    visualRef.current = THREE.MathUtils.lerp(visualRef.current, target, damping);

    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 11.1 - visualRef.current * 0.48, 1 - Math.exp(-1.45 * dt));
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 4.35 + visualRef.current * 0.12, 1 - Math.exp(-1.1 * dt));
    camera.lookAt(0, 1.45, 0);

    if (visualRef.current > 0.995 && loadGate > 0.995) hold.current += dt;
    else hold.current = 0;

    if (!completed.current && hold.current >= LETTER_HOLD_SECONDS) {
      completed.current = true;
      onSequenceComplete?.();
    }
  });
  return null;
}

function LadakhWorld({ loadProgress, onSequenceComplete }) {
  const mountains = useRef();
  const visual = useRef(0);
  const { viewport } = useThree();
  const worldScale = Math.min(1, Math.max(0.72, viewport.width / 17.2));

  return (
    <>
      <color attach="background" args={['#04080e']} />
      <fogExp2 attach="fog" args={['#081019', 0.047]} />
      <SceneDirector loadProgress={loadProgress} mountainRef={mountains} visualRef={visual} onSequenceComplete={onSequenceComplete} />
      <NightStars />
      <Moon />
      <ambientLight intensity={0.28} color="#8ea5b4" />
      <hemisphereLight intensity={0.48} color="#9fc6df" groundColor="#03070b" />
      <directionalLight
        castShadow
        position={[5.5, 8.2, 5.2]}
        intensity={3.25}
        color="#d9ecf8"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={9}
        shadow-camera-bottom={-5}
        shadow-bias={-0.00035}
      />
      <directionalLight position={[-6, 2.5, 4]} intensity={1.1} color="#547596" />
      <Environment resolution={64}>
        <Lightformer position={[2, 7, 2]} rotation={[-1.1, 0, 0]} scale={[6, 4, 1]} intensity={2.2} color="#d7eaf5" />
        <Lightformer position={[-7, 1, 0]} rotation={[0, Math.PI / 2, 0]} scale={[2, 9, 1]} intensity={1.2} color="#789bb2" />
      </Environment>

      <group scale={worldScale}>
        <group ref={mountains} position={[0, -5.4, 0]}>
          <MountainMesh distant />
          <MountainMesh />
          <MountainMesh foreground />
          <FogBanks />
          {LETTER_RIGS.map((rig, index) => (
            <React.Fragment key={rig.id}>
              <FallingLetter rig={rig} index={index} visualRef={visual} />
              <ImpactBurst rig={rig} index={index} visualRef={visual} />
            </React.Fragment>
          ))}
        </group>
      </group>

      <SnowField count={820} size={0.062} speed={0.72} opacity={0.62} />
      <SnowField count={310} size={0.13} speed={1.26} opacity={0.82} near />
    </>
  );
}

export default function LadakhPreloaderScene({ loadProgress, onSequenceComplete }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 4.35, 11.1], fov: 49, near: 0.1, far: 70 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.92;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <LadakhWorld loadProgress={loadProgress} onSequenceComplete={onSequenceComplete} />
    </Canvas>
  );
}
