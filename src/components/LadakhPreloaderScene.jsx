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
  easeInCubic,
  easeOutCubic,
  landingBounce,
  landingImpact,
  letterProgress,
} from '../lib/ladakhPreloader';

// Five deliberately separate hero ridges. The previous terrain was effectively a
// set of x-only Gaussian bands, which made the whole range read like a soft cloth.
const HERO_PEAKS = [
  { x: -5.9, z: 0.42, h: 4.05, rx: 1.28, rz: 1.72, angle: -0.18, sharp: 1.0 },
  { x: -3.12, z: -0.34, h: 3.5, rx: 1.1, rz: 1.65, angle: 0.21, sharp: 1.04 },
  { x: 0.0, z: -0.82, h: 5.0, rx: 1.46, rz: 2.05, angle: -0.07, sharp: 0.92 },
  { x: 3.02, z: -0.18, h: 3.58, rx: 1.12, rz: 1.58, angle: -0.2, sharp: 1.05 },
  { x: 5.72, z: 0.5, h: 4.0, rx: 1.25, rz: 1.75, angle: 0.18, sharp: 1.0 },
  { x: -1.55, z: 1.62, h: 1.5, rx: 1.45, rz: 1.45, angle: 0.1, sharp: 1.2 },
  { x: 1.62, z: 1.58, h: 1.42, rx: 1.38, rz: 1.38, angle: -0.12, sharp: 1.18 },
];

const BACK_PEAKS = [
  { x: -7.3, z: 0.1, h: 3.7, rx: 1.8, rz: 2.2, angle: -0.15, sharp: 0.94 },
  { x: -3.9, z: -0.6, h: 4.05, rx: 1.55, rz: 2.1, angle: 0.18, sharp: 0.9 },
  { x: -0.8, z: -0.8, h: 3.35, rx: 1.5, rz: 1.9, angle: -0.1, sharp: 0.98 },
  { x: 2.4, z: -0.3, h: 4.35, rx: 1.7, rz: 2.35, angle: 0.13, sharp: 0.9 },
  { x: 6.6, z: 0.2, h: 3.85, rx: 1.75, rz: 2.2, angle: -0.2, sharp: 0.94 },
];

const FORE_PEAKS = [
  { x: -7.3, z: 0.5, h: 2.65, rx: 2.0, rz: 1.75, angle: -0.1, sharp: 1.05 },
  { x: -2.0, z: 0.2, h: 2.05, rx: 2.15, rz: 1.6, angle: 0.2, sharp: 1.1 },
  { x: 4.8, z: 0.1, h: 2.45, rx: 2.2, rz: 1.7, angle: -0.18, sharp: 1.08 },
];

const PROFILES = {
  hero: { peaks: HERO_PEAKS, floor: -2.45, roughness: 0.78, seed: 2, snowBias: 0.06 },
  distant: { peaks: BACK_PEAKS, floor: -2.2, roughness: 0.58, seed: 13, snowBias: -0.1 },
  foreground: { peaks: FORE_PEAKS, floor: -2.85, roughness: 0.72, seed: 29, snowBias: -0.34 },
};

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

function fbm(x, y, seed = 0, octaves = 4) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave += 1) {
    value += smoothNoise(x * frequency, y * frequency, seed + octave * 17) * amplitude;
    frequency *= 2.04;
    amplitude *= 0.5;
  }
  return value;
}

function ridgedFbm(x, y, seed = 0) {
  let value = 0;
  let amplitude = 0.56;
  let frequency = 1;
  let norm = 0;
  for (let octave = 0; octave < 5; octave += 1) {
    const n = smoothNoise(x * frequency, y * frequency, seed + octave * 23);
    const ridge = 1 - Math.abs(n * 2 - 1);
    value += ridge * ridge * amplitude;
    norm += amplitude;
    frequency *= 2.07;
    amplitude *= 0.48;
  }
  return value / norm;
}

function peakHeight(x, z, peak) {
  const dx = x - peak.x;
  const dz = z - peak.z;
  const c = Math.cos(peak.angle || 0);
  const s = Math.sin(peak.angle || 0);
  const u = (dx * c - dz * s) / peak.rx;
  const v = (dx * s + dz * c) / peak.rz;
  const radius = Math.sqrt(u * u + v * v);
  const cone = Math.pow(saturate(1 - radius), peak.sharp);
  const spine = Math.pow(saturate(1 - Math.abs(u) * 1.55 - Math.abs(v) * 0.54), 2.2);
  return peak.h * (cone * 0.78 + spine * 0.22);
}

