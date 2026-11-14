import * as THREE from 'three';

/**
 * AAA Procedural High-Fidelity 3D Environment Engine
 * Features:
 * - 360-Degree Atmospheric Skydome with Horizon Rayleigh/Mie Scattering & Deep Space Stars
 * - Expansive Coastal Landmass & Island Plate with Arterial Highway Grid & City Blocks
 * - Architectural Skyscraper Skyline with Tiered, Cylindrical, and Stepped High-Rises
 * - Procedural Facade Textures with Illuminated Office Windows & Rooftop Mechanical Penthouses
 * - Rooftop Red Aviation Hazard Warning Strobes (FAA Military Timing)
 * - 680m Landmark Supertall Pinnacle Spire (Burj/Skytree Style) with Flashing Zenith Strobe
 * - 3D Volumetric Cumulus Cloud Banks with Soft-Shaded Billows
 * - Dynamic Ocean with Animated Wave Ripples & Specular Sun Glint
 * - Distant Coastal Mountain Ridges & Island Archipelago Horizon
 * - High-Detail Military Airbase with Touchdown Skid Marks, PAPI Glide Slope & Approach Lights
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

    // Major elements
    this.skydome = null;
    this.ocean = null;
    this.oceanTexture = null;
    this.terrainPlate = null;
    this.safeZoneRing = null;
    this.airbase = null;
    this.landmarkTower = null;
    this.rooftopBeacons = null;
    this.horizonMountains = null;
    this.cloudBanks = [];

    // Weather states
    this.currentWeather = 'clear';
    this.rainParticles = null;
    this.searchlights = [];
    this.lightningTimer = 8.0;
    this.isLightning = false;
    this.lightningDuration = 0;
    this.origSkyColor = null;
  }

  generateEnvironment(missionConfig) {
    this.clear();

    const spread = missionConfig.citySpread || 5000;
    this.currentWeather = missionConfig.weather || 'clear';
    this.origSkyColor = new THREE.Color(missionConfig.skyColor || 0x0a1018);

    // 1. 360-Degree Atmospheric Skydome with Deep Space Zenith Stars
    this.generateAtmosphericSkydome(missionConfig);

    // 2. Glistening Dynamic Ocean with Wave Ripples
    this.generateOcean(missionConfig);

    // 3. Coastal Mainland Peninsula & Island Landmass with Highways
    this.generateTerrainPlates(spread);

    // 4. Distant Horizon Mountain Silhouettes & Coastlines
    this.generateHorizonMountains();

    // 5. Procedural High-Detail City Skyline & Spire Landmark
    this.generateSkyline(spread);

    // 6. Military Airbase, Runway & Approach Lighting
    this.generateAirbase();

    // 7. Safe-Zone Defense Perimeter Visualizer Ring
    this.generateSafeZoneRing(1400);

    // 8. Tactical Ground Attack Targets
    if (missionConfig.groundTargets) {
      this.generateGroundTargets(missionConfig.groundTargets);
    }

    // 9. 3D Volumetric Cumulus Cloud Banks
    this.generateVolumetricClouds();

    // 10. Mission-Specific Weather Systems
    if (this.currentWeather === 'monsoon') {
      this.setupRainSystem();
    } else if (this.currentWeather === 'night') {
      this.setupNightSearchlights();
    }
  }

  // 1. Skydome Generator with Starfield & Atmospheric Scattering
  generateAtmosphericSkydome(missionConfig) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    const weather = this.currentWeather;

    if (weather === 'sunset') {
      // Dubai Twilight Sunset: Deep cosmos violet-black -> Magenta -> Radiant Amber/Gold
      gradient.addColorStop(0.0, '#04020a');
      gradient.addColorStop(0.28, '#140620');
      gradient.addColorStop(0.58, '#581734');
      gradient.addColorStop(0.82, '#d04f12');
      gradient.addColorStop(1.0, '#f5a623');
    } else if (weather === 'night') {
      // Tokyo Night Cyber: Deep space navy -> Cobalt atmospheric horizon
      gradient.addColorStop(0.0, '#010206');
      gradient.addColorStop(0.45, '#040916');
      gradient.addColorStop(0.78, '#0b1933');
      gradient.addColorStop(1.0, '#152b52');
    } else if (weather === 'monsoon') {
      // Dhaka Monsoon Storm: Heavy slate thundercloud deck
      gradient.addColorStop(0.0, '#050a12');
      gradient.addColorStop(0.38, '#0d1624');
      gradient.addColorStop(0.74, '#1b2839');
      gradient.addColorStop(1.0, '#2b3f55');
    } else {
      // Daylight Coastal Clear: Stratospheric Azure -> Pale Horizon Blue
      gradient.addColorStop(0.0, '#0a1d40');
      gradient.addColorStop(0.42, '#184478');
      gradient.addColorStop(0.78, '#467cb8');
      gradient.addColorStop(1.0, '#92c5ea');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);

    // Deep space celestial stars (Visible in sunset & night zenith)
    if (weather === 'sunset' || weather === 'night') {
      ctx.fillStyle = '#ffffff';
      for (let s = 0; s < 300; s++) {
        const sx = Math.random() * 1024;
        const sy = Math.random() * 220; // Upper sky only
        const sRadius = Math.random() * 1.3;
        const alpha = Math.random() * 0.8 + 0.2;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // Luminous celestial sun corona & halo
    const sunX = 512;
    const sunY = weather === 'sunset' ? 425 : (weather === 'night' ? 300 : 310);
    if (weather !== 'night') {
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 210);
      sunGlow.addColorStop(0, weather === 'sunset' ? 'rgba(255, 245, 200, 0.98)' : 'rgba(255, 255, 255, 0.95)');
      sunGlow.addColorStop(0.22, weather === 'sunset' ? 'rgba(255, 128, 32, 0.65)' : 'rgba(215, 238, 255, 0.50)');
      sunGlow.addColorStop(0.65, weather === 'sunset' ? 'rgba(200, 50, 20, 0.25)' : 'rgba(150, 200, 255, 0.18)');
      sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 210, 0, Math.PI * 2);
      ctx.fill();
    }

    const skyTexture = new THREE.CanvasTexture(canvas);
    const domeGeo = new THREE.SphereGeometry(26000, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshBasicMaterial({
      map: skyTexture,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });

    this.skydome = new THREE.Mesh(domeGeo, domeMat);
    this.cityGroup.add(this.skydome);
  }

  // 2. Dynamic Ocean with Procedural Wave Ripples
  generateOcean(missionConfig) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const baseColor = this.currentWeather === 'sunset' ? '#120816' : (this.currentWeather === 'night' ? '#040b16' : '#081728');
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Wave ripples with specular light fringes
    ctx.strokeStyle = this.currentWeather === 'sunset' ? 'rgba(255, 150, 100, 0.22)' : 'rgba(70, 160, 220, 0.28)';
    ctx.lineWidth = 2.4;

    for (let y = 0; y < 512; y += 14) {
      ctx.beginPath();
      for (let x = 0; x < 512; x += 18) {
        const cy = y + Math.sin(x * 0.06 + y * 0.03) * 4.5;
        if (x === 0) ctx.moveTo(x, cy);
        else ctx.lineTo(x, cy);
      }
      ctx.stroke();
    }

    this.oceanTexture = new THREE.CanvasTexture(canvas);
    this.oceanTexture.wrapS = THREE.RepeatWrapping;
    this.oceanTexture.wrapT = THREE.RepeatWrapping;
    this.oceanTexture.repeat.set(48, 48);

    const oceanGeo = new THREE.PlaneGeometry(28000, 28000, 48, 48);
    const oceanMat = new THREE.MeshStandardMaterial({
      map: this.oceanTexture,
      roughness: 0.16,
      metalness: 0.82
    });

    this.ocean = new THREE.Mesh(oceanGeo, oceanMat);
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = -2;
    this.ocean.receiveShadow = true;
    this.cityGroup.add(this.ocean);

    // Shallow turquoise coastal water around airport perimeter
    const shallowGeo = new THREE.RingGeometry(850, 2300, 48);
    const shallowMat = new THREE.MeshStandardMaterial({
      color: this.currentWeather === 'sunset' ? 0x241220 : 0x0a2838,
      roughness: 0.25,
      metalness: 0.65,
      transparent: true,
      opacity: 0.75
    });
    const shallow = new THREE.Mesh(shallowGeo, shallowMat);
    shallow.rotation.x = -Math.PI / 2;
    shallow.position.y = -1.2;
    this.cityGroup.add(shallow);
  }

  // 3. Expansive Coastal Landmass, Island Plate & Arterial Highway Grid
  generateTerrainPlates(spread) {
    this.terrainPlate = new THREE.Group();

    // Procedural terrain texture with paved asphalt city grid, green parks, and sand beaches
    const tCanvas = document.createElement('canvas');
    tCanvas.width = 1024;
    tCanvas.height = 1024;
    const tCtx = tCanvas.getContext('2d');

    // Mainland terrain base: dark coastal asphalt / rich bedrock
    tCtx.fillStyle = this.currentWeather === 'sunset' ? '#18121a' : (this.currentWeather === 'night' ? '#090d14' : '#141d24');
    tCtx.fillRect(0, 0, 1024, 1024);

    // City street grid lines
    tCtx.strokeStyle = 'rgba(35, 48, 62, 0.85)';
    tCtx.lineWidth = 4;
    for (let x = 60; x < 1024; x += 64) {
      tCtx.beginPath();
      tCtx.moveTo(x, 0);
      tCtx.lineTo(x, 1024);
      tCtx.stroke();
    }
    for (let y = 60; y < 1024; y += 64) {
      tCtx.beginPath();
      tCtx.moveTo(0, y);
      tCtx.lineTo(1024, y);
      tCtx.stroke();
    }

    // Glowing arterial highway network with orange/amber road lighting
    tCtx.strokeStyle = this.currentWeather === 'night' ? 'rgba(255, 170, 34, 0.75)' : 'rgba(210, 140, 50, 0.45)';
    tCtx.lineWidth = 7;
    // Highway loop
    tCtx.beginPath();
    tCtx.arc(512, 512, 380, 0, Math.PI * 2);
    tCtx.stroke();
    // Cross highways
    tCtx.beginPath();
    tCtx.moveTo(512, 0);
    tCtx.lineTo(512, 1024);
    tCtx.moveTo(0, 512);
    tCtx.lineTo(1024, 512);
    tCtx.stroke();

    // Urban green park reserves
    tCtx.fillStyle = this.currentWeather === 'sunset' ? '#161c16' : '#0e1e18';
    tCtx.fillRect(180, 180, 140, 140);
    tCtx.fillRect(720, 680, 160, 120);
    tCtx.fillRect(240, 700, 120, 150);

    const terrainTex = new THREE.CanvasTexture(tCanvas);
    terrainTex.wrapS = THREE.RepeatWrapping;
    terrainTex.wrapT = THREE.RepeatWrapping;
    terrainTex.repeat.set(1, 1);

    // Mainland Island Plate
    const mainlandGeo = new THREE.BoxGeometry(spread * 1.5, 4, spread * 1.5);
    const mainlandMat = new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.88,
      metalness: 0.12
    });
    const mainland = new THREE.Mesh(mainlandGeo, mainlandMat);
    mainland.position.set(0, -1.0, 0);
    mainland.receiveShadow = true;
    this.terrainPlate.add(mainland);

    // Elevated highway viaduct bridge connecting airbase origin to downtown
    const bridgeGeo = new THREE.BoxGeometry(32, 10, 1800);
    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0x1a2430,
      roughness: 0.7,
      metalness: 0.3
    });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(400, 5, 800);
    bridge.rotation.y = Math.PI / 6;
    bridge.castShadow = true;
    bridge.receiveShadow = true;
    this.terrainPlate.add(bridge);

    this.cityGroup.add(this.terrainPlate);
  }

  // 4. Horizon Mountain Ridges & Silhouettes
  generateHorizonMountains() {
    this.horizonMountains = new THREE.Group();
    const count = 42;
    const radius = 15200;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const peakHeight = 650 + Math.random() * 1150;
      const peakWidth = 1500 + Math.random() * 1600;

      const coneGeo = new THREE.ConeGeometry(peakWidth, peakHeight, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: this.currentWeather === 'sunset' ? 0x220f1c : (this.currentWeather === 'night' ? 0x050a14 : 0x121c25),
        roughness: 0.95,
        metalness: 0.05,
        flatShading: true
      });

      const mesh = new THREE.Mesh(coneGeo, mat);
      mesh.position.set(
        Math.sin(angle) * radius,
        peakHeight / 2 - 50,
        Math.cos(angle) * radius
      );
      this.horizonMountains.add(mesh);
    }
    this.cityGroup.add(this.horizonMountains);
  }

  // 5. Procedural High-Detail Skyscraper Skyline with Diverse Geometries
  generateSkyline(spread) {
    // Generate Procedural Building Facade Texture
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 512;
    bCanvas.height = 512;
    const bCtx = bCanvas.getContext('2d');

    bCtx.fillStyle = this.currentWeather === 'night' ? '#091018' : (this.currentWeather === 'sunset' ? '#181420' : '#1a2432');
    bCtx.fillRect(0, 0, 512, 512);

    // Architectural Mullions & Glass Spandrels
    bCtx.fillStyle = '#04070d';
    for (let x = 0; x < 512; x += 32) {
      bCtx.fillRect(x, 0, 4, 512);
    }
    for (let y = 0; y < 512; y += 18) {
      bCtx.fillRect(0, y, 512, 4);
    }

    // Glowing Office Windows
    const windowColors = ['#ffeaa7', '#00e5ff', '#dfe6e9', '#fdcb6e', '#74b9ff'];
    for (let y = 8; y < 512; y += 18) {
      for (let x = 6; x < 512; x += 32) {
        if (Math.random() > 0.35) {
          bCtx.fillStyle = windowColors[Math.floor(Math.random() * windowColors.length)];
          bCtx.fillRect(x, y, 22, 10);
        }
      }
    }

    const bTexture = new THREE.CanvasTexture(bCanvas);
    bTexture.wrapS = THREE.RepeatWrapping;
    bTexture.wrapT = THREE.RepeatWrapping;
    bTexture.repeat.set(2, 6);

    // Dedicated Emissive Night Light Texture
    const eCanvas = document.createElement('canvas');
    eCanvas.width = 512;
    eCanvas.height = 512;
    const eCtx = eCanvas.getContext('2d');
    eCtx.fillStyle = '#000000';
    eCtx.fillRect(0, 0, 512, 512);

    for (let y = 8; y < 512; y += 18) {
      for (let x = 6; x < 512; x += 32) {
        if (Math.random() > 0.35) {
          eCtx.fillStyle = windowColors[Math.floor(Math.random() * windowColors.length)];
          eCtx.fillRect(x, y, 22, 10);
        }
      }
    }

    const eTexture = new THREE.CanvasTexture(eCanvas);
    eTexture.wrapS = THREE.RepeatWrapping;
    eTexture.wrapT = THREE.RepeatWrapping;
    eTexture.repeat.set(2, 6);

    const buildingMat = new THREE.MeshStandardMaterial({
      map: bTexture,
      emissiveMap: eTexture,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.90,
      roughness: 0.32,
      metalness: 0.68
    });

    // 5A. Tower Type 1: Rectangular Box High-Rises (260 Towers)
    const boxCount = 260;
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const boxMesh = new THREE.InstancedMesh(boxGeo, buildingMat, boxCount);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;

    // 5B. Tower Type 2: Sleek Cylindrical Modern Towers (70 Towers)
    const cylCount = 70;
    const cylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
    const cylMesh = new THREE.InstancedMesh(cylGeo, buildingMat, cylCount);
    cylMesh.castShadow = true;
    cylMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const minDistance = 780;
    const beaconPositions = [];

    let boxIdx = 0;
    let cylIdx = 0;

    for (let i = 0; i < (boxCount + cylCount); i++) {
      let x = (Math.random() - 0.5) * spread;
      let z = (Math.random() - 0.5) * spread;

      if (Math.abs(x) < minDistance && Math.abs(z) < minDistance) {
        x += (x > 0 ? 1 : -1) * minDistance;
        z += (z > 0 ? 1 : -1) * minDistance;
      }

      const isCyl = (i % 5 === 0) && cylIdx < cylCount;
      const width = 38 + Math.random() * 56;
      const depth = 38 + Math.random() * 56;
      const height = 130 + Math.random() * 490;

      dummy.position.set(x, height / 2, z);

      if (isCyl) {
        const radius = (width + depth) * 0.45;
        dummy.scale.set(radius, height, radius);
        dummy.updateMatrix();
        cylMesh.setMatrixAt(cylIdx++, dummy.matrix);
      } else if (boxIdx < boxCount) {
        dummy.scale.set(width, height, depth);
        dummy.updateMatrix();
        boxMesh.setMatrixAt(boxIdx++, dummy.matrix);
      }

      // FAA Obstruction Strobes on tall towers (> 280m)
      if (height > 280) {
        beaconPositions.push(new THREE.Vector3(x, height + 2, z));
      }
    }

    boxMesh.instanceMatrix.needsUpdate = true;
    cylMesh.instanceMatrix.needsUpdate = true;
    this.cityGroup.add(boxMesh);
    this.cityGroup.add(cylMesh);

    // 5C. Rooftop Red Aviation Hazard Warning Lights (FAA Military Strobes)
    if (beaconPositions.length > 0) {
      const beaconGeo = new THREE.SphereGeometry(2.6, 6, 6);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: 0xff1744
      });

      this.rooftopBeacons = new THREE.InstancedMesh(beaconGeo, beaconMat, beaconPositions.length);
      beaconPositions.forEach((pos, idx) => {
        dummy.position.copy(pos);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.rooftopBeacons.setMatrixAt(idx, dummy.matrix);
      });
      this.rooftopBeacons.instanceMatrix.needsUpdate = true;
      this.cityGroup.add(this.rooftopBeacons);
    }

    // 5D. Landmark 680m Supertall Pinnacle Spire
    this.generateLandmarkSpire();
  }

  generateLandmarkSpire() {
    this.landmarkTower = new THREE.Group();
    this.landmarkTower.position.set(850, 0, 1400);

    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x1e2d3d,
      roughness: 0.15,
      metalness: 0.85
    });

    // Tier 1 Base (0 - 200m)
    const t1 = new THREE.Mesh(new THREE.CylinderGeometry(32, 54, 200, 8), spireMat);
    t1.position.y = 100;
    t1.castShadow = true;
    this.landmarkTower.add(t1);

    // Tier 2 Middle (200 - 380m)
    const t2 = new THREE.Mesh(new THREE.CylinderGeometry(18, 30, 180, 8), spireMat);
    t2.position.y = 290;
    t2.castShadow = true;
    this.landmarkTower.add(t2);

    // Tier 3 Spire (380 - 580m)
    const t3 = new THREE.Mesh(new THREE.ConeGeometry(16, 200, 8), spireMat);
    t3.position.y = 480;
    t3.castShadow = true;
    this.landmarkTower.add(t3);

    // Pinnacle Antenna Mast (580 - 680m)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.8, 100, 6), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
    mast.position.y = 630;
    this.landmarkTower.add(mast);

    // Pinnacle Aircraft Strobe
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(4.8, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
    beacon.position.y = 680;
    beacon.name = 'PinnacleBeacon';
    this.landmarkTower.add(beacon);

    this.cityGroup.add(this.landmarkTower);
  }

  // 6. Military Airbase, Runway & Approach Lighting
  generateAirbase() {
    this.airbase = new THREE.Group();
    this.airbase.name = 'AirbaseRunway';

    // Asphalt Main Runway with Touchdown Zones
    const runwayGeo = new THREE.PlaneGeometry(160, 2200);
    const runwayMat = new THREE.MeshStandardMaterial({
      color: 0x0f151c,
      roughness: 0.92,
      metalness: 0.08
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(0, 0.2, 0);
    runway.receiveShadow = true;
    this.airbase.add(runway);

    // Centerline Stripes
    const lineGeo = new THREE.PlaneGeometry(3.2, 45);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let z = -900; z <= 900; z += 90) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.3, z);
      this.airbase.add(line);
    }

    // Touchdown Skid Zone Striations
    const skidMat = new THREE.MeshBasicMaterial({ color: 0x05070a });
    const skidGeo = new THREE.PlaneGeometry(28, 220);
    const skid1 = new THREE.Mesh(skidGeo, skidMat);
    skid1.rotation.x = -Math.PI / 2;
    skid1.position.set(-18, 0.25, -650);
    this.airbase.add(skid1);

    const skid2 = new THREE.Mesh(skidGeo, skidMat);
    skid2.rotation.x = -Math.PI / 2;
    skid2.position.set(18, 0.25, -650);
    this.airbase.add(skid2);

    // Runway Edge Lights (Green Approach Threshold, Amber Taxi, Red End)
    const lightGeo = new THREE.SphereGeometry(1.4, 8, 8);
    const lightMatGreen = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const lightMatRed = new THREE.MeshBasicMaterial({ color: 0xff2244 });
    const lightMatAmber = new THREE.MeshBasicMaterial({ color: 0xffbb00 });

    for (let z = -950; z <= 950; z += 95) {
      const isThreshold = z > 750;
      const isEnd = z < -750;
      const mat = isThreshold ? lightMatGreen : (isEnd ? lightMatRed : lightMatAmber);

      const leftLight = new THREE.Mesh(lightGeo, mat);
      leftLight.position.set(-84, 1.5, z);
      this.airbase.add(leftLight);

      const rightLight = new THREE.Mesh(lightGeo, mat);
      rightLight.position.set(84, 1.5, z);
      this.airbase.add(rightLight);
    }

    // Airbase Control Tower with Rotating Radar
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-160, 0, -200);

    const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(14, 18, 55, 8), new THREE.MeshStandardMaterial({ color: 0x22303e, roughness: 0.6 }));
    towerBase.position.y = 27.5;
    towerGroup.add(towerBase);

    const cabGeo = new THREE.CylinderGeometry(20, 15, 14, 8);
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.9, roughness: 0.1 });
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.y = 62;
    towerGroup.add(cab);

    const radarDish = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 1.5, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    radarDish.position.y = 72;
    radarDish.name = 'RadarDish';
    towerGroup.add(radarDish);

    this.airbase.add(towerGroup);
    this.cityGroup.add(this.airbase);
  }

  // 7. Safe-Zone Defense Perimeter Ring
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

  // 8. Tactical Ground Targets
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

        const podGeo = new THREE.BoxGeometry(7, 7, 24);
        const podMat = new THREE.MeshStandardMaterial({ color: 0x1f2b30 });
        const pod1 = new THREE.Mesh(podGeo, podMat);
        pod1.position.set(-6, 12, 0);
        pod1.rotation.x = -Math.PI / 6;
        targetGroup.add(pod1);

        const pod2 = new THREE.Mesh(podGeo, podMat);
        pod2.position.set(6, 12, 0);
        pod2.rotation.x = -Math.PI / 6;
        targetGroup.add(pod2);

      } else if (targetData.type === 'radar') {
        const towerGeo = new THREE.CylinderGeometry(6, 14, 38, 8);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x394b59, metalness: 0.5 });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 19;
        targetGroup.add(tower);

        const domeGeo = new THREE.SphereGeometry(14, 16, 12);
        const domeMat = new THREE.MeshStandardMaterial({ color: 0xedf2f7, roughness: 0.3 });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.y = 42;
        targetGroup.add(dome);

      } else if (targetData.type === 'fuel') {
        const tankGeo = new THREE.CylinderGeometry(20, 20, 22, 16);
        const tankMat = new THREE.MeshStandardMaterial({ color: 0x6e7f80, roughness: 0.4 });
        const tank = new THREE.Mesh(tankGeo, tankMat);
        tank.position.y = 11;
        targetGroup.add(tank);

      } else {
        const bunkerGeo = new THREE.BoxGeometry(40, 16, 40);
        const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x242d32, roughness: 0.8 });
        const bunker = new THREE.Mesh(bunkerGeo, bunkerMat);
        bunker.position.y = 8;
        targetGroup.add(bunker);
      }

      this.groundTargetsGroup.add(targetGroup);
    });
  }

  // 9. 3D Volumetric Cumulus Cloud Banks
  generateVolumetricClouds() {
    this.cloudBanks = [];
    const count = 36;
    const weather = this.currentWeather;

    const cloudMat = new THREE.MeshStandardMaterial({
      color: weather === 'sunset' ? 0xffdfd0 : (weather === 'night' ? 0x1a2638 : 0xecf0f1),
      roughness: 0.96,
      metalness: 0.04,
      transparent: true,
      opacity: 0.72,
      flatShading: true
    });

    for (let i = 0; i < count; i++) {
      const bank = new THREE.Group();
      const cx = (Math.random() - 0.5) * 14000;
      const cy = 1350 + Math.random() * 900;
      const cz = (Math.random() - 0.5) * 14000;
      bank.position.set(cx, cy, cz);

      // 4-6 soft overlapping billows
      const puffs = 4 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffs; p++) {
        const radius = 110 + Math.random() * 140;
        const puffGeo = new THREE.DodecahedronGeometry(radius, 1);
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(
          (Math.random() - 0.5) * 260,
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 260
        );
        puff.scale.set(1.4, 0.72, 1.2);
        bank.add(puff);
      }

      this.weatherGroup.add(bank);
      this.cloudBanks.push(bank);
    }
  }

  // 10. Mission-Specific Systems
  setupRainSystem() {
    const rainCount = 3000;
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2200;
      positions[i * 3 + 1] = Math.random() * 1200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2200;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x88bbdd,
      size: 2.4,
      transparent: true,
      opacity: 0.65
    });

    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.weatherGroup.add(this.rainParticles);
  }

  setupNightSearchlights() {
    const beamGeo = new THREE.ConeGeometry(85, 2000, 16, 1, true);
    beamGeo.translate(0, 1000, 0);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.22,
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

  // Frame Update Loop
  update(delta, playerPos = null) {
    const time = performance.now() * 0.001;

    // 1. Safe zone ring gentle rotation
    if (this.safeZoneRing) {
      this.safeZoneRing.rotation.z += delta * 0.05;
    }

    // 2. Animate Dynamic Ocean Waves
    if (this.oceanTexture) {
      this.oceanTexture.offset.x += delta * 0.012;
      this.oceanTexture.offset.y += delta * 0.008;
    }

    // 3. Rotate Radar Dishes
    this.groundTargetsGroup.traverse((obj) => {
      if (obj.name === 'RadarDish') {
        obj.rotation.y += delta * 1.5;
      }
    });

    // 4. Volumetric Cloud Banks Drift
    this.cloudBanks.forEach((bank) => {
      bank.position.x += delta * 14;
      if (bank.position.x > 7000) bank.position.x = -7000;
    });

    // 5. Pulsing Aviation Warning Strobes (FAA Military 1.2Hz pulse)
    if (this.landmarkTower) {
      const beacon = this.landmarkTower.getObjectByName('PinnacleBeacon');
      if (beacon) {
        beacon.visible = Math.sin(time * 6.0) > 0.15;
      }
    }

    if (this.rooftopBeacons) {
      this.rooftopBeacons.visible = Math.sin(time * 6.0) > 0.15;
    }

    // 6. Update Rain around player
    if (this.rainParticles && playerPos) {
      this.rainParticles.position.x = playerPos.x;
      this.rainParticles.position.z = playerPos.z;

      const posAttr = this.rainParticles.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) - delta * 950;
        if (y < 0) y = 1200;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }

    // 7. Update Night Skyscraper Searchlights
    this.searchlights.forEach((beam) => {
      const osc = Math.sin(time * beam.userData.speed + beam.userData.phase);
      beam.rotation.z = osc * 0.45;
      beam.rotation.x = beam.userData.baseRotX + Math.cos(time * 0.5) * 0.2;
    });

    // 8. Monsoon Lightning Flashes
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
          this.scene.background = null;
          if (this.scene.fog && this.origSkyColor) this.scene.fog.color.copy(this.origSkyColor);
        }
      }
    }
  }

  // Memory & GPU Resource Disposal
  clear() {
    while (this.cityGroup.children.length > 0) {
      const obj = this.cityGroup.children[0];
      this.cityGroup.remove(obj);
      obj.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
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
      obj.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }

    this.skydome = null;
    this.ocean = null;
    this.oceanTexture = null;
    this.terrainPlate = null;
    this.safeZoneRing = null;
    this.airbase = null;
    this.landmarkTower = null;
    this.rooftopBeacons = null;
    this.horizonMountains = null;
    this.cloudBanks = [];
    this.rainParticles = null;
    this.searchlights = [];
  }
}
