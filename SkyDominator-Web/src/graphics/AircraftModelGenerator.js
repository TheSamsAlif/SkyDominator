import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { createJet } from './RealisticJet.js';

// Shared GLTF & DRACO Loader instance with cache
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const modelCache = new Map();

/**
 * Aircraft Model Generator with GLTF/DRACO Loader & Procedural Fallback
 */
export class AircraftModelGenerator {
  /**
   * Creates an aircraft group. Instantly populates procedural fallback and asynchronously loads GLB if available.
   */
  static createAircraft(spec, skinConfig = null, isEnemy = false) {
    const group = new THREE.Group();
    group.name = `aircraft_${spec.id || 'jet'}`;

    const primaryColor = skinConfig?.primary || spec.defaultColor || (isEnemy ? 0x22262e : 0x0a1018);
    const accentColor = skinConfig?.secondary || spec.accentColor || (isEnemy ? 0xff1744 : 0x00e5ff);
    const wingspan = spec.wingspan || 14.5;
    const targetScale = wingspan / 14.5;

    // 1. Procedural mesh as instant reliable baseline
    const proceduralJet = createJet(primaryColor, accentColor);
    proceduralJet.name = 'jet_visual_body';
    proceduralJet.scale.setScalar(targetScale);
    group.add(proceduralJet);

    // 2. Try loading custom GLB if specified or from /models/ directory
    const modelUrl = spec.modelUrl || (isEnemy ? '/models/enemy_jet.glb' : '/models/f35.glb');
    this.tryLoadGLB(modelUrl, group, primaryColor, accentColor, targetScale, isEnemy);

    return group;
  }

  /**
   * Asynchronously attempts to load a real .glb model and replace the procedural mesh
   */
  static tryLoadGLB(url, parentGroup, primaryColor, accentColor, targetScale, isEnemy) {
    // If cached, clone immediately
    if (modelCache.has(url)) {
      this.attachGLBModel(modelCache.get(url).clone(), parentGroup, primaryColor, accentColor, targetScale, isEnemy);
      return;
    }

    gltfLoader.load(
      url,
      (gltf) => {
        modelCache.set(url, gltf.scene);
        this.attachGLBModel(gltf.scene.clone(), parentGroup, primaryColor, accentColor, targetScale, isEnemy);
      },
      undefined,
      () => {
        // Expected fallback: if .glb file doesn't exist in /models, keep procedural jet without breaking
      }
    );
  }

  static attachGLBModel(glbScene, parentGroup, primaryColor, accentColor, targetScale, isEnemy) {
    // Remove existing procedural visual body
    const existing = parentGroup.getObjectByName('jet_visual_body');
    if (existing) {
      parentGroup.remove(existing);
    }

    // Compute bounding box to normalize model size and orientation
    const box = new THREE.Box3().setFromObject(glbScene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Center pivot
    glbScene.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = (18.0 / (maxDim || 1.0)) * targetScale;
    glbScene.scale.setScalar(scaleFactor);

    // Configure PBR materials and shadows
    glbScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          child.material.metalness = THREE.MathUtils.clamp(child.material.metalness ?? 0.6, 0.4, 0.9);
          child.material.roughness = THREE.MathUtils.clamp(child.material.roughness ?? 0.4, 0.2, 0.6);

          if (isEnemy && child.material.color) {
            child.material.color.multiplyScalar(0.7); // Darken enemy jets
          }
        }
      }
    });

    const wrapper = new THREE.Group();
    wrapper.name = 'jet_visual_body';
    wrapper.add(glbScene);

    // Attach afterburner flames to the GLTF model
    this.attachAfterburnerCones(wrapper, accentColor);

    parentGroup.add(wrapper);
  }

  static attachAfterburnerCones(wrapper, accentColor) {
    // Left & right afterburner flame cones
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const flameGeom = new THREE.ConeGeometry(0.48, 4.5, 10);
    flameGeom.rotateX(-Math.PI / 2);
    flameGeom.translate(0, 0, -2.25);

    const flameL = new THREE.Mesh(flameGeom, flameMat);
    flameL.position.set(0.85, 0, -9.9);
    flameL.name = 'afterburner_flame_left';
    flameL.castShadow = false;

    const flameR = new THREE.Mesh(flameGeom, flameMat.clone());
    flameR.position.set(-0.85, 0, -9.9);
    flameR.name = 'afterburner_flame_right';
    flameR.castShadow = false;

    wrapper.add(flameL);
    wrapper.add(flameR);

    const exhaustLight = new THREE.PointLight(accentColor, 2.5, 15);
    exhaustLight.position.set(0, 0, -11);
    exhaustLight.name = 'exhaust_glow_light';
    wrapper.add(exhaustLight);
  }

  /**
   * Dynamically scales afterburner flame length, color, and exhaust point light
   */
  static updateAfterburnerFX(aircraftGroup, throttle, isAfterburner) {
    const flameL = aircraftGroup.getObjectByName('afterburner_flame_left');
    const flameR = aircraftGroup.getObjectByName('afterburner_flame_right');
    const light = aircraftGroup.getObjectByName('exhaust_glow_light');

    if (!flameL || !flameR) return;

    if (isAfterburner) {
      const flicker = 1.0 + (Math.random() * 0.25 - 0.12);
      flameL.scale.set(1.2, 1.2, 2.2 * flicker);
      flameR.scale.set(1.2, 1.2, 2.2 * flicker);
      flameL.material.color.setHex(0xff8c00);
      flameR.material.color.setHex(0xff8c00);
      flameL.material.opacity = 0.95;
      flameR.material.opacity = 0.95;
      if (light) {
        light.intensity = 4.0;
        light.color.setHex(0xff6600);
      }
    } else if (throttle > 0.1) {
      const length = 0.4 + (throttle * 0.8);
      flameL.scale.set(0.8, 0.8, length);
      flameR.scale.set(0.8, 0.8, length);
      flameL.material.color.setHex(0x00e5ff);
      flameR.material.color.setHex(0x00e5ff);
      flameL.material.opacity = 0.5 * throttle;
      flameR.material.opacity = 0.5 * throttle;
      if (light) {
        light.intensity = 1.5 * throttle;
        light.color.setHex(0x00e5ff);
      }
    } else {
      flameL.scale.set(0.01, 0.01, 0.01);
      flameR.scale.set(0.01, 0.01, 0.01);
      flameL.material.opacity = 0;
      flameR.material.opacity = 0;
      if (light) light.intensity = 0;
    }
  }
}