function heightForProfile(x, z, profileName = 'hero') {
  const profile = PROFILES[profileName];
  let structural = 0;
  for (const peak of profile.peaks) structural += peakHeight(x, z, peak);

  const mountainMask = saturate(structural / 2.35);
  const ridges = (ridgedFbm(x * 0.54 + 7.2, z * 0.68 - 3.4, profile.seed) - 0.46)
    * profile.roughness * mountainMask;
  const fractured = (fbm(x * 1.18 - 4.7, z * 1.06 + 6.1, profile.seed + 41, 3) - 0.46)
    * 0.42 * mountainMask;
  const gullies = -Math.pow(Math.abs(Math.sin(x * 1.33 + z * 0.82 + profile.seed)), 9)
    * 0.26 * mountainMask;
  const apron = (fbm(x * 0.14, z * 0.18, profile.seed + 71, 3) - 0.5) * 0.28;

  return profile.floor + structural + ridges + fractured + gullies + apron;
}

export function terrainHeight(x, z) {
  return heightForProfile(x, z, 'hero');
}

function makeTerrainGeometry(profileName) {
  const isHero = profileName === 'hero';
  const isDistant = profileName === 'distant';
  const profile = PROFILES[profileName];
  const width = isHero ? 18.4 : isDistant ? 23.5 : 21;
  const depth = isHero ? 9.4 : isDistant ? 8.4 : 7.4;
  const xSegments = isHero ? 154 : isDistant ? 112 : 118;
  const zSegments = isHero ? 82 : isDistant ? 52 : 48;
  const geometry = new THREE.PlaneGeometry(width, depth, xSegments, zSegments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const rock = new THREE.Color(isDistant ? '#111b25' : profileName === 'foreground' ? '#080e14' : '#0d141b');
  const slate = new THREE.Color(isDistant ? '#344657' : '#283844');
  const snow = new THREE.Color(isDistant ? '#a7bac7' : '#d4e0e7');
  const moonSnow = new THREE.Color('#f0f6f9');
  const color = new THREE.Color();
  const eps = 0.085;

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = heightForProfile(x, z, profileName);
    position.setY(i, y);

    const hx = heightForProfile(x + eps, z, profileName) - heightForProfile(x - eps, z, profileName);
    const hz = heightForProfile(x, z + eps, profileName) - heightForProfile(x, z - eps, profileName);
    const steepness = saturate(Math.hypot(hx, hz) / 1.08);
    const grain = fbm(x * 0.86, z * 0.86, profile.seed + 91, 4);
    const altitude = saturate((y - profile.floor - 0.55) / 3.35);
    const windShelf = saturate((smoothNoise(x * 1.8, z * 1.5, profile.seed + 111) - 0.43) * 1.65);
    const snowAmount = saturate(altitude * 1.18 + windShelf * 0.34 - steepness * 0.78 + profile.snowBias);

    color.copy(rock).lerp(slate, saturate(grain * 0.74 + (1 - steepness) * 0.14));
    color.lerp(snow, snowAmount * (isDistant ? 0.66 : 0.86));
    color.lerp(moonSnow, snowAmount * snowAmount * (isDistant ? 0.08 : 0.2));
    color.toArray(colors, i * 3);
  }

  position.needsUpdate = true;
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function MountainMesh({ profile = 'hero' }) {
  const geometry = useMemo(() => makeTerrainGeometry(profile), [profile]);
  const distant = profile === 'distant';
  const foreground = profile === 'foreground';
  return (
    <mesh
      geometry={geometry}
      position={distant ? [0, 0.25, -5.75] : foreground ? [0, -0.18, 4.55] : [0, 0, 0]}
      scale={distant ? [1.05, 0.94, 1.06] : foreground ? [1.06, 1, 1.04] : 1}
      rotation={distant ? [0, 0.018, 0] : foreground ? [0, -0.014, 0] : [0, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        vertexColors
        roughness={0.94}
        metalness={0.01}
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
  gradient.addColorStop(0.2, 'rgba(255,255,255,.94)');
  gradient.addColorStop(0.56, 'rgba(220,235,245,.44)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeMoonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const base = ctx.createRadialGradient(104, 86, 8, 128, 128, 126);
  base.addColorStop(0, '#f2f5f5');
  base.addColorStop(0.58, '#cbd2d5');
  base.addColorStop(1, '#89939a');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 34; i += 1) {
    const x = 24 + hash2(i, 201, 9) * 208;
    const y = 22 + hash2(i, 202, 11) * 212;
    const r = 3 + hash2(i, 203, 13) * 17;
    const crater = ctx.createRadialGradient(x - r * 0.22, y - r * 0.22, 1, x, y, r);
    crater.addColorStop(0, 'rgba(120,128,132,.08)');
    crater.addColorStop(0.68, 'rgba(80,91,98,.32)');
    crater.addColorStop(1, 'rgba(30,38,42,.04)');
    ctx.fillStyle = crater;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function SkyDome() {
  return (
    <mesh scale={38}>
      <sphereGeometry args={[1, 32, 18]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={{
          topColor: { value: new THREE.Color('#01040a') },
          horizonColor: { value: new THREE.Color('#0b1b2a') },
        }}
        vertexShader={`varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
        fragmentShader={`varying float vY; uniform vec3 topColor; uniform vec3 horizonColor; void main(){ float h = smoothstep(-0.22,0.72,vY); gl_FragColor = vec4(mix(horizonColor,topColor,h),1.0); }`}
      />
    </mesh>
  );
}

function SnowField({ count = 860, size = 0.07, speed = 1, opacity = 0.72, near = false }) {
  const points = useRef();
  const texture = useMemo(makeSoftParticleTexture, []);
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocity = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const j = i * 3;
      positions[j] = THREE.MathUtils.lerp(-11.5, 11.5, hash2(i, 1, near ? 19 : 7));
      positions[j + 1] = THREE.MathUtils.lerp(-2.8, 9.8, hash2(i, 2, near ? 19 : 7));
      positions[j + 2] = THREE.MathUtils.lerp(near ? 3.2 : -9.5, near ? 10.5 : 4.8, hash2(i, 3, near ? 19 : 7));
      velocity[j] = THREE.MathUtils.lerp(0.72, 1.65, hash2(i, 4, 5)) * speed;
      velocity[j + 1] = THREE.MathUtils.lerp(0.6, 1.62, hash2(i, 5, 8)) * speed;
      velocity[j + 2] = THREE.MathUtils.lerp(-0.12, 0.12, hash2(i, 6, 11));
    }
    return { positions, velocity };
  }, [count, near, speed]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.045);
    const position = points.current?.geometry.attributes.position;
    if (!position) return;
    const array = position.array;
    const gust = 0.28 + Math.sin(state.clock.elapsedTime * 0.58) * 0.12 + Math.sin(state.clock.elapsedTime * 1.37) * 0.035;
    for (let i = 0; i < count; i += 1) {
      const j = i * 3;
      array[j] += (data.velocity[j] + gust) * dt;
      array[j + 1] -= data.velocity[j + 1] * dt;
      array[j + 2] += data.velocity[j + 2] * dt;
      if (array[j] > 12 || array[j + 1] < -3.5) {
        array[j] = -11.7 + hash2(i, Math.floor(state.clock.elapsedTime), 91) * 3.4;
        array[j + 1] = 8.2 + hash2(i, Math.floor(state.clock.elapsedTime) + 2, 37) * 2.8;
        array[j + 2] = THREE.MathUtils.lerp(near ? 3.2 : -9.5, near ? 10.5 : 4.8, hash2(i, 9, 15));
      }
    }
    position.needsUpdate = true;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[data.positions, 3]} /></bufferGeometry>
      <pointsMaterial
        map={texture}
        alphaMap={texture}
        transparent
        opacity={opacity}
        size={size}
        sizeAttenuation
        depthWrite={false}
        color="#f2f7fa"
        blending={near ? THREE.NormalBlending : THREE.AdditiveBlending}
      />
    </points>
  );
}

function NightStars() {
  const positions = useMemo(() => {
    const points = new Float32Array(340 * 3);
    for (let i = 0; i < 340; i += 1) {
      points[i * 3] = THREE.MathUtils.lerp(-14, 14, hash2(i, 31, 4));
      points[i * 3 + 1] = THREE.MathUtils.lerp(4.6, 11.5, hash2(i, 32, 6));
      points[i * 3 + 2] = THREE.MathUtils.lerp(-13, -8.5, hash2(i, 33, 8));
    }
    return points;
  }, []);
  return (
    <points>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial size={0.022} color="#d8e7ef" transparent opacity={0.5} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function FogBanks() {
  const group = useRef();
  const texture = useMemo(makeSoftParticleTexture, []);
  const banks = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    x: THREE.MathUtils.lerp(-9.2, 9.2, hash2(i, 51, 14)),
    y: THREE.MathUtils.lerp(-1.7, 1.0, hash2(i, 52, 15)),
    z: THREE.MathUtils.lerp(-2.2, 5.6, hash2(i, 53, 16)),
    scale: THREE.MathUtils.lerp(2.2, 5.4, hash2(i, 54, 17)),
  })), []);
  useFrame((state) => {
    if (group.current) group.current.position.x = Math.sin(state.clock.elapsedTime * 0.075) * 0.52;
  });
  return (
    <group ref={group}>
      {banks.map((bank, index) => (
        <sprite key={index} position={[bank.x, bank.y, bank.z]} scale={[bank.scale * 1.95, bank.scale, 1]}>
          <spriteMaterial map={texture} transparent opacity={0.045 + (index % 4) * 0.014} color="#9cb0bd" depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

function Moon() {
  const glow = useMemo(makeSoftParticleTexture, []);
  const moon = useMemo(makeMoonTexture, []);
  return (
    <group position={[5.3, 6.2, -9.4]}>
      <sprite scale={[3.35, 3.35, 1]}><spriteMaterial map={glow} transparent opacity={0.28} color="#d8e8f5" depthWrite={false} /></sprite>
      <mesh rotation={[0.1, -0.3, 0]}>
        <sphereGeometry args={[0.52, 40, 40]} />
        <meshStandardMaterial map={moon} emissive="#61717e" emissiveIntensity={0.72} roughness={1} toneMapped />
      </mesh>
      <pointLight intensity={25} distance={24} decay={2} color="#bad9ef" />
    </group>
  );
}

function ImpactBurst({ rig, index, visualRef }) {
  const group = useRef();
  const points = useRef();
  const pointMaterial = useRef();
  const puffA = useRef();
  const puffB = useRef();
  const puffAMaterial = useRef();
  const puffBMaterial = useRef();
  const lastLocal = useRef(0);
  const startedAt = useRef(-1);
  const baseY = terrainHeight(rig.x, rig.z) + 0.13;
  const texture = useMemo(makeSoftParticleTexture, []);
  const particleData = useMemo(() => {
    const count = 132;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = hash2(i, index + 70, 42) * Math.PI * 2;
      const radial = THREE.MathUtils.lerp(0.8, 2.65, hash2(i, index + 71, 43)) * (rig.impact || 1);
      const vertical = THREE.MathUtils.lerp(1.35, 3.6, hash2(i, index + 72, 44)) * (rig.impact || 1);
      velocities[i * 3] = Math.cos(angle) * radial;
      velocities[i * 3 + 1] = vertical;
      velocities[i * 3 + 2] = Math.sin(angle) * radial * THREE.MathUtils.lerp(0.48, 0.9, hash2(i, index + 73, 45));
    }
    return { count, positions, velocities };
  }, [index, rig.impact]);

  useFrame((state) => {
    const local = letterProgress(visualRef.current, index);
    if (local >= 0.74 && lastLocal.current < 0.74 && startedAt.current < 0) startedAt.current = state.clock.elapsedTime;
    lastLocal.current = local;
    if (!group.current || startedAt.current < 0) return;

    const age = state.clock.elapsedTime - startedAt.current;
    const duration = 1.08;
    const t = clamp01(age / duration);
    group.current.visible = age <= duration;
    if (age > duration) return;

    const attribute = points.current?.geometry.attributes.position;
    if (attribute) {
      const p = attribute.array;
      const v = particleData.velocities;
      for (let i = 0; i < particleData.count; i += 1) {
        const j = i * 3;
        const swirl = Math.sin(age * 8.5 + i * 0.71) * 0.055 * age;
        p[j] = v[j] * age + swirl;
        p[j + 1] = 0.035 + v[j + 1] * age - 3.25 * age * age;
        p[j + 2] = v[j + 2] * age;
      }
      attribute.needsUpdate = true;
    }

    const fade = Math.pow(1 - t, 1.45);
    if (pointMaterial.current) {
      pointMaterial.current.opacity = fade * 0.96;
      pointMaterial.current.size = 0.105 + t * 0.055;
    }
    const puffScale = (0.55 + t * 2.7) * (rig.impact || 1);
    if (puffA.current) puffA.current.scale.set(puffScale * 1.55, puffScale * 0.72, 1);
    if (puffB.current) puffB.current.scale.set(puffScale * 1.15, puffScale * 0.9, 1);
    if (puffAMaterial.current) puffAMaterial.current.opacity = fade * 0.24;
    if (puffBMaterial.current) puffBMaterial.current.opacity = fade * 0.18;
  });

  return (
    <group ref={group} position={[rig.x, baseY, rig.z + 0.04]} visible={false}>
      <points ref={points} frustumCulled={false}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[particleData.positions, 3]} /></bufferGeometry>
        <pointsMaterial ref={pointMaterial} map={texture} alphaMap={texture} transparent depthWrite={false} size={0.105} color="#f5fafc" sizeAttenuation />
      </points>
      <sprite ref={puffA} position={[0, 0.2, 0.08]}>
        <spriteMaterial ref={puffAMaterial} map={texture} transparent opacity={0} color="#eaf4f8" depthWrite={false} />
      </sprite>
      <sprite ref={puffB} position={[0.22, 0.36, -0.12]}>
        <spriteMaterial ref={puffBMaterial} map={texture} transparent opacity={0} color="#dcebf2" depthWrite={false} />
      </sprite>
    </group>
  );
}

function FallingLetter({ rig, index, visualRef }) {
  const group = useRef();
  const baseY = terrainHeight(rig.x, rig.z) + 0.16;
  const slope = useMemo(() => {
    const e = 0.11;
    const sx = (terrainHeight(rig.x + e, rig.z) - terrainHeight(rig.x - e, rig.z)) / (2 * e);
    const sz = (terrainHeight(rig.x, rig.z + e) - terrainHeight(rig.x, rig.z - e)) / (2 * e);
    return {
      roll: THREE.MathUtils.clamp(-Math.atan(sx) * 0.16, -0.1, 0.1),
      pitch: THREE.MathUtils.clamp(Math.atan(sz) * 0.13, -0.08, 0.08),
    };
  }, [rig.x, rig.z]);

  useFrame(() => {
    const local = letterProgress(visualRef.current, index);
    if (!group.current) return;
    group.current.visible = local > 0.001;

    const contact = 0.76;
    const fallT = clamp01(local / contact);
    const descent = easeInCubic(fallT); // acceleration reads as gravity, not a UI easing
    const settle = easeOutCubic(fallT);
    const bounce = landingBounce(local) * 0.18 * (rig.impact || 1);

    group.current.position.set(
      rig.x + rig.drift * (1 - settle),
      baseY + rig.fall * (1 - descent) + bounce,
      rig.z + 1.35 * (1 - settle),
    );
    group.current.rotation.set(
      slope.pitch + 0.44 * (1 - settle),
      rig.yaw + (index % 2 ? 0.72 : -0.72) * (1 - settle),
      rig.tilt + slope.roll + (index % 2 ? -0.6 : 0.6) * (1 - settle),
    );

    const impact = landingImpact(local);
    const squash = 1 - impact * 0.06;
    group.current.scale.set(rig.scale / squash, rig.scale * squash, rig.scale / squash);
  });

  return (
    <group ref={group} visible={false}>
      <Center bottom>
        <Text3D
          font={helvetikerBold}
          size={1.5}
          height={0.42}
          curveSegments={10}
          bevelEnabled
          bevelThickness={0.075}
          bevelSize={0.045}
          bevelSegments={5}
          castShadow
          receiveShadow
        >
          {rig.glyph}
          <meshPhysicalMaterial
            color="#73828e"
            metalness={0.64}
            roughness={0.3}
            clearcoat={0.2}
            clearcoatRoughness={0.28}
            envMapIntensity={1.48}
          />
        </Text3D>
      </Center>
      {rig.macron && (
        <mesh position={[0, 1.82, 0.12]} castShadow receiveShadow>
          <boxGeometry args={[0.96, 0.13, 0.48]} />
          <meshPhysicalMaterial color="#9aa8b1" metalness={0.64} roughness={0.31} clearcoat={0.18} />
        </mesh>
      )}
      {rig.dot && (
        <mesh position={[0, -0.12, 0.09]} castShadow>
          <sphereGeometry args={[0.11, 20, 20]} />
          <meshPhysicalMaterial color="#9aa8b1" metalness={0.6} roughness={0.34} />
        </mesh>
      )}
      <pointLight position={[0, 0.78, 0.95]} intensity={1.25} distance={3.2} decay={2.1} color="#c6e4f7" />
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
    if (mountainRef.current) mountainRef.current.position.y = THREE.MathUtils.lerp(-4.9, 0, mountainReveal);

    const timeGate = clamp01((elapsed.current - MOUNTAIN_REVEAL_SECONDS) / LETTER_SEQUENCE_SECONDS);
    const loadGate = clamp01(loadProgress / 100);
    const target = Math.min(timeGate, loadGate);
    const damping = 1 - Math.exp(-7.6 * dt);
    visualRef.current = THREE.MathUtils.lerp(visualRef.current, target, damping);

    let impactEnergy = 0;
    for (let i = 0; i < LETTER_RIGS.length; i += 1) {
      impactEnergy = Math.max(impactEnergy, landingImpact(letterProgress(visualRef.current, i)));
    }
    const shake = impactEnergy * 0.052;
    const baseZ = 12.75 - visualRef.current * 0.36;
    const baseY = 3.92 + visualRef.current * 0.08;
    const parallax = Math.sin(elapsed.current * 0.17) * 0.075;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, parallax + Math.sin(elapsed.current * 73) * shake, 1 - Math.exp(-5 * dt));
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, baseY + Math.cos(elapsed.current * 67) * shake * 0.55, 1 - Math.exp(-2.0 * dt));
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, baseZ, 1 - Math.exp(-1.45 * dt));
    camera.lookAt(0, 1.18, -0.72);

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
  const worldScale = Math.min(1.02, Math.max(0.75, viewport.width / 18.4));

  return (
    <>
      <color attach="background" args={['#02050a']} />
      <fogExp2 attach="fog" args={['#08131d', 0.039]} />
      <SkyDome />
      <SceneDirector loadProgress={loadProgress} mountainRef={mountains} visualRef={visual} onSequenceComplete={onSequenceComplete} />
      <NightStars />
      <Moon />

      <ambientLight intensity={0.2} color="#7792a3" />
      <hemisphereLight intensity={0.38} color="#a8c9dc" groundColor="#020508" />
      <directionalLight
        castShadow
        position={[6.8, 9.5, 6.2]}
        intensity={3.8}
        color="#d9edf8"
        shadow-mapSize={[1536, 1536]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={9}
        shadow-camera-bottom={-5}
        shadow-bias={-0.00028}
      />
      <directionalLight position={[-7, 3.2, 4.2]} intensity={0.95} color="#476a88" />
      <Environment resolution={64}>
        <Lightformer position={[2, 7, 2]} rotation={[-1.1, 0, 0]} scale={[7, 4, 1]} intensity={2.4} color="#d7eaf5" />
        <Lightformer position={[-7, 1, 0]} rotation={[0, Math.PI / 2, 0]} scale={[2, 10, 1]} intensity={1.1} color="#789bb2" />
      </Environment>

      <group scale={worldScale}>
        <group ref={mountains} position={[0, -4.9, 0]}>
          <MountainMesh profile="distant" />
          <MountainMesh profile="hero" />
          <FogBanks />
          {LETTER_RIGS.map((rig, index) => (
            <React.Fragment key={rig.id}>
              <FallingLetter rig={rig} index={index} visualRef={visual} />
              <ImpactBurst rig={rig} index={index} visualRef={visual} />
            </React.Fragment>
          ))}
          <MountainMesh profile="foreground" />
        </group>
      </group>

      <SnowField count={980} size={0.055} speed={0.78} opacity={0.58} />
      <SnowField count={390} size={0.165} speed={1.32} opacity={0.84} near />
    </>
  );
}

export default function LadakhPreloaderScene({ loadProgress, onSequenceComplete }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.65]}
      camera={{ position: [0, 3.92, 12.75], fov: 44, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.96;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <LadakhWorld loadProgress={loadProgress} onSequenceComplete={onSequenceComplete} />
    </Canvas>
  );
}
