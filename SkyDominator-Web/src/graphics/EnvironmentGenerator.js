import * as THREE from 'three';

/**
 * 3D Tactical Environment Generator (Cities, Airbase, Ground Defense Targets & Atmosphere)
 */
export class EnvironmentGenerator {
  constructor(scene) {
    this.scene = scene;
    this.ocean = null;
    this.cloudPuffs = [];
    this.runwayGroup = null;
    this.groundTargets = [];
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
    this.sun = sunLight;
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

    const pos = oceanGeom.attributes.position;
    this.oceanOriginalY = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      this.oceanOriginalY[i] = pos.getY(i);
    }

    // 4. Tactical Apex Island with Military Airbase Runway
    this.createAtollIsland();

    // 5. Volumetric Cloud Layer
    this.createCloudField();
  }

  createAtollIsland() {
    const islandGroup = new THREE.Group();

    // Island Terrain Base
    const terrainGeom = new THREE.CylinderGeometry(1400, 2200, 250, 24);
    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x1a261c,
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

    const domeGeom = new THREE.SphereGeometry(18, 12, 12);
    const domeMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true });
    const dome = new THREE.Mesh(domeGeom, domeMat);
    dome.position.set(200, 356, 100);
    islandGroup.add(dome);

    this.atoll = islandGroup;
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
        1800 + Math.random() * 1400,
        (Math.random() - 0.5) * 12000
      );

      this.scene.add(cloudCluster);
      this.cloudPuffs.push(cloudCluster);
    }
  }

  showHangar(on) {
    if (this.atoll) this.atoll.visible = on;
    if (this.city) this.city.visible = !on;
    if (on) this.scene.fog.density = 0.00012;
  }

  /**
   * Builds the city skyline + ground attack defense targets
   */
  loadTheme(m) {
    if (this.city) {
      this.scene.remove(this.city);
      this.city.traverse(o => { o.geometry?.dispose(); });
    }
    this.groundTargets = [];

    const g = this.city = new THREE.Group();
    this.scene.background = new THREE.Color(m.sky);
    this.scene.fog.color.set(m.fog);
    this.scene.fog.density = m.fogD;
    this.ocean.material.color.set(m.water);

    // Ground terrain
    const land = new THREE.Mesh(
      new THREE.PlaneGeometry(m.bld.coast ? 5200 : 9000, 9000).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: m.land, roughness: 1 })
    );
    land.position.set(m.bld.coast ? -1400 : 0, 14, 0);
    land.receiveShadow = true;
    g.add(land);

    // Window texture for city buildings
    const c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#222'; x.fillRect(0, 0, 64, 128);
    for (let r = 0; r < 32; r++) {
      for (let q = 0; q < 8; q++) {
        x.fillStyle = Math.random() > 0.45 ? (m.night ? '#ffd890' : '#9fb8c8') : '#30343c';
        x.fillRect(q * 8 + 1, r * 4 + 1, 5, 2);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.5,
      metalness: 0.4,
      emissiveMap: tex,
      emissive: m.night ? 0xffffff : 0x000000,
      emissiveIntensity: m.night ? 0.9 : 0
    });

    const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const inst = new THREE.InstancedMesh(geo, mat, m.bld.count);
    const d = new THREE.Object3D();
    const col = new THREE.Color();

    for (let i = 0; i < m.bld.count; i++) {
      const dist = Math.pow(Math.random(), 1.6);
      const ang = Math.random() * 6.283, r = dist * m.bld.area;
      const bx = Math.cos(ang) * r - (m.bld.coast ? 800 : 0), bz = Math.sin(ang) * r;
      const h = m.bld.minH + (m.bld.maxH - m.bld.minH) * Math.pow(1 - dist, 2) * (0.4 + Math.random() * 0.6);
      d.position.set(bx, 14, bz);
      d.scale.set(30 + Math.random() * 50, h, 30 + Math.random() * 50);

      // Keep airbase clear
      if (Math.hypot(bx, bz + 2600) < 1750) {
        d.scale.set(0.001, 0.001, 0.001);
      }
      d.updateMatrix();
      inst.setMatrixAt(i, d.matrix);
      inst.setColorAt(i, col.set(m.bld.palette[i % m.bld.palette.length]));
    }
    inst.castShadow = true;
    inst.receiveShadow = true;
    g.add(inst);

    // Landmark Spire
    const sp = new THREE.Mesh(
      new THREE.ConeGeometry(18, m.spire.h, 6).translate(0, m.spire.h / 2, 0),
      new THREE.MeshStandardMaterial({
        color: m.spire.color,
        metalness: 0.7,
        roughness: 0.25,
        emissive: m.night ? m.spire.color : 0x000000,
        emissiveIntensity: 0.6
      })
    );
    sp.position.set(-200, 14, 150);
    sp.castShadow = true;
    g.add(sp);

    // AIRBASE: runway, hangars, tower, safe-zone ring
    const bz = -2600;
    const bm = (clr, r = 0.85) => new THREE.MeshStandardMaterial({ color: clr, roughness: r });
    const at = (gObj, mObj, ax, ay, az) => {
      const o = new THREE.Mesh(gObj, mObj);
      o.position.set(ax, ay, az);
      o.castShadow = true;
      o.receiveShadow = true;
      g.add(o);
      return o;
    };

    at(new THREE.PlaneGeometry(110, 2600).rotateX(-Math.PI / 2), bm(0x2a2d32), 0, 15, bz);
    const stripes = new THREE.InstancedMesh(new THREE.PlaneGeometry(4, 30).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff }), 52);
    const lights = new THREE.InstancedMesh(new THREE.SphereGeometry(1.2, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd060 }), 132);
    d.scale.set(1, 1, 1);
    for (let i = 0; i < 52; i++) {
      d.position.set(0, 15.3, bz - 1250 + i * 50);
      d.updateMatrix();
      stripes.setMatrixAt(i, d.matrix);
    }
    for (let i = 0; i < 66; i++) {
      for (let k = 0; k < 2; k++) {
        d.position.set(k ? 58 : -58, 15.8, bz - 1300 + i * 40);
        d.updateMatrix();
        lights.setMatrixAt(i * 2 + k, d.matrix);
      }
    }
    g.add(stripes, lights);

    for (let k = 0; k < 3; k++) {
      at(new THREE.BoxGeometry(70, 26, 90), bm(0x555b62), 190, 28, bz - 500 + k * 380);
    }
    at(new THREE.CylinderGeometry(9, 12, 60, 8), bm(0x6a727c), -140, 45, bz);
    at(new THREE.BoxGeometry(26, 10, 26), new THREE.MeshStandardMaterial({ color: 0x8ad0ff, emissive: 0x2060a0, emissiveIntensity: 0.6 }), -140, 80, bz);

    const R = 1400;
    at(new THREE.RingGeometry(R - 14, R, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.7 }), 0, 17, bz);
    at(new THREE.CylinderGeometry(R, R, 260, 64, 1, true), new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }), 0, 145, bz);
    this.base = { x: 0, z: bz, radius: R, groundY: 17 };

    // ---- SPAWN GROUND ATTACK TARGETS ----
    if (m.groundTargets && m.groundTargets.length > 0) {
      this.spawnGroundTargets(m.groundTargets, g);
    }

    this.scene.add(g);
    if (this.sun) {
      this.sun.color.set(m.sun);
      this.sun.intensity = m.night ? 0.5 : 2.8;
    }
  }

  /**
   * Builds distinct 3D models for SAM platforms, Radars, Fuel Depots, and Bunkers
   */
  spawnGroundTargets(targetsList, parentGroup) {
    const samMat = new THREE.MeshStandardMaterial({ color: 0x485238, metalness: 0.5, roughness: 0.6 }); // Tactical green
    const radarMat = new THREE.MeshStandardMaterial({ color: 0x6e7888, metalness: 0.8, roughness: 0.3 });
    const fuelMat = new THREE.MeshStandardMaterial({ color: 0xc8d0d8, metalness: 0.6, roughness: 0.4 });
    const hazardMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    for (let t of targetsList) {
      const targetGroup = new THREE.Group();
      targetGroup.name = `gt_${t.id}`;
      targetGroup.position.set(t.x, t.y, t.z);

      if (t.type === 'SAM') {
        // Concrete platform
        const pad = new THREE.Mesh(new THREE.BoxGeometry(45, 6, 45), new THREE.MeshStandardMaterial({ color: 0x33363b, roughness: 0.9 }));
        pad.position.y = 3;
        pad.receiveShadow = true;
        targetGroup.add(pad);

        // Rotating radar radar dish
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 18, 8), samMat);
        tower.position.y = 12;
        targetGroup.add(tower);

        const dish = new THREE.Mesh(new THREE.CylinderGeometry(10, 2, 4, 12).rotateX(Math.PI / 4), radarMat);
        dish.position.set(0, 22, 0);
        dish.name = 'radar_dish';
        targetGroup.add(dish);

        // Missile canister battery
        for (let s of [-1, 1]) {
          const canister = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 22).rotateX(Math.PI / 6), samMat);
          canister.position.set(s * 12, 10, 0);
          canister.castShadow = true;
          targetGroup.add(canister);
        }

      } else if (t.type === 'RADAR') {
        // Geodesic radome on lattice mast
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(5, 9, 50, 8), radarMat);
        mast.position.y = 25;
        mast.castShadow = true;
        targetGroup.add(mast);

        const radome = new THREE.Mesh(new THREE.DodecahedronGeometry(18, 2), new THREE.MeshStandardMaterial({ color: 0xdde5f0, roughness: 0.4 }));
        radome.position.y = 56;
        radome.castShadow = true;
        targetGroup.add(radome);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(2, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
        beacon.position.y = 75;
        targetGroup.add(beacon);

      } else if (t.type === 'FUEL') {
        // Twin cylindrical oil storage tanks
        for (let s of [-1, 1]) {
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 28, 16), fuelMat);
          tank.position.set(s * 24, 14, 0);
          tank.castShadow = true;
          targetGroup.add(tank);

          // Hazard stripe rim
          const rim = new THREE.Mesh(new THREE.CylinderGeometry(18.2, 18.2, 3, 16), hazardMat);
          rim.position.set(s * 24, 27, 0);
          targetGroup.add(rim);
        }

      } else {
        // Hardened bunker / command center
        const bunker = new THREE.Mesh(new THREE.ConeGeometry(28, 24, 4), new THREE.MeshStandardMaterial({ color: 0x3d434a, roughness: 0.9 }));
        bunker.position.y = 12;
        bunker.rotation.y = Math.PI / 4;
        bunker.castShadow = true;
        targetGroup.add(bunker);

        const commMast = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.5, 35, 6), radarMat);
        commMast.position.set(0, 30, 0);
        targetGroup.add(commMast);
      }

      parentGroup.add(targetGroup);

      this.groundTargets.push({
        id: t.id,
        type: t.type,
        name: t.name,
        hp: t.hp,
        maxHp: t.maxHp,
        mesh: targetGroup,
        position: new THREE.Vector3(t.x, t.y, t.z),
        isDead: false
      });
    }
  }

  damageGroundTarget(targetObj, damage, particles, sound) {
    if (targetObj.isDead) return false;

    targetObj.hp -= damage;
    if (targetObj.hp <= 0) {
      targetObj.isDead = true;
      if (particles) {
        particles.spawnExplosion(targetObj.position.clone().add(new THREE.Vector3(0, 15, 0)), 3.5);
      }
      if (sound) {
        sound.playExplosion(true);
      }

      // Turn model into burnt blackened wreckage
      targetObj.mesh.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.9,
            metalness: 0.1
          });
        }
      });
      return true;
    }
    return false;
  }

  getAliveGroundTargets() {
    return this.groundTargets.filter(t => !t.isDead);
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

    // Rotate active SAM radar dishes
    for (let gt of this.groundTargets) {
      if (!gt.isDead && gt.mesh) {
        const dish = gt.mesh.getObjectByName('radar_dish');
        if (dish) {
          dish.rotation.y += dt * 1.5;
        }
      }
    }
  }
}
