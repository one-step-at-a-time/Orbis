// GÊMEO DIGITAL — Nuvem de Partículas Humana
// Distribui ~1800 pontos em volumes que formam a silhueta humana.
// Cada ponto tem cor RGB baseada no seu grupo (neural/vitalidade/fisico).
// O filtro activeLayer escurece grupos não selecionados em tempo real.

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Constantes de cor (RGB normalizado) ─────────────────────────────────────
const COLORS = {
  neural:     new THREE.Color('#06b6d4'),   // Ciano
  vitalidade: new THREE.Color('#00ff9d'),   // Verde neon
  fisico:     new THREE.Color('#ef4444'),   // Vermelho
};

const DIM_FACTOR = 0.04; // Fator de opacidade quando grupo não está ativo

// ─── Helpers de geração de pontos ────────────────────────────────────────────

/** Ponto aleatório dentro de uma esfera com semi-eixos (rx,ry,rz). */
function randomInEllipsoid(cx, cy, cz, rx, ry, rz) {
  // Método de rejeição simples dentro do cubo envolvente
  while (true) {
    const x = (Math.random() * 2 - 1) * rx;
    const y = (Math.random() * 2 - 1) * ry;
    const z = (Math.random() * 2 - 1) * rz;
    if ((x/rx)**2 + (y/ry)**2 + (z/rz)**2 <= 1) {
      return [cx + x, cy + y, cz + z];
    }
  }
}

/** Ponto aleatório dentro de um cilindro (eixo Y). */
function randomInCylinder(cx, cy, cz, r, h) {
  const theta = Math.random() * 2 * Math.PI;
  const rr = Math.sqrt(Math.random()) * r;
  return [
    cx + rr * Math.cos(theta),
    cy + (Math.random() - 0.5) * h,
    cz + rr * Math.sin(theta) * 0.75, // levemente achatado em Z
  ];
}

/** Ponto aleatório dentro de uma caixa. */
function randomInBox(cx, cy, cz, w, h, d) {
  return [
    cx + (Math.random() - 0.5) * w,
    cy + (Math.random() - 0.5) * h,
    cz + (Math.random() - 0.5) * d,
  ];
}

// ─── Definição de volumes do corpo ──────────────────────────────────────────
// Cada segmento define: gerador de ponto + grupo + quantidade
const BODY_SEGMENTS = [
  // --- CABEÇA (grupo neural) ---
  { group: 'neural',     count: 130, gen: () => randomInEllipsoid(0, 1.62, 0, 0.14, 0.17, 0.13) },
  // Rosto (plano frontal mais denso)
  { group: 'neural',     count: 40,  gen: () => { const [x,,z] = randomInEllipsoid(0, 1.62, 0, 0.12, 0.15, 0.11); return [x, 1.62 + (Math.random()-0.5)*0.3, z + 0.05]; } },

  // --- PESCOÇO (grupo vitalidade) ---
  { group: 'vitalidade', count: 25,  gen: () => randomInCylinder(0, 1.38, 0, 0.04, 0.1) },

  // --- TÓRAX SUPERIOR (grupo vitalidade) ---
  { group: 'vitalidade', count: 220, gen: () => {
    // Taper: mais largo nos ombros, mais estreito na cintura
    const y = 0.75 + Math.random() * 0.5;
    const taper = 1 - (y - 0.75) * 0.3;
    return randomInBox(0, y, 0, 0.38 * taper, 0.02, 0.15);
  }},

  // --- ABDÔMEN (grupo vitalidade) ---
  { group: 'vitalidade', count: 150, gen: () => randomInBox(0, 0.64, 0, 0.28, 0.28, 0.12) },

  // --- QUADRIL (grupo vitalidade) ---
  { group: 'vitalidade', count: 65,  gen: () => randomInBox(0, 0.50, 0, 0.34, 0.12, 0.14) },

  // --- BRAÇO SUPERIOR ESQUERDO (grupo fisico) ---
  { group: 'fisico',     count: 80,  gen: () => {
    const [x, y, z] = randomInCylinder(-0.26, 0.92, 0, 0.055, 0.34);
    return [x - (y - 0.92) * 0.05, y, z]; // leve angulação para fora
  }},
  // --- BRAÇO INFERIOR ESQUERDO ---
  { group: 'fisico',     count: 65,  gen: () => randomInCylinder(-0.30, 0.55, 0, 0.04, 0.30) },
  // --- MÃO ESQUERDA ---
  { group: 'fisico',     count: 20,  gen: () => randomInBox(-0.31, 0.37, 0, 0.07, 0.10, 0.04) },

  // --- BRAÇO SUPERIOR DIREITO (grupo fisico) ---
  { group: 'fisico',     count: 80,  gen: () => {
    const [x, y, z] = randomInCylinder(0.26, 0.92, 0, 0.055, 0.34);
    return [x + (y - 0.92) * 0.05, y, z];
  }},
  // --- BRAÇO INFERIOR DIREITO ---
  { group: 'fisico',     count: 65,  gen: () => randomInCylinder(0.30, 0.55, 0, 0.04, 0.30) },
  // --- MÃO DIREITA ---
  { group: 'fisico',     count: 20,  gen: () => randomInBox(0.31, 0.37, 0, 0.07, 0.10, 0.04) },

  // --- COXA ESQUERDA (grupo fisico) ---
  { group: 'fisico',     count: 140, gen: () => randomInCylinder(-0.11, 0.14, 0, 0.08, 0.40) },
  // --- PERNA INFERIOR ESQUERDA ---
  { group: 'fisico',     count: 110, gen: () => randomInCylinder(-0.11, -0.32, 0, 0.055, 0.36) },
  // --- PÉ ESQUERDO ---
  { group: 'fisico',     count: 18,  gen: () => randomInBox(-0.11, -0.53, 0.04, 0.07, 0.06, 0.14) },

  // --- COXA DIREITA (grupo fisico) ---
  { group: 'fisico',     count: 140, gen: () => randomInCylinder(0.11, 0.14, 0, 0.08, 0.40) },
  // --- PERNA INFERIOR DIREITA ---
  { group: 'fisico',     count: 110, gen: () => randomInCylinder(0.11, -0.32, 0, 0.055, 0.36) },
  // --- PÉ DIREITO ---
  { group: 'fisico',     count: 18,  gen: () => randomInBox(0.11, -0.53, 0.04, 0.07, 0.06, 0.14) },
];

