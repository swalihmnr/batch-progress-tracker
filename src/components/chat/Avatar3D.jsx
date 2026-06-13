import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Sphere, MeshDistortMaterial, Float, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

const AVATAR_URL = '/custom_avatar.glb';

class AvatarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn("Failed to load 3D Avatar, falling back to geometric core.", error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const AICore = ({ isSpeaking, userAudioLevel }) => {
  const meshRef = useRef();
  const materialRef = useRef();
  const outerRingRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.3;
      const targetScale = 1 + (userAudioLevel / 100);
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
    if (outerRingRef.current) {
      outerRingRef.current.rotation.x -= delta * 0.5;
      outerRingRef.current.rotation.y += delta * 0.5;
      const ringScale = 1.2 + (userAudioLevel / 80);
      outerRingRef.current.scale.lerp(new THREE.Vector3(ringScale, ringScale, ringScale), 0.15);
      outerRingRef.current.material.opacity = THREE.MathUtils.lerp(
        outerRingRef.current.material.opacity, 
        Math.min((userAudioLevel / 50), 0.8), 
        0.15
      );
    }
    if (materialRef.current) {
      const targetDistort = isSpeaking ? 0.6 : 0.3;
      materialRef.current.distort = THREE.MathUtils.lerp(materialRef.current.distort, targetDistort, 0.1);
      const targetSpeed = isSpeaking ? 4 : 2;
      materialRef.current.speed = THREE.MathUtils.lerp(materialRef.current.speed, targetSpeed, 0.1);
      const targetColor = isSpeaking ? new THREE.Color('#a855f7') : new THREE.Color('#6366f1');
      materialRef.current.color.lerp(targetColor, 0.1);
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <MeshDistortMaterial
          ref={materialRef}
          color="#6366f1"
          emissive="#4f46e5"
          emissiveIntensity={0.5}
          distort={0.3}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
      <Sphere ref={outerRingRef} args={[1, 16, 16]}>
        <meshBasicMaterial color="#10b981" wireframe transparent opacity={0} />
      </Sphere>
    </Float>
  );
};

const HumanAvatar = ({ isSpeaking, userAudioLevel }) => {
  const { scene, animations } = useGLTF(AVATAR_URL);
  const avatarRef = useRef();
  const { actions } = useAnimations(animations, avatarRef);

  // Play the baked skeletal animation (idle)
  useEffect(() => {
    if (animations && animations.length > 0 && actions) {
      const actionName = animations[0].name;
      actions[actionName]?.reset().fadeIn(0.5).play();
    }
  }, [animations, actions]);

  useFrame((state, delta) => {
    if (avatarRef.current) {
      // Remove audio scaling. Humans don't change size.
      // Instead, we just let the spine breathe and neck bob relative to their original rotations
      const spine = scene.getObjectByName('Spine1') || scene.getObjectByName('Spine');
      const neck = scene.getObjectByName('Neck');

      if (spine) {
        if (spine.userData.origRotX === undefined) spine.userData.origRotX = spine.rotation.x;
        // Subtle breathing
        spine.rotation.x = spine.userData.origRotX + Math.sin(state.clock.elapsedTime * 2) * 0.015;
      }
      
      if (neck) {
        if (neck.userData.origRotX === undefined) {
          neck.userData.origRotX = neck.rotation.x;
          neck.userData.origRotY = neck.rotation.y;
        }
        
        if (isSpeaking) {
          // Slight natural head bobs while speaking
          neck.rotation.x = neck.userData.origRotX + Math.sin(state.clock.elapsedTime * 4) * 0.02;
          neck.rotation.y = neck.userData.origRotY + Math.sin(state.clock.elapsedTime * 2) * 0.01;
        } else {
          // Micro head movements when listening/idle
          neck.rotation.x = THREE.MathUtils.lerp(neck.rotation.x, neck.userData.origRotX + Math.sin(state.clock.elapsedTime * 0.5) * 0.01, 0.1);
          neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, neck.userData.origRotY + Math.sin(state.clock.elapsedTime * 0.3) * 0.02, 0.1);
        }
      }

      // Simulate lip sync and blinking
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          if (child.morphTargetDictionary) {
            // Lip sync
            const mouthOpenIdx = child.morphTargetDictionary['mouthOpen'] ?? child.morphTargetDictionary['viseme_O'];
            const jawOpenIdx = child.morphTargetDictionary['jawOpen'];
            
            if (mouthOpenIdx !== undefined) {
              if (isSpeaking) {
                const talkSpeed = 20;
                const openAmount = (Math.sin(state.clock.elapsedTime * talkSpeed) + 1) / 2;
                child.morphTargetInfluences[mouthOpenIdx] = openAmount * 0.6;
                if (jawOpenIdx !== undefined) child.morphTargetInfluences[jawOpenIdx] = openAmount * 0.2;
              } else {
                child.morphTargetInfluences[mouthOpenIdx] = THREE.MathUtils.lerp(child.morphTargetInfluences[mouthOpenIdx], 0, 0.2);
                if (jawOpenIdx !== undefined) child.morphTargetInfluences[jawOpenIdx] = THREE.MathUtils.lerp(child.morphTargetInfluences[jawOpenIdx], 0, 0.2);
              }
            }

            // Blinking (every 4 seconds, lasts ~0.2s)
            const blinkLeftIdx = child.morphTargetDictionary['eyeBlinkLeft'] ?? child.morphTargetDictionary['eyeBlink_L'];
            const blinkRightIdx = child.morphTargetDictionary['eyeBlinkRight'] ?? child.morphTargetDictionary['eyeBlink_R'];
            
            if (blinkLeftIdx !== undefined || blinkRightIdx !== undefined) {
              const blinkCycle = state.clock.elapsedTime % 4;
              let blinkVal = 0;
              if (blinkCycle > 3.8) {
                // Smooth blink curve
                blinkVal = Math.sin((blinkCycle - 3.8) * (Math.PI / 0.2));
              }
              if (blinkLeftIdx !== undefined) child.morphTargetInfluences[blinkLeftIdx] = blinkVal;
              if (blinkRightIdx !== undefined) child.morphTargetInfluences[blinkRightIdx] = blinkVal;
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
      position={[0, -1.6, 0]} 
      scale={1.35} 
    />
  );
};

export default function Avatar3D({ isSpeaking, userAudioLevel }) {
  return (
    <div className="w-full h-full bg-[#0a0f1c] overflow-hidden">
      <AvatarErrorBoundary fallback={
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#4f46e5" />
            <pointLight position={[0, 0, 0]} intensity={isSpeaking ? 2 : 0} color="#a855f7" />
            <AICore isSpeaking={isSpeaking} userAudioLevel={userAudioLevel} />
            <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        </Canvas>
      }>
        <Canvas shadows camera={{ position: [0, 0.55, 1.2], fov: 42 }}>
          <fog attach="fog" args={['#0a0f1c', 1, 5]} />
          
          {/* Cinematic 3-Point Lighting */}
          <ambientLight intensity={0.6} color="#ffffff" />
          
          {/* Key Light (Front Right, casts shadow) */}
          <directionalLight 
            position={[1, 1.5, 2]} 
            intensity={2} 
            color="#ffffff" 
            castShadow 
            shadow-mapSize-width={1024} 
            shadow-mapSize-height={1024} 
            shadow-bias={-0.0001}
          />
          
          {/* Fill Light (Front Left, softer, slightly cool) */}
          <directionalLight 
            position={[-2, 1, 2]} 
            intensity={1} 
            color="#a5b4fc" 
          />
          
          {/* Rim Light (Behind, creates glowing edge) */}
          <spotLight 
            position={[0, 2.5, -2]} 
            intensity={5} 
            color="#818cf8" 
            angle={0.8}
            penumbra={0.5}
          />

          {/* Dynamic conversational glow from the "screen" */}
          <pointLight position={[0, 0.2, 1]} intensity={isSpeaking ? 3 : 0} color="#c084fc" distance={3} />
          
          <React.Suspense fallback={null}>
            <HumanAvatar isSpeaking={isSpeaking} userAudioLevel={userAudioLevel} />
          </React.Suspense>
          
          {/* Lock camera completely to act as a fixed webcam */}
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            enableRotate={false}
            target={[0, 0.55, 0]}
          />
        </Canvas>
      </AvatarErrorBoundary>
    </div>
  );
}
