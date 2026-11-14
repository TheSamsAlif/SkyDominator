import * as THREE from 'three';

/**
 * Combat & Weapons System (Rotary Cannon, Guided Missiles, Air-to-Ground Bombs, Flares, Radar Lock)
 */
export class CombatSystem {
  constructor(scene, particleSystem, soundManager) {
    this.scene = scene;
    this.particles = particleSystem;
    this.audio = soundManager;

    this.missilesInFlight = [];
    this.bombsInFlight = [];

    this.missileAmmo = 8;
    this.maxMissiles = 8;
    this.bombAmmo = 4;
    this.maxBombs = 4;
    this.flareAmmo = 12;
    this.maxFlares = 12;

    this.cannonCooldown = 0;
    this.cannonRate = 0.08;

    this.missileCooldown = 0;
    this.bombCooldown = 0;
    this.flareCooldown = 0;

    // Lock-on Tracking (Air)
    this.currentTarget = null;
    this.lockProgress = 0;
    this.isLocked = false;
    this.lockBeepTimer = 0;

    // Weapon Materials
    this.missileMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      metalness: 0.8,
      roughness: 0.2
    });

    this.bombMat = new THREE.MeshStandardMaterial({
      color: 0x3d4438, // Olive drab military bomb
      metalness: 0.6,
      roughness: 0.5
    });
  }

  update(dt, playerMesh, playerVel, input, enemySquadron, onEnemyHit, groundTargets = [], onGroundHit = null) {
    // 1. Cannon Firing
    this.cannonCooldown = Math.max(0, this.cannonCooldown - dt);
    if (input.fireCannon && this.cannonCooldown <= 0) {
      this.cannonCooldown = this.cannonRate;

      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerMesh.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerMesh.quaternion);
      const gunL = playerMesh.position.clone().add(forward.clone().multiplyScalar(5)).add(right.clone().multiplyScalar(1.2));
      const gunR = playerMesh.position.clone().add(forward.clone().multiplyScalar(5)).add(right.clone().multiplyScalar(-1.2));

      this.particles.spawnBullet(gunL, forward, playerVel);
      this.particles.spawnBullet(gunR, forward, playerVel);
      this.audio.playCannonFire();
    }

    // 2. Lock-on Scanning Cone (Air)
    this.updateTargetTracking(dt, playerMesh, enemySquadron);

    // 3. Air-to-Air Missile Launch
    this.missileCooldown = Math.max(0, this.missileCooldown - dt);
    if (input.fireMissile && this.missileCooldown <= 0 && this.missileAmmo > 0) {
      this.missileCooldown = 1.0;
      this.missileAmmo--;
      this.launchMissile(playerMesh, playerVel, this.currentTarget);
      this.audio.playMissileLaunch();
    }

    // 4. Air-to-Ground Heavy Bomb Drop [Key: B]
    this.bombCooldown = Math.max(0, this.bombCooldown - dt);
    if (input.fireBomb && this.bombCooldown <= 0 && this.bombAmmo > 0) {
      this.bombCooldown = 1.4;
      this.bombAmmo--;
      this.dropBomb(playerMesh, playerVel, groundTargets);
      this.audio.playMissileLaunch();
    }

    // 5. Flare Deployment
    this.flareCooldown = Math.max(0, this.flareCooldown - dt);
    if (input.deployFlare && this.flareCooldown <= 0 && this.flareAmmo > 0) {
      this.flareCooldown = 1.5;
      this.flareAmmo--;
      this.particles.spawnFlare(playerMesh.position, playerVel);
    }

    // 6. Update Ordnance in Flight
    this.updateMissiles(dt, onEnemyHit);
    this.updateBombs(dt, groundTargets, onGroundHit);
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

  dropBomb(playerMesh, playerVel, groundTargets = []) {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerMesh.quaternion);

    // Find nearest ground target in front of jet
    let groundTarget = null;
    let minDist = 6000;
    for (let gt of groundTargets) {
      if (!gt.isDead) {
        const d = playerMesh.position.distanceTo(gt.position);
        if (d < minDist) {
          minDist = d;
          groundTarget = gt;
        }
      }
    }

    // Heavy Bomb 3D model
    const bombGroup = new THREE.Group();
    const bodyGeom = new THREE.CylinderGeometry(0.45, 0.55, 4.2, 10);
    bodyGeom.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeom, this.bombMat);
    bombGroup.add(body);

    const noseGeom = new THREE.SphereGeometry(0.55, 10, 8);
    const nose = new THREE.Mesh(noseGeom, this.bombMat);
    nose.position.set(0, 0, 2.1);
    bombGroup.add(nose);

    // Tail guidance fins
    for (let k = 0; k < 4; k++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 1.2), this.bombMat);
      fin.rotation.z = (k * Math.PI) / 2;
      fin.position.set(0, 0, -1.8);
      bombGroup.add(fin);
    }

    bombGroup.position.copy(playerMesh.position).add(new THREE.Vector3(0, -2, 0));
    bombGroup.quaternion.copy(playerMesh.quaternion);
    this.scene.add(bombGroup);

    this.bombsInFlight.push({
      mesh: bombGroup,
      velocity: forward.clone().multiplyScalar(160).add(playerVel.clone().multiplyScalar(0.7)),
      target: groundTarget,
      life: 10.0
    });
  }

  updateMissiles(dt, onEnemyHit) {
    for (let i = this.missilesInFlight.length - 1; i >= 0; i--) {
      const m = this.missilesInFlight[i];
      m.life -= dt;

      if (m.target && !m.target.isDead && m.target.mesh) {
        const toTarget = m.target.mesh.position.clone().sub(m.mesh.position).normalize();
        const currentDir = m.velocity.clone().normalize();

        currentDir.lerp(toTarget, m.turnRate * dt).normalize();
        const speed = 750;
        m.velocity.copy(currentDir.multiplyScalar(speed));

        m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), currentDir);

        const dist = m.mesh.position.distanceTo(m.target.mesh.position);
        if (dist < 18.0) {
          this.particles.spawnExplosion(m.mesh.position, 1.8);
          this.audio.playExplosion(true);
          onEnemyHit(m.target, 450);

          this.scene.remove(m.mesh);
          this.missilesInFlight.splice(i, 1);
          continue;
        }
      }

      m.mesh.position.addScaledVector(m.velocity, dt);
      this.particles.spawnMissileSmoke(m.mesh.position);

      if (m.life <= 0) {
        this.particles.spawnExplosion(m.mesh.position, 0.8);
        this.scene.remove(m.mesh);
        this.missilesInFlight.splice(i, 1);
      }
    }
  }

  updateBombs(dt, groundTargets = [], onGroundHit = null) {
    for (let i = this.bombsInFlight.length - 1; i >= 0; i--) {
      const b = this.bombsInFlight[i];
      b.life -= dt;

      // Gravity acceleration downward
      b.velocity.y -= 9.8 * 8.0 * dt;

      // If tracking a ground target, apply aerodynamic glide steer
      if (b.target && !b.target.isDead) {
        const toTgt = b.target.position.clone().sub(b.mesh.position).normalize();
        b.velocity.lerp(toTgt.multiplyScalar(b.velocity.length()), dt * 1.8);
      }

      b.mesh.position.addScaledVector(b.velocity, dt);

      // Pitch bomb nose down towards its velocity vector
      const dir = b.velocity.clone().normalize();
      b.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);

      // Smoke puff
      if (Math.random() > 0.4) {
        this.particles.spawnMissileSmoke(b.mesh.position);
      }

      // Ground impact check (y <= 16 or close to ground target)
      let detonated = false;
      if (b.mesh.position.y <= 16) {
        detonated = true;
      }

      if (groundTargets && onGroundHit) {
        for (let gt of groundTargets) {
          if (!gt.isDead && b.mesh.position.distanceTo(gt.position) < 32.0) {
            detonated = true;
            break;
          }
        }
      }

      if (detonated) {
        // Massive bomb explosion & shockwave
        this.particles.spawnExplosion(b.mesh.position, 3.2, true);
        this.audio.playExplosion(true);

        // Apply 500 area splash damage to nearby ground targets
        if (groundTargets && onGroundHit) {
          for (let gt of groundTargets) {
            if (!gt.isDead) {
              const d = b.mesh.position.distanceTo(gt.position);
              if (d < 110.0) {
                onGroundHit(gt, 500);
              }
            }
          }
        }

        this.scene.remove(b.mesh);
        this.bombsInFlight.splice(i, 1);
        continue;
      }

      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        this.bombsInFlight.splice(i, 1);
      }
    }
  }
}
