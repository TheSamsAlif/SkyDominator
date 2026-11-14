import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Setup DRACOLoader with Google CDN decoder
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
dracoLoader.setDecoderConfig({ type: 'js' });

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

/**
 * Procedural & GLTF 3D Fighter Aircraft Generator
 * Supports all 12 fictional aircraft identities and external .glb models
 */
export class AircraftModelGenerator {
  static createAircraft(spec, skinConfig = null) {
    const group = new THREE.Group();
    group.name = `aircraft_${spec.id || 'jet'}`;

    // Skin Materials
    const primaryColor = skinConfig?.primary || spec.defaultColor || 0x0a1018;
    const accentColor = skinConfig?.secondary || spec.accentColor || 0x00e5ff;
    const roughness = skinConfig?.roughness ?? 0.35;
    const metalness = skinConfig?.metalness ?? 0.75;

    const hullMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: roughness,
      metalness: metalness,
      flatShading: true
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.2,
      metalness: 0.8,
      emissive: accentColor,
      emissiveIntensity: 0.35
    });

    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0x112233,
      metalness: 0.9,
      roughness: 0.08,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85
    });

    // 1. Central Fuselage (Chined body, Nose = +Z)
    const fuselageGeom = new THREE.CylinderGeometry(0.5, 1.4, 18, 6);
    fuselageGeom.rotateX(Math.PI / 2);
    fuselageGeom.scale(1.2, 0.65, 1.0);
    const fuselage = new THREE.Mesh(fuselageGeom, hullMat);
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    group.add(fuselage);

    // 2. Needle Nose Cone (at +Z)
    const noseGeom = new THREE.ConeGeometry(0.8, 5, 6);
    noseGeom.rotateX(Math.PI / 2);
    noseGeom.scale(1.1, 0.5, 1.0);
    const nose = new THREE.Mesh(noseGeom, hullMat);
    nose.position.set(0, 0, 11);
    nose.castShadow = true;
    group.add(nose);

    // 3. Cockpit Glass Canopy
    const canopyGeom = new THREE.ConeGeometry(0.7, 5.5, 8);
    canopyGeom.rotateX(Math.PI / 2);
    canopyGeom.scale(0.85, 0.45, 1.0);
    const canopy = new THREE.Mesh(canopyGeom, canopyMat);
    canopy.position.set(0, 0.65, 4.5);
    group.add(canopy);

    // 4. Main Wings (Geometry based on WingType)
    const wingspan = spec.wingspan || 14.0;
    const wingGeom = new THREE.BufferGeometry();

    let wingVertices;
    if (spec.wingType === 'forward_swept') {
      wingVertices = new Float32Array([
        0, 0, 3,       wingspan / 2, 0.1, 6,     0, 0, -4,
        0, 0, 3,      -wingspan / 2, 0.1, 6,     0, 0, -4,
        0, 0, -4,      wingspan / 2, -0.1, 6,    0, 0, 3,
        0, 0, -4,     -wingspan / 2, -0.1, 6,    0, 0, 3
      ]);
    } else if (spec.wingType === 'needle_delta' || spec.wingType === 'waverider') {
      wingVertices = new Float32Array([
        0, 0, 6,       wingspan / 2, 0.05, -7,    0, 0, -7,
        0, 0, 6,      -wingspan / 2, 0.05, -7,    0, 0, -7,
        0, 0, -7,      wingspan / 2, -0.05, -7,   0, 0, 6,
        0, 0, -7,     -wingspan / 2, -0.05, -7,   0, 0, 6
      ]);
    } else {
      // Classic stealth diamond delta
      wingVertices = new Float32Array([
        0, 0, 3,       wingspan / 2, 0.08, -3,    0, 0, -6,
        0, 0, 3,      -wingspan / 2, 0.08, -3,    0, 0, -6,
        0, 0, -6,      wingspan / 2, -0.08, -3,   0, 0, 3,
        0, 0, -6,     -wingspan / 2, -0.08, -3,   0, 0, 3
      ]);
    }

    wingGeom.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
    wingGeom.computeVertexNormals();
    const mainWings = new THREE.Mesh(wingGeom, hullMat);
    mainWings.castShadow = true;
    mainWings.receiveShadow = true;
    group.add(mainWings);

    // 5. Wingtip Trim Rails
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3), accentMat);
    railL.position.set(wingspan / 2, 0, -3);
    const railR = railL.clone();
    railR.position.set(-wingspan / 2, 0, -3);
    group.add(railL);
    group.add(railR);

    // 6. Canted Vertical Stabilizers
    const finGeom = new THREE.BufferGeometry();
    const finVertices = new Float32Array([
      0, 0, -2,   0, 3.2, -6,   0, 0, -7,
      0, 0, -7,   0, 3.2, -6,   0, 0, -2
    ]);
    finGeom.setAttribute('position', new THREE.BufferAttribute(finVertices, 3));
    finGeom.computeVertexNormals();

    const finL = new THREE.Mesh(finGeom, hullMat);
    finL.position.set(1.4, 0.3, 0);
    finL.rotation.z = -0.35;
    finL.castShadow = true;

    const finR = new THREE.Mesh(finGeom, hullMat);
    finR.position.set(-1.4, 0.3, 0);
    finR.rotation.z = 0.35;
    finR.castShadow = true;

    group.add(finL);
    group.add(finR);

    // 7. Twin Turbine Exhaust Nozzles (at -Z)
    const exhaustMat = new THREE.MeshStandardMaterial({
      color: 0x1f232b,
      metalness: 0.9,
      roughness: 0.3
    });

    const nozzleGeom = new THREE.CylinderGeometry(0.55, 0.65, 1.8, 12, 1, true);
    nozzleGeom.rotateX(Math.PI / 2);

    const nozzleL = new THREE.Mesh(nozzleGeom, exhaustMat);
    nozzleL.position.set(0.9, 0, -9.0);
    const nozzleR = new THREE.Mesh(nozzleGeom, exhaustMat);
    nozzleR.position.set(-0.9, 0, -9.0);
    group.add(nozzleL);
    group.add(nozzleR);

    // 8. Afterburner Flame Cones
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const flameGeom = new THREE.ConeGeometry(0.48, 4.5, 8);
    flameGeom.rotateX(-Math.PI / 2); // points backward along -Z
    flameGeom.translate(0, 0, -2.25);

    const flameL = new THREE.Mesh(flameGeom, flameMat);
    flameL.position.set(0.9, 0, -9.8);
    flameL.name = 'afterburner_flame_left';

    const flameR = new THREE.Mesh(flameGeom, flameMat);
    flameR.position.set(-0.9, 0, -9.8);
    flameR.name = 'afterburner_flame_right';

    group.add(flameL);
    group.add(flameR);

    const exhaustLight = new THREE.PointLight(accentColor, 2.5, 15);
    exhaustLight.position.set(0, 0, -11);
    exhaustLight.name = 'exhaust_glow_light';
    group.add(exhaustLight);

    return group;
  }

  static updateAfterburnerFX(aircraftGroup, throttle, isAfterburner) {
    if (!aircraftGroup) return;

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
      flameL.scale.set(0.1, 0.1, 0.1);
      flameR.scale.set(0.1, 0.1, 0.1);
      flameL.material.opacity = 0;
      flameR.material.opacity = 0;
      if (light) light.intensity = 0;
    }
  }

  static loadAircraftModel(modelPath, options = {}) {
    const container = new THREE.Group();
    container.name = options.name || 'AircraftContainer';

    // Procedural fallback
    const fallbackJet = AircraftModelGenerator.createAircraft(
      options.spec || {
        id: 'A01_ApexPhantom',
        wingType: 'diamond_delta',
        wingspan: 14.5,
        defaultColor: options.color || 0x0a1018,
        accentColor: options.accent || 0x00e5ff
      },
      options.skin
    );
    container.add(fallbackJet);

    if (!modelPath) return container;

    gltfLoader.load(
      modelPath,
      (gltf) => {
        const gltfModel = gltf.scene;
        const bbox = new THREE.Box3().setFromObject(gltfModel);
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = 16.0 / (maxDim || 1);
        gltfModel.scale.setScalar(scaleFactor);

        const center = bbox.getCenter(new THREE.Vector3());
        gltfModel.position.sub(center.multiplyScalar(scaleFactor));

        gltfModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        container.remove(fallbackJet);
        container.add(gltfModel);
      },
      undefined,
      () => {
        // Fallback remains active
      }
    );

    return container;
  }
}
