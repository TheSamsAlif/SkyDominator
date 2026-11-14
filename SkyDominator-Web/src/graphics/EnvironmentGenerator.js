import * as THREE from 'three';

/**
 * Procedural Dynamic Environment & Weather Generator
 * Generates:
 * - City Skyline (InstancedMesh)
 * - Tactical Airbase & Runway with Approach Lighting
 * - Defense Perimeter Safe-Zone Ring
 * - Tactical Ground Targets (SAMs, Radars, Fuel Tanks, Bunkers)
 * - Monsoon Rain System & Periodic Lightning Flashes
 * - Night Skyscraper Searchlights
 * - Volumetric Cloud Sprites
 */
export class EnvironmentGenerator {
  constructor(scene) {
    this.scene = scene;
    this.cityGroup = new THREE.Group();
    this.cityGroup.name = 'CityGroup';
    this.scene.add(this.cityGroup);

    this.groundTargetsGroup = new THREE.Group();
    this.groundTargetsGroup.name = 'GroundTargetsGroup';
    this.scene.add(this.groundTargetsGroup);

    this.weatherGroup = new THREE.Group();
    this.weatherGroup.name = 'WeatherGroup';
    this.scene.add(this.weatherGroup);

    this.ocean = null;
    this.safeZoneRing = null;
    this.airbase = null;

    // Weather states
    this.currentWeather = 'clear';
    this.rainParticles = null;
    this.searchlights = [];
    this.clouds = [];
    this.lightningTimer = 8.0;
    this.isLightning = false;
    this.lightningDuration = 0;
    this.origSkyColor = null;
  }

