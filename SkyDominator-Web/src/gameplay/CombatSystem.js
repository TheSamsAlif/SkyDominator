import * as THREE from 'three';

/**
 * Combat & Weapons System (Rotary Cannon, Guided Missiles, AGM Bombs, Countermeasures)
 */
export class CombatSystem {
  constructor(scene, particleSystem, soundManager) {
    this.scene = scene;
    this.particles = particleSystem;
    this.audio = soundManager;

    // Player Vitals
    this.maxHealth = 100;
    this.playerHealth = 100;
    this.maxShield = 100;
    this.playerShield = 100;

    // Cannon
    this.cannonCooldown = 0;
    this.cannonRate = 0.08;

    // Missiles
    this.missiles = [];
    this.maxMissiles = 8;
    this.missileAmmo = 8;
    this.missileCooldown = 0;

    // Bombs
    this.bombs = [];
    this.maxBombs = 4;
    this.bombAmmo = 4;
    this.bombCooldown = 0;

    // Flares
    this.maxFlares = 12;
    this.flareAmmo = 12;
    this.flareCooldown = 0;

    // Lock-on Tracking
    this.currentTarget = null;
    this.lockProgress = 0.0;
    this.isLocked = false;
    this.lockBeepTimer = 0;

    // Shared materials
    this.missileMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.8,
      roughness: 0.25
    });

    this.bombMat = new THREE.MeshStandardMaterial({
      color: 0x3d4a3c,
      metalness: 0.4,
      roughness: 0.6
    });

    // Callback for directional damage
    this.onDamageReceived = null;
  }

  applyUpgrades(upgrades) {
    if (!upgrades) return;

    // Armor: +20% HP per level
    const armorBonus = (upgrades.armor || 0) * 0.20;
    this.maxHealth = Math.round(100 * (1.0 + armorBonus));
    this.playerHealth = this.maxHealth;

    // Missiles: +2 per level
    this.maxMissiles = 8 + (upgrades.missiles || 0) * 2;
    this.missileAmmo = this.maxMissiles;

    // Flares: +4 per level
    this.maxFlares = 12 + (upgrades.flares || 0) * 4;
    this.flareAmmo = this.maxFlares;
  }

  update(dt, playerMesh, playerVel, input, enemySquadron, groundTargetsGroup, onEnemyHit) {
    if (!playerMesh) return;

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerMesh.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerMesh.quaternion);

    // 1. Cannon Firing (LMB / Space)
    this.cannonCooldown = Math.max(0, this.cannonCooldown - dt);
    if (input.fireCannon && this.cannonCooldown <= 0) {
      this.cannonCooldown = this.cannonRate;

      const gunL = playerMesh.position.clone().add(forward.clone().multiplyScalar(4)).add(right.clone().multiplyScalar(1.2));
      const gunR = playerMesh.position.clone().add(forward.clone().multiplyScalar(4)).add(right.clone().multiplyScalar(-1.2));

      this.particles.spawnBullet(gunL, forward, playerVel);
      this.particles.spawnBullet(gunR, forward, playerVel);

      if (this.audio) this.audio.playCannonFire();
    }

    // 2. Lock-on Tracking
    this.updateTargetTracking(dt, playerMesh, enemySquadron);

    // 3. Air-to-Air Missile Launch (R / M)
    this.missileCooldown = Math.max(0, this.missileCooldown - dt);
    if (input.fireMissile && this.missileCooldown <= 0 && this.missileAmmo > 0) {
      this.missileCooldown = 0.9;
      this.missileAmmo--;
      this.launchMissile(playerMesh, playerVel, forward, this.currentTarget);
      if (this.audio) this.audio.playMissileLaunch();
    }

    // 4. Air-to-Ground Bomb / AGM (Key B)
    this.bombCooldown = Math.max(0, this.bombCooldown - dt);
    if (input.fireBomb && this.bombCooldown <= 0 && this.bombAmmo > 0) {
      this.bombCooldown = 1.4;
      this.bombAmmo--;
      this.launchBomb(playerMesh, playerVel, forward);
      if (this.audio) this.audio.playCannonFire();
    }

    // 5. Flare Countermeasures (C / F)
    this.flareCooldown = Math.max(0, this.flareCooldown - dt);
    if (input.deployFlare && this.flareCooldown <= 0 && this.flareAmmo > 0) {
      this.flareCooldown = 1.2;
      this.flareAmmo -= 2;
      this.particles.spawnFlare(playerMesh.position, playerVel);
    }

    // 6. Update Guided Missiles
    this.updateMissiles(dt, onEnemyHit);

    // 7. Update Bombs
    this.updateBombs(dt, groundTargetsGroup);
  }

  updateTargetTracking(dt, playerMesh, enemySquadron) {
    if (!enemySquadron || !enemySquadron.enemies || enemySquadron.enemies.length === 0) {
      this.currentTarget = null;
      this.isLocked = false;
      this.lockProgress = 0;
      return;
    }

    const playerPos = playerMesh.position;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerMesh.quaternion);

    let bestTarget = null;
    let closestDist = 8000;

    for (const enemy of enemySquadron.enemies) {
      if (enemy.isDead || !enemy.mesh) continue;

      const toEnemy = enemy.mesh.position.clone().sub(playerPos);
      const dist = toEnemy.length();

      if (dist < closestDist) {
        toEnemy.normalize();
        const angle = Math.acos(THREE.MathUtils.clamp(forward.dot(toEnemy), -1, 1));
        if (angle < (45 * Math.PI / 180)) {
          bestTarget = enemy;
          closestDist = dist;
        }
      }
    }

    if (bestTarget) {
      this.currentTarget = bestTarget;
      this.lockProgress = Math.min(1.0, this.lockProgress + dt * 1.2);
      this.isLocked = (this.lockProgress >= 1.0);

      this.lockBeepTimer += dt;
      const beepInterval = this.isLocked ? 0.12 : 0.35;
      if (this.lockBeepTimer >= beepInterval) {
        this.lockBeepTimer = 0;
        if (this.audio) this.audio.playLockTone(this.isLocked);
      }
    } else {
      this.currentTarget = null;
      this.lockProgress = Math.max(0, this.lockProgress - dt * 2.0);
      this.isLocked = false;
    }
  }

  launchMissile(playerMesh, playerVel, forward, target) {
    const group = new THREE.Group();
    const bodyGeom = new THREE.CylinderGeometry(0.18, 0.18, 3.2, 8);
    bodyGeom.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeom, this.missileMat);
    group.add(body);

    const noseGeom = new THREE.ConeGeometry(0.18, 0.7, 8);
    noseGeom.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeom, this.missileMat);
    nose.position.set(0, 0, 1.9);
    group.add(nose);

    group.position.copy(playerMesh.position).add(forward.clone().multiplyScalar(4));
    group.quaternion.copy(playerMesh.quaternion);
    this.scene.add(group);

    this.missiles.push({
      mesh: group,
      velocity: forward.clone().multiplyScalar(320).add(playerVel),
      target: target,
      life: 8.0,
      turnRate: 3.8
    });
  }

  updateMissiles(dt, onEnemyHit) {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt;

      if (m.target && !m.target.isDead && m.target.mesh) {
        const toTarget = m.target.mesh.position.clone().sub(m.mesh.position).normalize();
        const currentDir = m.velocity.clone().normalize();

        currentDir.lerp(toTarget, m.turnRate * dt).normalize();
        m.velocity.copy(currentDir.multiplyScalar(780));
        m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), currentDir);

        const dist = m.mesh.position.distanceTo(m.target.mesh.position);
        if (dist < 20.0) {
          this.particles.spawnExplosion(m.mesh.position, 2.2);
          if (this.audio) this.audio.playExplosion(true);
          onEnemyHit(m.target, 450);

          this.scene.remove(m.mesh);
          this.missiles.splice(i, 1);
          continue;
        }
      }

      m.mesh.position.addScaledVector(m.velocity, dt);
      this.particles.spawnMissileSmoke(m.mesh.position);

      if (m.life <= 0 || m.mesh.position.y <= 0) {
        this.particles.spawnExplosion(m.mesh.position, 1.2);
        this.scene.remove(m.mesh);
        this.missiles.splice(i, 1);
      }
    }
  }

  launchBomb(playerMesh, playerVel, forward) {
    const geom = new THREE.CylinderGeometry(0.35, 0.5, 3.8, 8);
    geom.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geom, this.bombMat);

    mesh.position.copy(playerMesh.position).add(new THREE.Vector3(0, -1.5, 0));
    mesh.quaternion.copy(playerMesh.quaternion);

    const vel = forward.clone().multiplyScalar(160).add(playerVel.clone().multiplyScalar(0.5));
    vel.y -= 15;

    this.scene.add(mesh);
    this.bombs.push({
      mesh,
      velocity: vel,
      life: 12.0,
      damage: 600,
      blastRadius: 95
    });
  }

  updateBombs(dt, groundTargetsGroup) {
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.life -= dt;

      b.velocity.y -= 95 * dt;
      b.mesh.position.addScaledVector(b.velocity, dt);

      const dir = b.velocity.clone().normalize();
      b.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);

      let detonated = b.mesh.position.y <= 3;

      if (groundTargetsGroup) {
        groundTargetsGroup.children.forEach((gt) => {
          if (gt.userData && gt.userData.isAlive) {
            const dist = b.mesh.position.distanceTo(gt.position);
            if (dist < b.blastRadius) {
              gt.userData.health -= b.damage;
              detonated = true;
            }
          }
        });
      }

      if (detonated || b.life <= 0) {
        this.particles.spawnExplosion(b.mesh.position, 4.0);
        if (this.audio) this.audio.playExplosion(true);
        this.scene.remove(b.mesh);
        this.bombs.splice(i, 1);
      }
    }
  }

  applyDamageToPlayer(damage, attackerPos = null, playerMesh = null) {
    if (this.playerShield > 0) {
      const absorbed = Math.min(this.playerShield, damage);
      this.playerShield -= absorbed;
      damage -= absorbed;
    }
    this.playerHealth = Math.max(0, this.playerHealth - damage);

    // Directional damage calculation
    if (attackerPos && playerMesh && this.onDamageReceived) {
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerMesh.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerMesh.quaternion);
      const toAttacker = attackerPos.clone().sub(playerMesh.position).normalize();

      const fDot = forward.dot(toAttacker);
      const rDot = right.dot(toAttacker);

      let direction = 'front';
      if (fDot < -0.4) direction = 'back';
      else if (rDot > 0.4) direction = 'right';
      else if (rDot < -0.4) direction = 'left';

      this.onDamageReceived(direction);
    }

    return this.playerHealth <= 0;
  }

  rearmAll() {
    this.playerHealth = this.maxHealth;
    this.playerShield = this.maxShield;
    this.missileAmmo = this.maxMissiles;
    this.bombAmmo = this.maxBombs;
    this.flareAmmo = this.maxFlares;
  }

  clear() {
    for (const m of this.missiles) {
      if (m.mesh) this.scene.remove(m.mesh);
    }
    this.missiles = [];

    for (const b of this.bombs) {
      if (b.mesh) this.scene.remove(b.mesh);
    }
    this.bombs = [];
    this.currentTarget = null;
    this.isLocked = false;
    this.lockProgress = 0;
  }
}
