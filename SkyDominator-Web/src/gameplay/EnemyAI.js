import * as THREE from 'three';
import { createMissileModel } from '../graphics/RealisticJet.js';
import { AircraftModelGenerator } from '../graphics/AircraftModelGenerator.js';

/**
 * Intelligent Enemy Fighter AI System
 */
export class EnemySquadronManager {
  constructor(scene, particleSystem, soundManager) {
    this.scene = scene;
    this.particles = particleSystem;
    this.audio = soundManager;
    this.enemies = [];
    this.missiles = [];
    this.threat = 0;
    this.playerSafe = false;
  }

  spawnMissionSquadron(mission, origin = new THREE.Vector3(0, 450, 0)) {
    this.clear();

    const count = mission?.initialEnemies || 5;
    for (let i = 0; i < count; i++) {
      const isBoss = (i === 0 && count >= 5);
      const mesh = AircraftModelGenerator.createAircraft({
        id: `enemy_${i}`,
        defaultColor: isBoss ? 0x220c14 : 0x182028,
        accentColor: isBoss ? 0xff1744 : 0xff6a00,
        wingspan: isBoss ? 17.5 : 14.0,
        wingType: isBoss ? 'forward_swept' : 'diamond_delta'
      });

      mesh.scale.setScalar(isBoss ? 1.5 : 1.3);

      // Spawn in tactical formation ahead and around the city
      const angle = (i / count) * Math.PI * 2;
      const dist = 1800 + Math.random() * 1200;
      const x = origin.x + Math.cos(angle) * dist;
      const y = 350 + Math.random() * 500;
      const z = origin.z + Math.sin(angle) * dist + 1600;

      mesh.position.set(x, y, z);
      mesh.lookAt(origin.x, origin.y, origin.z);
      this.scene.add(mesh);

      const baseSpeed = isBoss ? 210 : 175;
      this.enemies.push({
        id: i,
        name: isBoss ? 'ACE LEADER [VEX-01]' : `BANDIT #${(i + 1).toString().padStart(2, '0')}`,
        mesh,
        hp: isBoss ? 600 : 220,
        maxHp: isBoss ? 600 : 220,
        baseSpeed,
        velocity: new THREE.Vector3(0, 0, baseSpeed),
        isDead: false,
        isBoss,
        shootCooldown: 2.0 + Math.random() * 2.5,
        missileCd: 8.0 + Math.random() * 8.0,
        maneuverTimer: Math.random() * 3.0,
        roll: 0
      });
    }
  }

  clear() {
    for (const m of this.missiles) {
      if (m.mesh) this.scene.remove(m.mesh);
    }
    this.missiles = [];

    for (const e of this.enemies) {
      if (e.mesh) this.scene.remove(e.mesh);
    }
    this.enemies = [];
    this.threat = 0;
  }

  update(dt, playerPos, playerVel, onPlayerDamaged) {
    if (!playerPos) return;

    for (const enemy of this.enemies) {
      if (enemy.isDead || !enemy.mesh) continue;

      const toPlayer = playerPos.clone().sub(enemy.mesh.position);
      const distToPlayer = toPlayer.length();

      // Smooth steering toward player (Dogfight Intercept)
      if (distToPlayer < 7500) {
        const targetDir = toPlayer.clone().normalize();
        const currentForward = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.mesh.quaternion);

        const turnSpeed = enemy.isBoss ? 1.8 : 1.2;
        currentForward.lerp(targetDir, turnSpeed * dt).normalize();

        enemy.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), currentForward);

        // Dynamic banking into turns
        enemy.roll = THREE.MathUtils.lerp(enemy.roll, Math.sin(Date.now() * 0.002 + enemy.id) * 0.7, dt * 2.0);
        enemy.mesh.rotateZ(enemy.roll * 0.08);

        // Cannon Firing against player
        enemy.shootCooldown -= dt;
        if (distToPlayer < 1400 && !this.playerSafe && enemy.shootCooldown <= 0) {
          const aimDot = currentForward.dot(targetDir);
          if (aimDot > 0.85) {
            enemy.shootCooldown = enemy.isBoss ? 0.9 : 2.2;
            this.particles.spawnBullet(enemy.mesh.position, currentForward, enemy.velocity);

            if (distToPlayer < 700 && Math.random() < 0.4) {
              onPlayerDamaged(20);
            }
          }
        }

