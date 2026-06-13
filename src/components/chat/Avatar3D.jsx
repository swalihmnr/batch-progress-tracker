import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const AVATAR_URL = 'https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb';

const HumanAvatar = ({ isSpeaking, userAudioLevel }) => {
  const { scene } = useGLTF(AVATAR_URL);
  const avatarRef = useRef();

  useFrame((state, delta) => {
    if (avatarRef.current) {
      // Gentle floating idle animation
      avatarRef.current.position.y = THREE.MathUtils.lerp(
        avatarRef.current.position.y,
        -1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.05,
        0.1
      );

      // React to user speaking by scaling slightly
      const targetScale = 1.2 + (userAudioLevel / 200);
      avatarRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

      // Simulate lip sync when Nova speaks
      // Ready Player Me avatars usually have a 'Wolf3D_Head' or 'Wolf3D_Teeth' mesh with morph targets
      scene.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary) {
          const mouthOpenIdx = child.morphTargetDictionary['mouthOpen'] ?? child.morphTargetDictionary['viseme_O'];
          const jawOpenIdx = child.morphTargetDictionary['jawOpen'];
          
          if (mouthOpenIdx !== undefined) {
            if (isSpeaking) {
              // Rapid sinusoidal movement to simulate talking
              const talkSpeed = 20; // fast movement
              const openAmount = (Math.sin(state.clock.elapsedTime * talkSpeed) + 1) / 2;
              child.morphTargetInfluences[mouthOpenIdx] = openAmount * 0.7;
              if (jawOpenIdx !== undefined) {
                  child.morphTargetInfluences[jawOpenIdx] = openAmount * 0.3;
              }
            } else {
              // Close mouth smoothly
              child.morphTargetInfluences[mouthOpenIdx] = THREE.MathUtils.lerp(child.morphTargetInfluences[mouthOpenIdx], 0, 0.2);
              if (jawOpenIdx !== undefined) {
                  child.morphTargetInfluences[jawOpenIdx] = THREE.MathUtils.lerp(child.morphTargetInfluences[jawOpenIdx], 0, 0.2);
              }
            }
          }
        }
      });
    }
  });

  return (
    <primitive 
      ref={avatarRef}
      object={scene} 
      position={[0, -1.5, 0]} 
      scale={1.2} 
    />
  );
};

// Preload the model so it loads faster next time
useGLTF.preload(AVATAR_URL);

export default function Avatar3D({ isSpeaking, userAudioLevel }) {
  return (
    <div className="w-full h-full bg-slate-900 rounded-full overflow-hidden shadow-2xl border-4 border-indigo-500/20">
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[0, 5, 5]} intensity={2.5} />
        <directionalLight position={[-5, 5, -5]} intensity={1} color="#4f46e5" />
        
        {/* Dynamic purple light when Nova is speaking */}
        <pointLight position={[0, 1.5, 2]} intensity={isSpeaking ? 5 : 0} color="#a855f7" distance={5} />
        
        <React.Suspense fallback={null}>
          <HumanAvatar isSpeaking={isSpeaking} userAudioLevel={userAudioLevel} />
        </React.Suspense>
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          autoRotate 
          autoRotateSpeed={1} 
          minPolarAngle={Math.PI / 2.2} 
          maxPolarAngle={Math.PI / 1.8} 
        />
      </Canvas>
    </div>
  );
}
