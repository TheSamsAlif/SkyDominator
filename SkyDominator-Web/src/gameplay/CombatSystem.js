import * as THREE from 'three';

/**
 * Combat & Weapons System (Rotary Cannon, Guided Missiles, Flares, Radar Lock)
 */
export class CombatSystem {
  constructor(scene, particleSystem, soundManager) {
    this.scene = scene;
    this.particles = particleSystem;
    this.audio = soundManager;

    this.missilesInFlight = [];
    this.missileAmmo = 8;
    this.maxMissiles = 8;
    this.flareAmmo = 12;
    this.maxFlares = 12;

    this.cannonCooldown = 0;
    this.cannonRate = 0.08; // 750 rounds per min

    this.missileCooldown = 0;
    this.flareCooldown = 0;

    // Lock-on Tracking
    this.currentTarget = null;
    this.lockProgress = 0; // 0.0 to 1.0
    this.isLocked = false;
    this.lockBeepTimer = 0;

    // Missile 3D Mesh Template
    this.missileMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      metalness: 0.8,
      roughness: 0.2
    });
  }

  update(dt, playerMesh, playerVel, input, enemySquadron, onEnemyHit) {
    // 1. Cannon Firing
    this.cannonCooldown = Math.max(0, this.cannonCooldown - dt);
    if (input.fireCannon && this.cannonCooldown <= 0) {
      this.cannonCooldown = this.cannonRate;

      // Dual wingtip / nose gun offsets
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerMesh.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerMesh.quaternion);
      const gunL = playerMesh.position.clone().add(forward.clone().multiplyScalar(5)).add(right.clone().multiplyScalar(1.2));
      const gunR = playerMesh.position.clone().add(forward.clone().multiplyScalar(5)).add(right.clone().multiplyScalar(-1.2));

      this.particles.spawnBullet(gunL, forward, playerVel);
      this.particles.spawnBullet(gunR, forward, playerVel);
      this.audio.playCannonFire();
    }

    // 2. Lock-on Scanning Cone
    this.updateTargetTracking(dt, playerMesh, enemySquadron);

    // 3. Missile Launch
    this.missileCooldown = Math.max(0, this.missileCooldown - dt);
    if (input.fireMissile && this.missileCooldown <= 0 && this.missileAmmo > 0) {
      this.missileCooldown = 1.0;
      this.missileAmmo--;
      this.launchMissile(playerMesh, playerVel, this.currentTarget);
      this.audio.playMissileLaunch();
    }

    // 4. Flare Deployment
    this.flareCooldown = Math.max(0, this.flareCooldown - dt);
    if (input.deployFlare && this.flareCooldown <= 0 && this.flareAmmo > 0) {
      this.flareCooldown = 1.5;
      this.flareAmmo--;
      this.particles.spawnFlare(playerMesh.position, playerVel);
    }

    // 5. Update Guided Missiles in Flight
    this.updateMissiles(dt, onEnemyHit);
  }

  updateTargetTracking(dt, playerMesh, enemySquadron) {
    if (!enemySquadron || enemySquadron.length === 0) {
      this.currentTarget = null;
      this.isLocked = false;
      this.lockProgress = 0;
      return;
    }

    const playerPos = playerMesh.position;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerMesh.quaternion);

    let bestTarget = null;
    let closestDist = 8000;

    for (let enemy of enemySquadron) {
      if (enemy.isDead || !enemy.mesh) continue;

      const toEnemy = enemy.mesh.position.clone().sub(playerPos);
      const dist = toEnemy.length();

      if (dist < closestDist) {
        toEnemy.normalize();
        const angle = Math.acos(THREE.MathUtils.clamp(forward.dot(toEnemy), -1, 1));
        // Within 40 degree forward radar cone
        if (angle < (40 * Math.PI / 180)) {
          bestTarget = enemy;
          closestDist = dist;
        }
      }
    }

    if (bestTarget) {
      this.currentTarget = bestTarget;
      this.lockProgress = Math.min(1.0, this.lockProgress + dt * 0.9);
      this.isLocked = (this.lockProgress >= 1.0);

      // Lock audio tone
      this.lockBeepTimer += dt;
      const beepInterval = this.isLocked ? 0.12 : 0.35;
      if (this.lockBeepTimer >= beepInterval) {
        this.lockBeepTimer = 0;
        this.audio.playLockTone(this.isLocked);
      }
    } else {
      this.currentTarget = null;
      this.lockProgress = Math.max(0, this.lockProgress - dt * 1.5);
      this.isLocked = false;
    }
  }

  launchMissile(playerMesh, playerVel, target) {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerMesh.quaternion);

    // 3D Missile Model
    const missileGroup = new THREE.Group();
    const bodyGeom = new THREE.CylinderGeometry(0.22, 0.22, 3.2, 8);
    bodyGeom.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeom, this.missileMat);
    missileGroup.add(body);

    const noseGeom = new THREE.ConeGeometry(0.22, 0.8, 8);
    noseGeom.rotateX(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeom, this.missileMat);
    nose.position.set(0, 0, 2.0);
    missileGroup.add(nose);

    missileGroup.position.copy(playerMesh.position).add(forward.clone().multiplyScalar(4));
    missileGroup.quaternion.copy(playerMesh.quaternion);

    this.scene.add(missileGroup);

    this.missilesInFlight.push({
      mesh: missileGroup,
      velocity: forward.clone().multiplyScalar(350).add(playerVel),
      target: target,
      life: 7.0,
      turnRate: 4.5
    });
  }

  updateMissiles(dt, onEnemyHit) {
    for (let i = this.missilesInFlight.length - 1; i >= 0; i--) {
      const m = this.missilesInFlight[i];
      m.life -= dt;

      // Homing guidance
      if (m.target && !m.target.isDead && m.target.mesh) {
        const toTarget = m.target.mesh.position.clone().sub(m.mesh.position).normalize();
        const currentDir = m.velocity.clone().normalize();

        // Steer velocity toward target
        currentDir.lerp(toTarget, m.turnRate * dt).normalize();
        const speed = 750; // Missile Mach 2+
        m.velocity.copy(currentDir.multiplyScalar(speed));

        m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), currentDir);

        // Proximity Detonation Hit
        const dist = m.mesh.position.distanceTo(m.target.mesh.position);
        if (dist < 18.0) {
          this.particles.spawnExplosion(m.mesh.position, 1.8);
          this.audio.playExplosion(true);
          onEnemyHit(m.target, 450); // Massive missile damage

          this.scene.remove(m.mesh);
          this.missilesInFlight.splice(i, 1);
          continue;
        }
      }

      // Move missile
      m.mesh.position.addScaledVector(m.velocity, dt);

      // Smoke puff trail behind missile rocket motor
      this.particles.spawnMissileSmoke(m.mesh.position);

      if (m.life <= 0) {
        this.particles.spawnExplosion(m.mesh.position, 0.8);
        this.scene.remove(m.mesh);
        this.missilesInFlight.splice(i, 1);
      }
    }
  }
}

