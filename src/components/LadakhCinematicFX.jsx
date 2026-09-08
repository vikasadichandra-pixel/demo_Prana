import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clamp01, landingImpact, letterProgress } from '../lib/ladakhPreloader';

const fract = value => value - Math.floor(value);
const hash = (a, b = 0, seed = 0) => fract(Math.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453123);

function makePowderTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const gradient = ctx.createRadialGradient(c * .8, c * .78, 0, c, c, c - 1);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.18, 'rgba(251,254,255,.95)');
  gradient.addColorStop(.5, 'rgba(220,236,244,.38)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function RidgeSpindrift({ heightAt, count = 230 }) {
  const points = useRef();
  const texture = useMemo(makePowderTexture, []);
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const origin = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    const phase = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const j = i * 3;
      const x = THREE.MathUtils.lerp(-8.8, 8.8, hash(i, 1, 301));
      const z = THREE.MathUtils.lerp(-1.65, 2.2, hash(i, 2, 302));
      const y = heightAt(x, z) + THREE.MathUtils.lerp(.06, .3, hash(i, 3, 303));
      positions[j] = origin[j] = x;
      positions[j + 1] = origin[j + 1] = y;
      positions[j + 2] = origin[j + 2] = z;
      speed[i] = THREE.MathUtils.lerp(.5, 1.35, hash(i, 4, 304));
      phase[i] = hash(i, 5, 305) * Math.PI * 2;
    }
    return { positions, origin, speed, phase };
  }, [count, heightAt]);

  useFrame((state, delta) => {
    const attribute = points.current?.geometry.attributes.position;
    if (!attribute) return;
    const p = attribute.array;
    const dt = Math.min(delta, .045);
    const t = state.clock.elapsedTime;

    for (let i = 0; i < count; i += 1) {
      const j = i * 3;
      const travelled = p[j] - data.origin[j];
      p[j] += data.speed[i] * dt;
      p[j + 1] = data.origin[j + 1] + Math.sin(t * 2.25 + data.phase[i]) * .035 + travelled * .035;
      p[j + 2] = data.origin[j + 2] + Math.sin(t * .8 + data.phase[i]) * .055;
      if (travelled > 1.45 + (i % 7) * .08) {
        p[j] = data.origin[j] - .36;
        p[j + 1] = data.origin[j + 1];
        p[j + 2] = data.origin[j + 2];
      }
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={points} frustumCulled={false} renderOrder={4}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[data.positions, 3]} /></bufferGeometry>
      <pointsMaterial
        map={texture}
        alphaMap={texture}
        transparent
        opacity={.28}
        size={.045}
        sizeAttenuation
        depthWrite={false}
        color="#edf6fb"
      />
    </points>
  );
}

export function MoonCloudVeil() {
  const group = useRef();
  const texture = useMemo(makePowderTexture, []);
  const wisps = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    x: THREE.MathUtils.lerp(1.2, 7.8, hash(i, 11, 411)),
    y: THREE.MathUtils.lerp(4.7, 7.1, hash(i, 12, 412)),
    z: THREE.MathUtils.lerp(-8.5, -7.4, hash(i, 13, 413)),
    sx: THREE.MathUtils.lerp(2.4, 5.8, hash(i, 14, 414)),
    sy: THREE.MathUtils.lerp(.45, 1.35, hash(i, 15, 415)),
    opacity: THREE.MathUtils.lerp(.025, .075, hash(i, 16, 416)),
  })), []);

  useFrame((state) => {
    if (!group.current) return;
    group.current.position.x = Math.sin(state.clock.elapsedTime * .055) * .72;
    group.current.position.y = Math.sin(state.clock.elapsedTime * .037) * .08;
  });

  return (
    <group ref={group} renderOrder={1}>
      {wisps.map((wisp, i) => (
        <sprite key={i} position={[wisp.x, wisp.y, wisp.z]} scale={[wisp.sx, wisp.sy, 1]}>
          <spriteMaterial
            map={texture}
            transparent
            opacity={wisp.opacity}
            color="#91a7b7"
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}

export function LandingCompression({ rig, index, visualRef, heightAt }) {
  const dark = useRef();
  const ring = useRef();
  const ringMaterial = useRef();
  const chunkMaterial = useRef();
  const localY = heightAt(rig.x, rig.z) + .025;

  const tangentQuaternion = useMemo(() => {
    const e = .09;
    const dx = (heightAt(rig.x + e, rig.z) - heightAt(rig.x - e, rig.z)) / (2 * e);
    const dz = (heightAt(rig.x, rig.z + e) - heightAt(rig.x, rig.z - e)) / (2 * e);
    const normal = new THREE.Vector3(-dx, 1, -dz).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }, [heightAt, rig.x, rig.z]);

  const settledChunks = useMemo(() => {
    const count = 24;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = hash(i, index + 31, 522) * Math.PI * 2;
      const radius = THREE.MathUtils.lerp(.22, .82, hash(i, index + 32, 523)) * (rig.impact || 1);
      const dx = Math.cos(angle) * radius;
      const dz = Math.sin(angle) * radius * .62;
      positions[i * 3] = dx;
      positions[i * 3 + 1] = Math.max(.012, heightAt(rig.x + dx, rig.z + dz) - localY + .035);
      positions[i * 3 + 2] = dz;
    }
    return positions;
  }, [heightAt, index, localY, rig.impact, rig.x, rig.z]);

  const texture = useMemo(makePowderTexture, []);

  useFrame(() => {
    const local = letterProgress(visualRef.current, index);
    const contact = clamp01((local - .74) / .18);
    const impact = landingImpact(local);
    if (dark.current) dark.current.material.opacity = contact * .18;
    if (ring.current) ring.current.scale.setScalar(.7 + impact * 2.05);
    if (ringMaterial.current) ringMaterial.current.opacity = impact * .19;
    if (chunkMaterial.current) chunkMaterial.current.opacity = contact * .82;
  });

  return (
    <group position={[rig.x, localY, rig.z]} quaternion={tangentQuaternion}>
      <mesh ref={dark} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <circleGeometry args={[.58 * (rig.impact || 1), 32]} />
        <meshBasicMaterial color="#53636d" transparent opacity={0} depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, .006, 0]} renderOrder={3}>
        <ringGeometry args={[.48, .56, 40]} />
        <meshBasicMaterial ref={ringMaterial} color="#eef7fb" transparent opacity={0} depthWrite={false} />
      </mesh>
      <points position={[0, .02, 0]} renderOrder={5}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[settledChunks, 3]} /></bufferGeometry>
        <pointsMaterial ref={chunkMaterial} map={texture} alphaMap={texture} transparent opacity={0} size={.075} sizeAttenuation depthWrite={false} color="#f0f6f9" />
      </points>
    </group>
  );
}
