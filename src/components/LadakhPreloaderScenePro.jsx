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
import { LandingCompression, MoonCloudVeil, RidgeSpindrift } from './LadakhCinematicFX';

/*
 * High-altitude Ladakh preloader.
 *
 * Design rules:
 * - PRĀṆA itself is the loading indicator. There is deliberately no bar.
 * - Each glyph belongs to a different ridge, height, depth and slope.
 * - Terrain is actual displaced 3D geometry, not a backdrop.
 * - Snow impact has fine powder, heavier chunks, contact compression and residual drift.
 * - Atmosphere stays physically restrained: moonlight, aerial haze, spindrift, no neon sci-fi glow.
 */

const HERO_PEAKS = [
  { x: -5.9, z: 0.42, h: 4.2, rx: 1.28, rz: 1.78, angle: -0.18, sharp: 0.94 },
  { x: -3.12, z: -0.34, h: 3.55, rx: 1.08, rz: 1.62, angle: 0.22, sharp: 1.03 },
  { x: 0.0, z: -0.82, h: 5.16, rx: 1.45, rz: 2.04, angle: -0.07, sharp: 0.9 },
  { x: 3.02, z: -0.18, h: 3.62, rx: 1.1, rz: 1.55, angle: -0.2, sharp: 1.04 },
  { x: 5.72, z: 0.5, h: 4.05, rx: 1.22, rz: 1.72, angle: 0.18, sharp: 0.98 },
  { x: -1.56, z: 1.62, h: 1.58, rx: 1.46, rz: 1.4, angle: 0.11, sharp: 1.18 },
  { x: 1.62, z: 1.58, h: 1.48, rx: 1.38, rz: 1.36, angle: -0.12, sharp: 1.17 },
];

const DISTANT_PEAKS = [
  { x: -8.2, z: 0.2, h: 3.5, rx: 2.0, rz: 2.3, angle: -0.1, sharp: 0.95 },
  { x: -4.7, z: -0.4, h: 4.25, rx: 1.72, rz: 2.25, angle: 0.17, sharp: 0.88 },
  { x: -1.3, z: -0.55, h: 3.25, rx: 1.55, rz: 1.95, angle: -0.12, sharp: 0.98 },
  { x: 2.25, z: -0.3, h: 4.5, rx: 1.78, rz: 2.35, angle: 0.14, sharp: 0.88 },
  { x: 6.2, z: 0.15, h: 3.95, rx: 1.85, rz: 2.2, angle: -0.2, sharp: 0.93 },
  { x: 9.2, z: -0.2, h: 3.3, rx: 1.8, rz: 2.0, angle: 0.08, sharp: 0.98 },
];

const FOREGROUND_PEAKS = [
  { x: -7.6, z: 0.5, h: 2.72, rx: 2.1, rz: 1.68, angle: -0.12, sharp: 1.04 },
  { x: -2.15, z: 0.2, h: 2.14, rx: 2.18, rz: 1.56, angle: 0.2, sharp: 1.08 },
  { x: 4.9, z: 0.1, h: 2.52, rx: 2.25, rz: 1.7, angle: -0.18, sharp: 1.06 },
];