  generateEnvironment(missionConfig) {
    this.clear();

    const spread = missionConfig.citySpread || 4500;
    this.currentWeather = missionConfig.weather || 'clear';
    this.origSkyColor = new THREE.Color(missionConfig.skyColor || 0x0a1018);

    // 1. Terrain Ocean / Ground Base
    const oceanGeo = new THREE.PlaneGeometry(18000, 18000, 32, 32);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: this.currentWeather === 'sunset' ? 0x140a18 : 0x050f1c,
      roughness: 0.18,
      metalness: 0.82
    });
    this.ocean = new THREE.Mesh(oceanGeo, oceanMat);
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = -2;
    this.ocean.receiveShadow = true;
    this.cityGroup.add(this.ocean);

    // 2. High-Density Procedural City Skyline
    this.generateSkyline(spread);

    // 3. Airbase + Runway at origin
    this.generateAirbase();

    // 4. Safe-Zone Defense Perimeter Visualizer
    this.generateSafeZoneRing(1400);

    // 5. Tactical Ground Attack Targets
    if (missionConfig.groundTargets) {
      this.generateGroundTargets(missionConfig.groundTargets);
    }

    // 6. Volumetric Cloud Layer
    this.generateClouds();

    // 7. Mission-Specific Weather Systems
    if (this.currentWeather === 'monsoon') {
      this.setupRainSystem();
    } else if (this.currentWeather === 'night') {
      this.setupNightSearchlights();
    }
  }

  generateSkyline(spread) {
    const buildingCount = 280;
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: this.currentWeather === 'night' ? 0x0c121e : 0x162230,
      roughness: 0.35,
      metalness: 0.75
    });

    const instancedMesh = new THREE.InstancedMesh(boxGeo, buildingMat, buildingCount);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const minDistance = 750;

    let placed = 0;
    for (let i = 0; i < buildingCount; i++) {
      let x = (Math.random() - 0.5) * spread;
      let z = (Math.random() - 0.5) * spread;

      if (Math.abs(x) < minDistance && Math.abs(z) < minDistance) {
        x += (x > 0 ? 1 : -1) * minDistance;
        z += (z > 0 ? 1 : -1) * minDistance;
      }

      const width = 35 + Math.random() * 55;
      const depth = 35 + Math.random() * 55;
      const height = 120 + Math.random() * 450;

      dummy.position.set(x, height / 2, z);
      dummy.scale.set(width, height, depth);
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    this.cityGroup.add(instancedMesh);
  }

  generateAirbase() {
    this.airbase = new THREE.Group();
    this.airbase.name = 'AirbaseRunway';

    const runwayGeo = new THREE.PlaneGeometry(160, 1800);
    const runwayMat = new THREE.MeshStandardMaterial({
      color: 0x11161d,
      roughness: 0.9,
      metalness: 0.1
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(0, 0.2, 0);
    runway.receiveShadow = true;
    this.airbase.add(runway);

    const lineGeo = new THREE.PlaneGeometry(3, 40);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let z = -800; z <= 800; z += 90) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.3, z);
      this.airbase.add(line);
    }

    const lightGeo = new THREE.SphereGeometry(1.2, 8, 8);
    const lightMatGreen = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const lightMatRed = new THREE.MeshBasicMaterial({ color: 0xff2244 });

    for (let z = -850; z <= 850; z += 100) {
      const leftLight = new THREE.Mesh(lightGeo, z > 700 ? lightMatGreen : lightMatRed);
      leftLight.position.set(-82, 1.5, z);
      this.airbase.add(leftLight);

      const rightLight = new THREE.Mesh(lightGeo, z > 700 ? lightMatGreen : lightMatRed);
      rightLight.position.set(82, 1.5, z);
      this.airbase.add(rightLight);
    }

    this.cityGroup.add(this.airbase);
  }

  generateSafeZoneRing(radius = 1400) {
    const ringGeo = new THREE.RingGeometry(radius - 12, radius + 12, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    this.safeZoneRing = new THREE.Mesh(ringGeo, ringMat);
    this.safeZoneRing.rotation.x = -Math.PI / 2;
    this.safeZoneRing.position.y = 2;
    this.cityGroup.add(this.safeZoneRing);
  }

  generateGroundTargets(targets) {
    targets.forEach((targetData) => {
      const targetGroup = new THREE.Group();
      targetGroup.name = `GroundTarget_${targetData.id}`;
      targetGroup.position.set(...targetData.position);
      targetGroup.userData = { ...targetData, isAlive: true };

      if (targetData.type === 'sam') {
        const baseGeo = new THREE.CylinderGeometry(18, 22, 6, 8);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x2d3a3f, roughness: 0.6 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 3;
        targetGroup.add(base);

        const canisterGeo = new THREE.CylinderGeometry(2, 2, 24, 8);
        const canisterMat = new THREE.MeshStandardMaterial({ color: 0x4a5b63, roughness: 0.5 });
        const canLeft = new THREE.Mesh(canisterGeo, canisterMat);
        canLeft.rotation.z = Math.PI / 5;
        canLeft.position.set(-4, 12, 0);
        targetGroup.add(canLeft);

        const canRight = canLeft.clone();
        canRight.position.x = 4;
        targetGroup.add(canRight);

        const dishGeo = new THREE.SphereGeometry(6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const dishMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff, wireframe: true });
        const dish = new THREE.Mesh(dishGeo, dishMat);
        dish.position.set(0, 18, 0);
        dish.name = 'RadarDish';
        targetGroup.add(dish);

      } else if (targetData.type === 'radar') {
        const towerGeo = new THREE.CylinderGeometry(8, 14, 30, 8);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x333d45, roughness: 0.7 });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 15;
        targetGroup.add(tower);

        const domeGeo = new THREE.SphereGeometry(16, 16, 12);
        const domeMat = new THREE.MeshStandardMaterial({ color: 0x99aab5, roughness: 0.4 });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.y = 38;
        targetGroup.add(dome);

      } else if (targetData.type === 'fuel') {
        const tankGeo = new THREE.CylinderGeometry(24, 24, 20, 18);
        const tankMat = new THREE.MeshStandardMaterial({ color: 0x8a2020, roughness: 0.5 });
        const tank = new THREE.Mesh(tankGeo, tankMat);
        tank.position.y = 10;
        targetGroup.add(tank);

      } else {
        const bunkerGeo = new THREE.BoxGeometry(40, 14, 40);
        const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x222a30, roughness: 0.8 });
        const bunker = new THREE.Mesh(bunkerGeo, bunkerMat);
        bunker.position.y = 7;
        targetGroup.add(bunker);
      }

      this.groundTargetsGroup.add(targetGroup);
    });
  }

  generateClouds() {
    const cloudCount = 35;
    const cloudGeo = new THREE.PlaneGeometry(800, 500);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: this.currentWeather === 'sunset' ? 0xffbb88 : 0xddeeff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < cloudCount; i++) {
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.rotation.x = -Math.PI / 2;
      cloud.position.set(
        (Math.random() - 0.5) * 12000,
        1400 + Math.random() * 800,
        (Math.random() - 0.5) * 12000
      );
      this.weatherGroup.add(cloud);
      this.clouds.push(cloud);
    }
  }

  setupRainSystem() {
    const rainCount = 2800;
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2000;
      positions[i * 3 + 1] = Math.random() * 1200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x88bbdd,
      size: 2.2,
      transparent: true,
      opacity: 0.65
    });

    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.weatherGroup.add(this.rainParticles);
  }

  setupNightSearchlights() {
    const beamGeo = new THREE.ConeGeometry(80, 1800, 16, 1, true);
    beamGeo.translate(0, 900, 0);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const searchlightCoords = [
      [-1200, 200, -800],
      [1400, 220, 1100],
      [-800, 250, 1600],
      [900, 180, -1400]
    ];

    searchlightCoords.forEach((coord, idx) => {
      const beam = new THREE.Mesh(beamGeo, beamMat.clone());
      beam.position.set(...coord);
      beam.userData = {
        baseRotX: Math.PI / 6,
        speed: 0.6 + idx * 0.2,
        phase: idx * 1.5
      };
      this.weatherGroup.add(beam);
      this.searchlights.push(beam);
    });
  }

  update(delta, playerPos = null) {
    // 1. Safe zone ring gentle rotation
    if (this.safeZoneRing) {
      this.safeZoneRing.rotation.z += delta * 0.05;
    }

    // 2. Rotate SAM radars
    this.groundTargetsGroup.traverse((obj) => {
      if (obj.name === 'RadarDish') {
        obj.rotation.y += delta * 1.5;
      }
    });

    // 3. Clouds drift gently
    this.clouds.forEach((cloud) => {
      cloud.position.x += delta * 12;
      if (cloud.position.x > 6000) cloud.position.x = -6000;
    });

    // 4. Update Rain around player
    if (this.rainParticles && playerPos) {
      this.rainParticles.position.x = playerPos.x;
      this.rainParticles.position.z = playerPos.z;

      const posAttr = this.rainParticles.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) - delta * 900;
        if (y < 0) y = 1200;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }

    // 5. Update Night Searchlights
    const time = performance.now() * 0.001;
    this.searchlights.forEach((beam) => {
      const osc = Math.sin(time * beam.userData.speed + beam.userData.phase);
      beam.rotation.z = osc * 0.45;
      beam.rotation.x = beam.userData.baseRotX + Math.cos(time * 0.5) * 0.2;
    });

    // 6. Monsoon Lightning Flashes
    if (this.currentWeather === 'monsoon') {
      this.lightningTimer -= delta;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = 8.0 + Math.random() * 8.0;
        this.isLightning = true;
        this.lightningDuration = 0.09;
        this.scene.background = new THREE.Color(0xddeeff);
        if (this.scene.fog) this.scene.fog.color.setHex(0xcce8ff);
      }

      if (this.isLightning) {
        this.lightningDuration -= delta;
        if (this.lightningDuration <= 0) {
          this.isLightning = false;
          if (this.origSkyColor) this.scene.background = this.origSkyColor;
          if (this.scene.fog) this.scene.fog.color.copy(this.origSkyColor);
        }
      }
    }
  }

  clear() {
    while (this.cityGroup.children.length > 0) {
      const obj = this.cityGroup.children[0];
      this.cityGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    }

    while (this.groundTargetsGroup.children.length > 0) {
      const obj = this.groundTargetsGroup.children[0];
      this.groundTargetsGroup.remove(obj);
      obj.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }

    while (this.weatherGroup.children.length > 0) {
      const obj = this.weatherGroup.children[0];
      this.weatherGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }

    this.rainParticles = null;
    this.searchlights = [];
    this.clouds = [];
  }
}