// ─── Componente principal ────────────────────────────────────────────────────

/**
 * Nuvem de partículas com silhueta humana.
 */
export function HumanPointCloud({ activeLayer = 'all', hoveredGroup = null, onBodyClick, onHoverChange }) {
  const pointsRef = useRef();

  // Gera posições e cores base UMA única vez
  const { positions, baseColors, groupIndices, totalCount } = useMemo(() => {
    const pos = [];
    const col = [];
    const grp = [];

    BODY_SEGMENTS.forEach(({ group, count, gen }) => {
      const color = COLORS[group];
      for (let i = 0; i < count; i++) {
        const [x, y, z] = gen();
        pos.push(x, y, z);
        col.push(color.r, color.g, color.b);
        grp.push(group);
      }
    });

    return {
      positions: new Float32Array(pos),
      baseColors: new Float32Array(col),
      groupIndices: grp,
      totalCount: pos.length / 3,
    };
  }, []);

  // Atualiza cores a cada frame com base no filtro ativo
  useFrame(() => {
    if (!pointsRef.current) return;
    const colors = pointsRef.current.geometry.attributes.color.array;

    for (let i = 0; i < totalCount; i++) {
      const group = groupIndices[i];
      const isVisible = activeLayer === 'all' || activeLayer === group;
      const isHovered = hoveredGroup === group;
      const factor = isVisible ? (isHovered ? 1.4 : 1.0) : DIM_FACTOR;

      const bi = i * 3;
      colors[bi]     = Math.min(baseColors[bi]     * factor, 1);
      colors[bi + 1] = Math.min(baseColors[bi + 1] * factor, 1);
      colors[bi + 2] = Math.min(baseColors[bi + 2] * factor, 1);
    }

    pointsRef.current.geometry.attributes.color.needsUpdate = true;
  });

  // Arrays para hitboxes
  const hitboxes = [
    {
      group: 'neural',
      geometry: <sphereGeometry args={[0.22, 8, 8]} />,
      position: [0, 1.62, 0],
    },
    {
      group: 'vitalidade',
      geometry: <boxGeometry args={[0.50, 0.72, 0.28]} />,
      position: [0, 0.73, 0],
    },
    // Braços e pernas — grupo fisico
    { group: 'fisico', geometry: <boxGeometry args={[0.14, 0.60, 0.16]} />, position: [-0.28, 0.73, 0] },
    { group: 'fisico', geometry: <boxGeometry args={[0.14, 0.60, 0.16]} />, position: [0.28, 0.73, 0]  },
    { group: 'fisico', geometry: <boxGeometry args={[0.22, 0.90, 0.20]} />, position: [-0.11, -0.10, 0] },
    { group: 'fisico', geometry: <boxGeometry args={[0.22, 0.90, 0.20]} />, position: [0.11, -0.10, 0]  },
  ];

  return (
    <group>
      {/* Partículas */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={positions}
            count={totalCount}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={baseColors.slice()} // cópia mutável
            count={totalCount}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.016}
          sizeAttenuation={true}
          vertexColors={true}
          blending={THREE.AdditiveBlending}
          transparent={true}
          depthWrite={false}
          opacity={0.95}
        />
      </points>

      {/* Hitboxes invisíveis */}
      {hitboxes.map((hb, idx) => (
        <mesh
          key={idx}
          position={hb.position}
          onClick={(e) => { e.stopPropagation(); onBodyClick?.(hb.group); }}
          onPointerOver={(e) => { e.stopPropagation(); onHoverChange?.(hb.group); }}
          onPointerOut={(e) => { e.stopPropagation(); onHoverChange?.(null); }}
        >
          {hb.geometry}
          <meshBasicMaterial visible={false} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Poeira Cósmica ──────────────────────────────────────────────────────────

/**
 * 500 partículas brancas flutuando lentamente para cima.
 */
export function CosmicDust() {
  const dustRef = useRef();
  const COUNT = 500;

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

  useFrame(() => {
    if (!dustRef.current) return;
    const pos = dustRef.current.geometry.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 1] += speeds[i];
      if (pos[i * 3 + 1] > 3.5) pos[i * 3 + 1] = -3.5;
    }
    dustRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={dustRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={COUNT}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.007}
        color="#a0c4ff"
        transparent={true}
        opacity={0.18}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
}