const PROFILES = {
  hero: { peaks: HERO_PEAKS, floor: -2.5, seed: 3, roughness: 0.83, snowBias: 0.08 },
  distant: { peaks: DISTANT_PEAKS, floor: -2.22, seed: 17, roughness: 0.57, snowBias: -0.12 },
  foreground: { peaks: FOREGROUND_PEAKS, floor: -2.88, seed: 31, roughness: 0.72, snowBias: -0.38 },
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
    frequency *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

function ridgedFbm(x, y, seed = 0) {
  let value = 0;
  let amplitude = 0.57;
  let frequency = 1;
  let norm = 0;
  for (let octave = 0; octave < 5; octave += 1) {
    const n = smoothNoise(x * frequency, y * frequency, seed + octave * 23);
    const ridge = 1 - Math.abs(n * 2 - 1);
    value += ridge * ridge * amplitude;
    norm += amplitude;
    frequency *= 2.06;
    amplitude *= 0.47;
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
  const spine = Math.pow(saturate(1 - Math.abs(u) * 1.48 - Math.abs(v) * 0.5), 2.25);
  const shoulder = Math.pow(saturate(1 - Math.abs(u) * 0.78 - Math.abs(v) * 1.22), 2.6);
  return peak.h * (cone * 0.72 + spine * 0.2 + shoulder * 0.08);
}

function heightForProfile(x, z, profileName = 'hero') {
  const profile = PROFILES[profileName];
  let structural = 0;
  for (const peak of profile.peaks) structural += peakHeight(x, z, peak);

  const mask = saturate(structural / 2.25);
  const warp = (fbm(x * 0.25 + 2.3, z * 0.28 - 5.7, profile.seed + 9, 3) - 0.5) * 1.25;
  const ridges = (ridgedFbm(x * 0.56 + 7.2 + warp, z * 0.7 - 3.4, profile.seed) - 0.46)
    * profile.roughness * mask;
  const fracture = (fbm(x * 1.25 - 4.7, z * 1.1 + 6.1, profile.seed + 41, 3) - 0.47)
    * 0.46 * mask;
  const channelNoise = fbm(x * 0.45 + 1.9, z * 0.55 - 2.2, profile.seed + 63, 3) - 0.5;
  const channel = Math.abs(Math.sin((x + channelNoise * 1.45) * 1.28 + z * 0.76 + profile.seed));
  const gullies = -Math.pow(saturate(1 - channel * 4.2), 2.7) * 0.32 * mask;
  const talus = (fbm(x * 0.15, z * 0.18, profile.seed + 71, 3) - 0.5) * 0.24;

  return profile.floor + structural + ridges + fracture + gullies + talus;
}

export function terrainHeight(x, z) {
  return heightForProfile(x, z, 'hero');
}

function makeTerrainGeometry(profileName) {
  const profile = PROFILES[profileName];
  const hero = profileName === 'hero';
  const distant = profileName === 'distant';
  const width = hero ? 18.7 : distant ? 24.5 : 21.5;
  const depth = hero ? 9.6 : distant ? 8.7 : 7.5;
  const xSegments = hero ? 164 : distant ? 116 : 120;
  const zSegments = hero ? 88 : distant ? 54 : 50;
  const geometry = new THREE.PlaneGeometry(width, depth, xSegments, zSegments);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const rock = new THREE.Color(distant ? '#111b25' : profileName === 'foreground' ? '#070c11' : '#0b1218');
  const slate = new THREE.Color(distant ? '#324554' : '#263640');
  const snow = new THREE.Color(distant ? '#a3b5c0' : '#d5e0e6');
  const moonSnow = new THREE.Color('#f2f7f9');
  const shadowBlue = new THREE.Color('#182733');
  const color = new THREE.Color();
  const eps = 0.085;

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = heightForProfile(x, z, profileName);
    position.setY(i, y);

    const hx = heightForProfile(x + eps, z, profileName) - heightForProfile(x - eps, z, profileName);
    const hz = heightForProfile(x, z + eps, profileName) - heightForProfile(x, z - eps, profileName);
    const steepness = saturate(Math.hypot(hx, hz) / 1.02);
    const altitude = saturate((y - profile.floor - 0.5) / 3.4);
    const grain = fbm(x * 0.9, z * 0.88, profile.seed + 91, 4);
    const shelf = saturate((smoothNoise(x * 1.75, z * 1.52, profile.seed + 111) - 0.42) * 1.72);
    const leeSide = saturate(0.5 + hx * 0.14 - hz * 0.08);
    const snowAmount = saturate(altitude * 1.18 + shelf * 0.34 + leeSide * 0.12 - steepness * 0.8 + profile.snowBias);

    color.copy(rock).lerp(slate, saturate(grain * 0.72 + (1 - steepness) * 0.12));
    color.lerp(shadowBlue, steepness * 0.12);
    color.lerp(snow, snowAmount * (distant ? 0.65 : 0.88));
    color.lerp(moonSnow, snowAmount * snowAmount * (distant ? 0.08 : 0.2));
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
      position={distant ? [0, 0.22, -6.1] : foreground ? [0, -0.16, 4.8] : [0, 0, 0]}
      scale={distant ? [1.04, 0.94, 1.06] : foreground ? [1.06, 1, 1.04] : 1}
      rotation={distant ? [0, 0.018, 0] : foreground ? [0, -0.014, 0] : [0, 0, 0]}
      castShadow={!distant}
      receiveShadow
    >
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0.01} side={THREE.DoubleSide} fog />
    </mesh>
  );
}

function makeSoftTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const gradient = ctx.createRadialGradient(c * .82, c * .8, 0, c, c, c - 1);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.2, 'rgba(255,255,255,.94)');
  gradient.addColorStop(.56, 'rgba(220,235,245,.42)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeMoonTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const base = ctx.createRadialGradient(102, 82, 8, 128, 128, 126);
  base.addColorStop(0, '#f3f5f4');
  base.addColorStop(.58, '#cbd2d5');
  base.addColorStop(1, '#89939a');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  ctx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 38; i += 1) {
    const x = 22 + hash2(i, 201, 9) * 212;
    const y = 20 + hash2(i, 202, 11) * 216;
    const r = 3 + hash2(i, 203, 13) * 18;
    const crater = ctx.createRadialGradient(x - r * .22, y - r * .22, 1, x, y, r);
    crater.addColorStop(0, 'rgba(125,132,136,.06)');
    crater.addColorStop(.7, 'rgba(78,88,94,.32)');
    crater.addColorStop(1, 'rgba(30,38,42,.03)');
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
    <mesh scale={40}>
      <sphereGeometry args={[1, 36, 20]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={{
          topColor: { value: new THREE.Color('#010309') },
          midColor: { value: new THREE.Color('#06111d') },
          horizonColor: { value: new THREE.Color('#102331') },
        }}
        vertexShader={`varying float vY; void main(){ vY=normalize(position).y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
        fragmentShader={`varying float vY; uniform vec3 topColor; uniform vec3 midColor; uniform vec3 horizonColor; void main(){ float a=smoothstep(-.2,.3,vY); float b=smoothstep(.2,.78,vY); vec3 c=mix(horizonColor,midColor,a); c=mix(c,topColor,b); gl_FragColor=vec4(c,1.0); }`}
      />
    </mesh>
  );
}

function NightStars() {
  const points = useRef();
  const material = useRef();
  const positions = useMemo(() => {
    const array = new Float32Array(330 * 3);
    for (let i = 0; i < 330; i += 1) {
      array[i * 3] = THREE.MathUtils.lerp(-15, 15, hash2(i, 31, 4));
      array[i * 3 + 1] = THREE.MathUtils.lerp(4.8, 12, hash2(i, 32, 6));
      array[i * 3 + 2] = THREE.MathUtils.lerp(-14, -9, hash2(i, 33, 8));
    }
    return array;
  }, []);
  useFrame((state) => {
    if (points.current) points.current.rotation.y = Math.sin(state.clock.elapsedTime * .012) * .014;
    if (material.current) material.current.opacity = .42 + Math.sin(state.clock.elapsedTime * .38) * .05;
  });
  return (
    <points ref={points}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial ref={material} size={.021} color="#d8e7ef" transparent opacity={.44} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function Moon() {
  const glow = useMemo(makeSoftTexture, []);
  const moon = useMemo(makeMoonTexture, []);
  return (
    <group position={[5.45, 6.35, -9.8]}>
      <sprite scale={[3.7, 3.7, 1]}><spriteMaterial map={glow} transparent opacity={.23} color="#d8e8f5" depthWrite={false} /></sprite>
      <mesh rotation={[.12, -.28, 0]}>
        <sphereGeometry args={[.5, 42, 42]} />
        <meshStandardMaterial map={moon} emissive="#61717e" emissiveIntensity={.68} roughness={1} />
      </mesh>
      <pointLight intensity={22} distance={24} decay={2} color="#b9d8ed" />
    </group>
  );
}

function ValleyMist() {
  const group = useRef();
  const texture = useMemo(makeSoftTexture, []);
  const banks = useMemo(() => Array.from({ length: 13 }, (_, i) => ({
    x: THREE.MathUtils.lerp(-9.4, 9.4, hash2(i, 51, 14)),
    y: THREE.MathUtils.lerp(-1.75, .65, hash2(i, 52, 15)),
    z: THREE.MathUtils.lerp(-3.6, 5.2, hash2(i, 53, 16)),
    sx: THREE.MathUtils.lerp(3.8, 8.2, hash2(i, 54, 17)),
    sy: THREE.MathUtils.lerp(.8, 1.85, hash2(i, 55, 18)),
    opacity: THREE.MathUtils.lerp(.025, .075, hash2(i, 56, 19)),
  })), []);
  useFrame((state) => {
    if (!group.current) return;
    group.current.position.x = Math.sin(state.clock.elapsedTime * .07) * .48;
    group.current.position.z = Math.sin(state.clock.elapsedTime * .042) * .1;
  });
  return (
    <group ref={group}>
      {banks.map((bank, i) => (
        <sprite key={i} position={[bank.x, bank.y, bank.z]} scale={[bank.sx, bank.sy, 1]}>
          <spriteMaterial map={texture} transparent opacity={bank.opacity} color="#8fa6b5" depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

function SnowField({ count = 850, size = .065, speed = 1, opacity = .7, near = false }) {
  const points = useRef();
  const texture = useMemo(makeSoftTexture, []);
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocity = new Float32Array(count * 3);
    const wobble = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const j = i * 3;
      positions[j] = THREE.MathUtils.lerp(-12, 12, hash2(i, 1, near ? 19 : 7));
      positions[j + 1] = THREE.MathUtils.lerp(-3, 10.2, hash2(i, 2, near ? 19 : 7));
      positions[j + 2] = THREE.MathUtils.lerp(near ? 3.2 : -10, near ? 11 : 4.8, hash2(i, 3, near ? 19 : 7));
      velocity[j] = THREE.MathUtils.lerp(.72, 1.65, hash2(i, 4, 5)) * speed;
      velocity[j + 1] = THREE.MathUtils.lerp(.58, 1.58, hash2(i, 5, 8)) * speed;
      velocity[j + 2] = THREE.MathUtils.lerp(-.11, .11, hash2(i, 6, 11));
      wobble[i] = hash2(i, 7, 13) * Math.PI * 2;
    }
    return { positions, velocity, wobble };
  }, [count, near, speed]);

  useFrame((state, delta) => {
    const attribute = points.current?.geometry.attributes.position;
    if (!attribute) return;
    const p = attribute.array;
    const dt = Math.min(delta, .045);
    const t = state.clock.elapsedTime;
    const gust = .28 + Math.sin(t * .58) * .12 + Math.sin(t * 1.37) * .035;
    for (let i = 0; i < count; i += 1) {
      const j = i * 3;
      p[j] += (data.velocity[j] + gust + Math.sin(t * 1.7 + data.wobble[i]) * .06) * dt;
      p[j + 1] -= data.velocity[j + 1] * dt;
      p[j + 2] += data.velocity[j + 2] * dt;
      if (p[j] > 12.5 || p[j + 1] < -3.5) {
        p[j] = -12.2 + hash2(i, Math.floor(t), 91) * 3.2;
        p[j + 1] = 8.4 + hash2(i, Math.floor(t) + 2, 37) * 3;
        p[j + 2] = THREE.MathUtils.lerp(near ? 3.2 : -10, near ? 11 : 4.8, hash2(i, 9, 15));
      }
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={points} frustumCulled={false} renderOrder={near ? 10 : 2}>
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

function ImpactBurst({ rig, index, visualRef }) {
  const group = useRef();
  const fine = useRef();
  const coarse = useRef();
  const fineMaterial = useRef();
  const coarseMaterial = useRef();
  const puffA = useRef();
  const puffB = useRef();
  const puffAMaterial = useRef();
  const puffBMaterial = useRef();
  const lastLocal = useRef(0);
  const startedAt = useRef(-1);
  const baseY = terrainHeight(rig.x, rig.z) + .14;
  const texture = useMemo(makeSoftTexture, []);

  const fineData = useMemo(() => {
    const count = 150;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = hash2(i, index + 70, 42) * Math.PI * 2;
      const radial = THREE.MathUtils.lerp(.85, 2.9, hash2(i, index + 71, 43)) * (rig.impact || 1);
      const vertical = THREE.MathUtils.lerp(1.45, 3.85, hash2(i, index + 72, 44)) * (rig.impact || 1);
      velocities[i * 3] = Math.cos(angle) * radial;
      velocities[i * 3 + 1] = vertical;
      velocities[i * 3 + 2] = Math.sin(angle) * radial * THREE.MathUtils.lerp(.46, .92, hash2(i, index + 73, 45));
    }
    return { count, positions, velocities };
  }, [index, rig.impact]);

  const coarseData = useMemo(() => {
    const count = 34;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = hash2(i, index + 90, 72) * Math.PI * 2;
      const radial = THREE.MathUtils.lerp(.55, 1.75, hash2(i, index + 91, 73)) * (rig.impact || 1);
      const vertical = THREE.MathUtils.lerp(1.0, 2.55, hash2(i, index + 92, 74)) * (rig.impact || 1);
      velocities[i * 3] = Math.cos(angle) * radial;
      velocities[i * 3 + 1] = vertical;
      velocities[i * 3 + 2] = Math.sin(angle) * radial * .72;
    }
    return { count, positions, velocities };
  }, [index, rig.impact]);

  useFrame((state) => {
    const local = letterProgress(visualRef.current, index);
    if (local >= .74 && lastLocal.current < .74 && startedAt.current < 0) startedAt.current = state.clock.elapsedTime;
    lastLocal.current = local;
    if (!group.current || startedAt.current < 0) return;

    const age = state.clock.elapsedTime - startedAt.current;
    const duration = 1.3;
    const t = clamp01(age / duration);
    group.current.visible = age <= duration;
    if (age > duration) return;

    const fineAttr = fine.current?.geometry.attributes.position;
    if (fineAttr) {
      const p = fineAttr.array;
      const v = fineData.velocities;
      for (let i = 0; i < fineData.count; i += 1) {
        const j = i * 3;
        const swirl = Math.sin(age * 8 + i * .71) * .065 * age;
        p[j] = v[j] * age + swirl + age * age * .12;
        p[j + 1] = .03 + v[j + 1] * age - 3.3 * age * age;
        p[j + 2] = v[j + 2] * age;
      }
      fineAttr.needsUpdate = true;
    }

    const coarseAttr = coarse.current?.geometry.attributes.position;
    if (coarseAttr) {
      const p = coarseAttr.array;
      const v = coarseData.velocities;
      for (let i = 0; i < coarseData.count; i += 1) {
        const j = i * 3;
        p[j] = v[j] * age + age * age * .08;
        p[j + 1] = .05 + v[j + 1] * age - 4.1 * age * age;
        p[j + 2] = v[j + 2] * age;
      }
      coarseAttr.needsUpdate = true;
    }

    const fineFade = Math.pow(1 - t, 1.4);
    const coarseFade = Math.pow(1 - t, 2.2);
    if (fineMaterial.current) {
      fineMaterial.current.opacity = fineFade * .96;
      fineMaterial.current.size = .095 + t * .065;
    }
    if (coarseMaterial.current) {
      coarseMaterial.current.opacity = coarseFade * .88;
      coarseMaterial.current.size = .14 - t * .035;
    }

    const puffScale = (.55 + t * 3.15) * (rig.impact || 1);
    if (puffA.current) puffA.current.scale.set(puffScale * 1.65, puffScale * .7, 1);
    if (puffB.current) puffB.current.scale.set(puffScale * 1.2, puffScale * .96, 1);
    if (puffAMaterial.current) puffAMaterial.current.opacity = fineFade * .23;
    if (puffBMaterial.current) puffBMaterial.current.opacity = fineFade * .16;
  });

  return (
    <group ref={group} position={[rig.x, baseY, rig.z + .04]} visible={false}>
      <points ref={fine} frustumCulled={false} renderOrder={7}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[fineData.positions, 3]} /></bufferGeometry>
        <pointsMaterial ref={fineMaterial} map={texture} alphaMap={texture} transparent depthWrite={false} size={.095} color="#f6fbfd" sizeAttenuation />
      </points>
      <points ref={coarse} frustumCulled={false} renderOrder={8}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[coarseData.positions, 3]} /></bufferGeometry>
        <pointsMaterial ref={coarseMaterial} map={texture} alphaMap={texture} transparent depthWrite={false} size={.14} color="#dce8ee" sizeAttenuation />
      </points>
      <sprite ref={puffA} position={[0, .2, .08]}><spriteMaterial ref={puffAMaterial} map={texture} transparent opacity={0} color="#edf6fa" depthWrite={false} /></sprite>
      <sprite ref={puffB} position={[.2, .38, -.12]}><spriteMaterial ref={puffBMaterial} map={texture} transparent opacity={0} color="#d9e9f0" depthWrite={false} /></sprite>
    </group>
  );
}

function FallingLetter({ rig, index, visualRef }) {
  const group = useRef();
  const baseY = terrainHeight(rig.x, rig.z) + .16;
  const slope = useMemo(() => {
    const e = .11;
    const sx = (terrainHeight(rig.x + e, rig.z) - terrainHeight(rig.x - e, rig.z)) / (2 * e);
    const sz = (terrainHeight(rig.x, rig.z + e) - terrainHeight(rig.x, rig.z - e)) / (2 * e);
    return {
      roll: THREE.MathUtils.clamp(-Math.atan(sx) * .17, -.11, .11),
      pitch: THREE.MathUtils.clamp(Math.atan(sz) * .14, -.09, .09),
    };
  }, [rig.x, rig.z]);

  useFrame(() => {
    const local = letterProgress(visualRef.current, index);
    if (!group.current) return;
    group.current.visible = local > .001;

    const contact = .76;
    const fallT = clamp01(local / contact);
    const descent = easeInCubic(fallT);
    const settle = easeOutCubic(fallT);
    const bounce = landingBounce(local) * .19 * (rig.impact || 1);

    group.current.position.set(
      rig.x + rig.drift * (1 - settle),
      baseY + rig.fall * (1 - descent) + bounce,
      rig.z + 1.38 * (1 - settle),
    );
    group.current.rotation.set(
      slope.pitch + .45 * (1 - settle),
      rig.yaw + (index % 2 ? .72 : -.72) * (1 - settle),
      rig.tilt + slope.roll + (index % 2 ? -.6 : .6) * (1 - settle),
    );

    const impact = landingImpact(local);
    const squash = 1 - impact * .058;
    group.current.scale.set(rig.scale / squash, rig.scale * squash, rig.scale / squash);
  });

  const material = (
    <meshPhysicalMaterial
      color="#7f8c95"
      metalness={.58}
      roughness={.34}
      clearcoat={.24}
      clearcoatRoughness={.32}
      envMapIntensity={1.42}
    />
  );

  return (
    <group ref={group} visible={false}>
      <Center bottom>
        <Text3D
          font={helvetikerBold}
          size={1.5}
          height={.44}
          curveSegments={10}
          bevelEnabled
          bevelThickness={.075}
          bevelSize={.045}
          bevelSegments={5}
          castShadow
          receiveShadow
        >
          {rig.glyph}
          {material}
        </Text3D>
      </Center>
      {rig.macron && (
        <mesh position={[0, 1.82, .12]} castShadow receiveShadow>
          <boxGeometry args={[.96, .13, .48]} />
          <meshPhysicalMaterial color="#9ba7ae" metalness={.58} roughness={.34} clearcoat={.2} />
        </mesh>
      )}
      {rig.dot && (
        <mesh position={[0, -.12, .09]} castShadow>
          <sphereGeometry args={[.11, 20, 20]} />
          <meshPhysicalMaterial color="#9ba7ae" metalness={.55} roughness={.36} />
        </mesh>
      )}
    </group>
  );
}

function SceneDirector({ loadProgress, mountainRef, visualRef, onSequenceComplete }) {
  const elapsed = useRef(0);
  const hold = useRef(0);
  const completed = useRef(false);
  const { camera } = useThree();

  useFrame((_, delta) => {
    const dt = Math.min(delta, .045);
    elapsed.current += dt;

    const reveal = easeOutCubic(elapsed.current / MOUNTAIN_REVEAL_SECONDS);
    if (mountainRef.current) mountainRef.current.position.y = THREE.MathUtils.lerp(-3.85, 0, reveal);

    const timeGate = clamp01((elapsed.current - MOUNTAIN_REVEAL_SECONDS) / LETTER_SEQUENCE_SECONDS);
    const loadGate = clamp01(loadProgress / 100);
    const target = Math.min(timeGate, loadGate);
    const damping = 1 - Math.exp(-7.8 * dt);
    visualRef.current = THREE.MathUtils.lerp(visualRef.current, target, damping);

    let impactEnergy = 0;
    for (let i = 0; i < LETTER_RIGS.length; i += 1) {
      impactEnergy = Math.max(impactEnergy, landingImpact(letterProgress(visualRef.current, i)));
    }

    const shake = impactEnergy * .052;
    const slowDrift = Math.sin(elapsed.current * .14) * .075;
    const baseY = THREE.MathUtils.lerp(3.65, 4.0, reveal) + visualRef.current * .05;
    const baseZ = THREE.MathUtils.lerp(13.2, 12.55, reveal) - visualRef.current * .25;

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, slowDrift + Math.sin(elapsed.current * 73) * shake, 1 - Math.exp(-5 * dt));
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, baseY + Math.cos(elapsed.current * 67) * shake * .52, 1 - Math.exp(-2.2 * dt));
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, baseZ, 1 - Math.exp(-1.55 * dt));
    camera.lookAt(0, THREE.MathUtils.lerp(.8, 1.23, reveal), -.78);

    if (visualRef.current > .995 && loadGate > .995) hold.current += dt;
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
  const worldScale = Math.min(1.02, Math.max(.75, viewport.width / 18.6));

  return (
    <>
      <color attach="background" args={['#02050a']} />
      <fogExp2 attach="fog" args={['#08131d', .037]} />
      <SkyDome />
      <SceneDirector loadProgress={loadProgress} mountainRef={mountains} visualRef={visual} onSequenceComplete={onSequenceComplete} />
      <NightStars />
      <Moon />
      <MoonCloudVeil />

      <ambientLight intensity={.18} color="#7892a2" />
      <hemisphereLight intensity={.34} color="#a8c9dc" groundColor="#020508" />
      <directionalLight
        castShadow
        position={[6.9, 9.8, 6.4]}
        intensity={3.9}
        color="#d9edf8"
        shadow-mapSize={[1536, 1536]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={9}
        shadow-camera-bottom={-5}
        shadow-bias={-.00028}
      />
      <directionalLight position={[-7.2, 3.2, 4.4]} intensity={.88} color="#486c88" />
      <Environment resolution={64}>
        <Lightformer position={[2, 7, 2]} rotation={[-1.1, 0, 0]} scale={[7, 4, 1]} intensity={2.3} color="#d7eaf5" />
        <Lightformer position={[-7, 1, 0]} rotation={[0, Math.PI / 2, 0]} scale={[2, 10, 1]} intensity={1.0} color="#789bb2" />
      </Environment>

      <group scale={worldScale}>
        <group ref={mountains} position={[0, -3.85, 0]}>
          <MountainMesh profile="distant" />
          <MountainMesh profile="hero" />
          <ValleyMist />
          <RidgeSpindrift heightAt={terrainHeight} count={240} />
          {LETTER_RIGS.map((rig, index) => (
            <React.Fragment key={rig.id}>
              <LandingCompression rig={rig} index={index} visualRef={visual} heightAt={terrainHeight} />
              <FallingLetter rig={rig} index={index} visualRef={visual} />
              <ImpactBurst rig={rig} index={index} visualRef={visual} />
            </React.Fragment>
          ))}
          <MountainMesh profile="foreground" />
        </group>
      </group>

      <SnowField count={940} size={.052} speed={.76} opacity={.54} />
      <SnowField count={360} size={.16} speed={1.28} opacity={.82} near />
    </>
  );
}

export default function LadakhPreloaderScenePro({ loadProgress, onSequenceComplete }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.55]}
      camera={{ position: [0, 3.65, 13.2], fov: 44, near: .1, far: 82 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = .94;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <LadakhWorld loadProgress={loadProgress} onSequenceComplete={onSequenceComplete} />
    </Canvas>
  );
}
