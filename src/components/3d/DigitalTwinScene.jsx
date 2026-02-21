// GÊMEO DIGITAL — Cena R3F
// Canvas Three.js com câmera, iluminação e OrbitControls

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { HumanPointCloud } from './HumanPointCloud';
import { CosmicDust } from './HumanPointCloud';

/**
 * Fallback enquanto o R3F carrega.
 */
function SceneFallback() {
  return null;
}

/**
 * Cena principal do Gêmeo Digital.
 * @param {object}   props
 * @param {string}   props.activeLayer  'all' | 'neural' | 'vitalidade' | 'fisico'
 * @param {string}   props.hoveredGroup Grupo sendo hovered (para brilho)
 * @param {function} props.onBodyClick  Callback(group: string) ao clicar num grupo
 * @param {function} props.onHoverChange Callback(group: string|null) ao hover
 */
export function DigitalTwinScene({
  activeLayer = 'all',
  hoveredGroup = null,
  onBodyClick,
  onHoverChange,
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.5, 3.2], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Suspense fallback={<SceneFallback />}>
        {/* Iluminação ambiente suave */}
        <ambientLight intensity={0.15} />

        {/* Luz holograma — ciano */}
        <pointLight position={[0, 2, 3]} color="#06b6d4" intensity={1.2} distance={8} />
        <pointLight position={[-2, 0, 1]} color="#3b59ff" intensity={0.4} distance={6} />

        {/* Partículas de poeira cósmica */}
        <CosmicDust />

        {/* Holograma humano */}
        <HumanPointCloud
          activeLayer={activeLayer}
          hoveredGroup={hoveredGroup}
          onBodyClick={onBodyClick}
          onHoverChange={onHoverChange}
        />

        {/* Controles de órbita com mouse */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={2}
          maxDistance={5.5}
          autoRotate={true}
          autoRotateSpeed={0.35}
          target={[0, 0.6, 0]}
        />
      </Suspense>
    </Canvas>
  );
}
