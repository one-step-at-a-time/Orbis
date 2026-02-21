// GÊMEO DIGITAL — Nuvem de Partículas Humana
// API corrigida para @react-three/fiber v9:
//   - bufferAttribute usa args={[array, itemSize]} (construtor Three.js)
//   - atualização de cores via ref direto no bufferAttribute

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Cores base (RGB normalizado) ────────────────────────────────────────────
const COLORS = {
  neural:     new THREE.Color('#06b6d4'),
  vitalidade: new THREE.Color('#00ff9d'),
  fisico:     new THREE.Color('#ef4444'),
};

const DIM_FACTOR = 0.05;

// ─── Helpers de geração de pontos ────────────────────────────────────────────

function randomInEllipsoid(cx, cy, cz, rx, ry, rz) {
  while (true) {
    const x = (Math.random() * 2 - 1) * rx;
    const y = (Math.random() * 2 - 1) * ry;
    const z = (Math.random() * 2 - 1) * rz;
    if ((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2 <= 1)
      return [cx + x, cy + y, cz + z];
  }
}

function randomInCylinder(cx, cy, cz, r, h) {
  const theta = Math.random() * 2 * Math.PI;
  const rr = Math.sqrt(Math.random()) * r;
  return [
    cx + rr * Math.cos(theta),
    cy + (Math.random() - 0.5) * h,
    cz + rr * Math.sin(theta) * 0.75,
  ];
}

function randomInBox(cx, cy, cz, w, h, d) {
  return [
    cx + (Math.random() - 0.5) * w,
    cy + (Math.random() - 0.5) * h,
    cz + (Math.random() - 0.5) * d,
  ];
}

// ─── Volumes do corpo ─────────────────────────────────────────────────────────

const BODY_SEGMENTS = [
  { group: 'neural',     count: 130, gen: () => randomInEllipsoid(0, 1.62, 0, 0.14, 0.17, 0.13) },
  { group: 'neural',     count: 40,  gen: () => { const [x,,] = randomInEllipsoid(0, 1.62, 0, 0.12, 0.15, 0.11); return [x, 1.62 + (Math.random() - 0.5) * 0.3, 0.05]; } },
  { group: 'vitalidade', count: 25,  gen: () => randomInCylinder(0, 1.38, 0, 0.04, 0.1) },
  { group: 'vitalidade', count: 220, gen: () => { const y = 0.75 + Math.random() * 0.5; const taper = 1 - (y - 0.75) * 0.3; return randomInBox(0, y, 0, 0.38 * taper, 0.02, 0.15); } },
  { group: 'vitalidade', count: 150, gen: () => randomInBox(0, 0.64, 0, 0.28, 0.28, 0.12) },
  { group: 'vitalidade', count: 65,  gen: () => randomInBox(0, 0.50, 0, 0.34, 0.12, 0.14) },
  { group: 'fisico',     count: 80,  gen: () => { const [x, y, z] = randomInCylinder(-0.26, 0.92, 0, 0.055, 0.34); return [x - (y - 0.92) * 0.05, y, z]; } },
  { group: 'fisico',     count: 65,  gen: () => randomInCylinder(-0.30, 0.55, 0, 0.04, 0.30) },
  { group: 'fisico',     count: 20,  gen: () => randomInBox(-0.31, 0.37, 0, 0.07, 0.10, 0.04) },
  { group: 'fisico',     count: 80,  gen: () => { const [x, y, z] = randomInCylinder(0.26, 0.92, 0, 0.055, 0.34); return [x + (y - 0.92) * 0.05, y, z]; } },
  { group: 'fisico',     count: 65,  gen: () => randomInCylinder(0.30, 0.55, 0, 0.04, 0.30) },
  { group: 'fisico',     count: 20,  gen: () => randomInBox(0.31, 0.37, 0, 0.07, 0.10, 0.04) },
  { group: 'fisico',     count: 140, gen: () => randomInCylinder(-0.11, 0.14, 0, 0.08, 0.40) },
  { group: 'fisico',     count: 110, gen: () => randomInCylinder(-0.11, -0.32, 0, 0.055, 0.36) },
  { group: 'fisico',     count: 18,  gen: () => randomInBox(-0.11, -0.53, 0.04, 0.07, 0.06, 0.14) },
  { group: 'fisico',     count: 140, gen: () => randomInCylinder(0.11, 0.14, 0, 0.08, 0.40) },
  { group: 'fisico',     count: 110, gen: () => randomInCylinder(0.11, -0.32, 0, 0.055, 0.36) },
  { group: 'fisico',     count: 18,  gen: () => randomInBox(0.11, -0.53, 0.04, 0.07, 0.06, 0.14) },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export function HumanPointCloud({ activeLayer = 'all', hoveredGroup = null, onBodyClick, onHoverChange }) {
  // ref direto no bufferAttribute de cor (API R3F v9)
  const colorBufferRef = useRef();

  const { positions, liveColors, baseColors, groupIndices, totalCount } = useMemo(() => {
    const pos = [];
    const col = [];
    const grp = [];

    BODY_SEGMENTS.forEach(({ group, count, gen }) => {
      const c = COLORS[group];
      for (let i = 0; i < count; i++) {
        const [x, y, z] = gen();
        pos.push(x, y, z);
        col.push(c.r, c.g, c.b);
        grp.push(group);
      }
    });

    const posArr  = new Float32Array(pos);
    const baseCol = new Float32Array(col);
    const liveCol = new Float32Array(col); // cópia mutável p/ updates

    return { positions: posArr, liveColors: liveCol, baseColors: baseCol, groupIndices: grp, totalCount: pos.length / 3 };
  }, []);

  // Atualiza cores a cada frame com base no filtro ativo
  useFrame(() => {
    if (!colorBufferRef.current) return;
    const colors = colorBufferRef.current.array;
    for (let i = 0; i < totalCount; i++) {
      const group   = groupIndices[i];
      const visible = activeLayer === 'all' || activeLayer === group;
      const hovered = hoveredGroup === group;
      const factor  = visible ? (hovered ? 1.5 : 1.0) : DIM_FACTOR;
      const bi = i * 3;
      colors[bi]     = Math.min(baseColors[bi]     * factor, 1);
      colors[bi + 1] = Math.min(baseColors[bi + 1] * factor, 1);
      colors[bi + 2] = Math.min(baseColors[bi + 2] * factor, 1);
    }
    colorBufferRef.current.needsUpdate = true;
  });

  // Hitboxes invisíveis
  const hitboxes = [
    { group: 'neural',     geo: <sphereGeometry args={[0.22, 8, 8]} />,       pos: [0, 1.62, 0]  },
    { group: 'vitalidade', geo: <boxGeometry args={[0.50, 0.72, 0.28]} />,    pos: [0, 0.73, 0]  },
    { group: 'fisico',     geo: <boxGeometry args={[0.14, 0.60, 0.16]} />,    pos: [-0.28, 0.73, 0] },
    { group: 'fisico',     geo: <boxGeometry args={[0.14, 0.60, 0.16]} />,    pos: [0.28, 0.73, 0]  },
    { group: 'fisico',     geo: <boxGeometry args={[0.22, 0.90, 0.20]} />,    pos: [-0.11, -0.10, 0] },
    { group: 'fisico',     geo: <boxGeometry args={[0.22, 0.90, 0.20]} />,    pos: [0.11, -0.10, 0]  },
  ];

  return (
    <group>
      {/* Partículas — API R3F v9: args={[array, itemSize]} */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            ref={colorBufferRef}
            attach="attributes-color"
            args={[liveColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.018}
          sizeAttenuation
          vertexColors
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
          opacity={0.9}
        />
      </points>

      {/* Hitboxes invisíveis */}
      {hitboxes.map((hb, idx) => (
        <mesh
          key={idx}
          position={hb.pos}
          onClick={(e) => { e.stopPropagation(); onBodyClick?.(hb.group); }}
          onPointerOver={(e) => { e.stopPropagation(); onHoverChange?.(hb.group); }}
          onPointerOut={(e) => { e.stopPropagation(); onHoverChange?.(null); }}
        >
          {hb.geo}
          <meshBasicMaterial visible={false} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Poeira Cósmica ───────────────────────────────────────────────────────────

export function CosmicDust() {
  const dustRef = useRef();
  const COUNT = 400;

  const { positions, speeds } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const spd = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
      spd[i] = 0.0003 + Math.random() * 0.0005;
    }
    return { positions: pos, speeds: spd };
  }, []);

  const posBufferRef = useRef();

  useFrame(() => {
    if (!posBufferRef.current) return;
    const pos = posBufferRef.current.array;
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 1] += speeds[i];
      if (pos[i * 3 + 1] > 3.5) pos[i * 3 + 1] = -3.5;
    }
    posBufferRef.current.needsUpdate = true;
  });

  return (
    <points ref={dustRef}>
      <bufferGeometry>
        <bufferAttribute
          ref={posBufferRef}
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.007}
        color="#a0c4ff"
        transparent
        opacity={0.18}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