        // Long-range Homing Missile Launch
        enemy.missileCd -= dt;
        if (distToPlayer > 800 && distToPlayer < 4000 && enemy.missileCd <= 0 && !this.playerSafe && this.missiles.length < 4) {
          const aimDot = currentForward.dot(targetDir);
          if (aimDot > 0.88) {
            enemy.missileCd = enemy.isBoss ? 8 : 15 + Math.random() * 6;
            this.launchMissile(enemy.mesh.position, currentForward);
          }
        }
      }

      // Move forward along nose (+Z)
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.mesh.quaternion);
      enemy.velocity.copy(forward).multiplyScalar(enemy.baseSpeed);
      enemy.mesh.position.addScaledVector(enemy.velocity, dt);

      // Prevent crashing into city / ocean
      if (enemy.mesh.position.y < 90) {
        enemy.mesh.position.y = 90;
        enemy.mesh.rotateX(-0.04);
      }

      // Afterburner visual flames
      AircraftModelGenerator.updateAfterburnerFX(enemy.mesh, 0.8, true);

      // Low health smoke trail
      if (enemy.hp < enemy.maxHp * 0.35 && Math.random() > 0.6) {
        this.particles.spawnMissileSmoke(enemy.mesh.position);
      }
    }

    // Update enemy missiles tracking player
    this.updateMissiles(dt, playerPos, onPlayerDamaged);
  }

  launchMissile(pos, dir) {
    const mesh = createMissileModel();
    mesh.scale.setScalar(2.0);
    mesh.position.copy(pos).addScaledVector(dir, 10);
    this.scene.add(mesh);

    this.missiles.push({
      mesh,
      dir: dir.clone(),
      speed: 340,
      life: 9.0,
      decoy: null
    });

    if (this.audio) this.audio.playWarningChime('missile');
  }

  updateMissiles(dt, playerPos, onPlayerDamaged) {
    let nearest = Infinity;

    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt;

      if (this.playerSafe) m.life = Math.min(m.life, 0.4);

      // Seduce by flares
      if (!m.decoy && this.particles.flares) {
        const f = this.particles.flares.find(fl => fl.mesh.position.distanceTo(m.mesh.position) < 320);
        if (f && Math.random() < 0.65) {
          m.decoy = f;
        }
      }

      const targetPos = m.decoy ? m.decoy.mesh.position : playerPos;
      const toTarget = targetPos.clone().sub(m.mesh.position);
      const dist = toTarget.length();

      m.dir.lerp(toTarget.normalize(), Math.min(1.0, 1.8 * dt)).normalize();
      m.mesh.position.addScaledVector(m.dir, m.speed * dt);
      m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), m.dir);

      this.particles.spawnMissileSmoke(m.mesh.position);

      if (!m.decoy) nearest = Math.min(nearest, dist);

      const hitPlayer = !m.decoy && dist < 25;
      const hitFlare = m.decoy && dist < 20;

      if (hitPlayer || hitFlare || m.life <= 0 || m.mesh.position.y < 15) {
        if (hitPlayer) onPlayerDamaged(150);
        this.particles.spawnExplosion(m.mesh.position, 1.4);
        if (this.audio) this.audio.playExplosion(false);

        this.scene.remove(m.mesh);
        this.missiles.splice(i, 1);
      }
    }

    this.threat = nearest;
  }

  damageEnemy(enemy, damage) {
    if (enemy.isDead) return false;

    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      enemy.isDead = true;
      this.particles.spawnExplosion(enemy.mesh.position, enemy.isBoss ? 3.0 : 1.8);
      if (this.audio) this.audio.playExplosion(enemy.isBoss);

      this.scene.remove(enemy.mesh);
      return true;
    }
    return false;
  }

  getAliveCount() {
    return this.enemies.filter(e => !e.isDead).length;
  }
}
