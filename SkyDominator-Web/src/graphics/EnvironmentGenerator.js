import * as THREE from 'three';

/**
 * 3D Tactical Environment Generator (Apex Atoll Combat Theater)
 */
export class EnvironmentGenerator {
  constructor(scene) {
    this.scene = scene;
    this.ocean = null;
    this.cloudPuffs = [];
    this.runwayGroup = null;
    this.time = 0;
  }

  createEnvironment() {
    // 1. Sky & Fog
    this.scene.background = new THREE.Color(0x0c1e30);
    this.scene.fog = new THREE.FogExp2(0x0e243a, 0.00012);

    // 2. Sunlight & Ambient Lighting
    const hemiLight = new THREE.HemisphereLight(0x4488bb, 0x081420, 1.2);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.8);
    sunLight.position.set(2000, 4000, 3000);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 500;
    sunLight.shadow.camera.far = 10000;
    const d = 1500;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    this.scene.add(sunLight);

    // 3. Dynamic Ocean Surface
    const oceanGeom = new THREE.PlaneGeometry(16000, 16000, 64, 64);
    oceanGeom.rotateX(-Math.PI / 2);

    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x051a2e,
      roughness: 0.15,
      metalness: 0.85,
      flatShading: true
    });

    this.ocean = new THREE.Mesh(oceanGeom, oceanMat);
    this.ocean.position.y = 0;
    this.ocean.receiveShadow = true;
    this.scene.add(this.ocean);

    // Store original ocean vertex Y positions for wave animations
    const pos = oceanGeom.attributes.position;
    this.oceanOriginalY = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      this.oceanOriginalY[i] = pos.getY(i);
    }

    // 4. Tactical Apex Island with Military Airbase Runway
    this.createAtollIsland();

    // 5. Volumetric Cloud Layer (Altitudes 1800m - 3200m)
    this.createCloudField();
  }

  createAtollIsland() {
    const islandGroup = new THREE.Group();

    // Island Terrain Base
    const terrainGeom = new THREE.CylinderGeometry(1400, 2200, 250, 24);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x1a261c, // Dark tactical green/rock
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    });
    const terrain = new THREE.Mesh(terrainGeom, terrainMat);
    terrain.position.set(0, 100, 0);
    terrain.receiveShadow = true;
    islandGroup.add(terrain);

    // Military Tarmac Runway
    const runwayGeom = new THREE.PlaneGeometry(160, 2200);
    runwayGeom.rotateX(-Math.PI / 2);
    const runwayMat = new THREE.MeshStandardMaterial({
      color: 0x1e242b,
      roughness: 0.6,
      metalness: 0.2
    });
    const runway = new THREE.Mesh(runwayGeom, runwayMat);
    runway.position.set(0, 226, 0);
    runway.receiveShadow = true;
    islandGroup.add(runway);

    // Runway Centerline Stripes
    for (let z = -1000; z < 1000; z += 80) {
      const stripeGeom = new THREE.PlaneGeometry(6, 40);
      stripeGeom.rotateX(-Math.PI / 2);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const stripe = new THREE.Mesh(stripeGeom, stripeMat);
      stripe.position.set(0, 227, z);
      islandGroup.add(stripe);
    }

    // Airbase Control Tower & Radar Dome
    const towerGeom = new THREE.CylinderGeometry(20, 26, 120, 8);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x3a4450 });
    const tower = new THREE.Mesh(towerGeom, towerMat);
    tower.position.set(200, 286, 100);
    tower.castShadow = true;
    islandGroup.add(tower);

    // Radar Dome
    const domeGeom = new THREE.SphereGeometry(18, 12, 12);
    const domeMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true });
    const dome = new THREE.Mesh(domeGeom, domeMat);
    dome.position.set(200, 356, 100);
    islandGroup.add(dome);

    this.scene.add(islandGroup);
  }

  createCloudField() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.55,
      flatShading: true
    });

    const puffGeom = new THREE.DodecahedronGeometry(120, 1);

    for (let i = 0; i < 70; i++) {
      const cloudCluster = new THREE.Group();
      const numPuffs = 5 + Math.floor(Math.random() * 6);

      for (let j = 0; j < numPuffs; j++) {
        const puff = new THREE.Mesh(puffGeom, cloudMat);
        puff.position.set(
          (Math.random() - 0.5) * 300,
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 300
        );
        const s = 0.8 + Math.random() * 1.4;
        puff.scale.set(s * 1.5, s, s * 1.2);
        cloudCluster.add(puff);
      }

      cloudCluster.position.set(
        (Math.random() - 0.5) * 12000,
        1800 + Math.random() * 1400, // Cloud ceiling 1800m - 3200m
        (Math.random() - 0.5) * 12000
      );

      this.scene.add(cloudCluster);
      this.cloudPuffs.push(cloudCluster);
    }
  }

  update(dt) {
    this.time += dt * 0.8;

    // Animate Ocean Waves
    if (this.ocean) {
      const pos = this.ocean.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i);
        const v = pos.getZ(i);
        const wave = Math.sin(u * 0.005 + this.time) * 12 + Math.cos(v * 0.005 + this.time * 0.8) * 10;
        pos.setY(i, wave);
      }
      pos.needsUpdate = true;
    }

    // Slowly drift clouds
    for (let c of this.cloudPuffs) {
      c.position.x += dt * 15;
      if (c.position.x > 6000) c.position.x = -6000;
    }
  }
}

