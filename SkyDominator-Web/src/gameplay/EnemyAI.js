import * as THREE from 'three';
import { createMissileModel } from '../graphics/RealisticJet.js';
import { AircraftModelGenerator } from '../graphics/AircraftModelGenerator.js';

/**
 * Intelligent Enemy Aircraft AI System
 */
export class EnemySquadronManager {
  constructor(scene, particleSystem, soundManager) {
    this.scene = scene;
    this.particles = particleSystem;
    this.audio = soundManager;
    this.enemies = [];
    this.missiles = [];
    this.threat = 0;
  }

  spawnMissionSquadron(mission, origin) {
    this.clear();
    let i = 0;
    for (const t of mission.enemies) for (let k = 0; k < t.n; k++, i++) {
      const mesh = AircraftModelGenerator.createAircraft({
        id: `enemy_${i}`, defaultColor: t.color, accentColor: t.boss ? 0xff1744 : 0xff6a00,
        wingspan: t.boss ? 17 : 14, wingType: t.boss ? 'forward_swept' : 'diamond_delta' });
      mesh.scale.setScalar(t.boss ? 1.8 : 1.4);
      const ang = (i / 7) * 2.2 - 1.1;
      mesh.position.set(origin.x + Math.sin(ang) * 1800 + (Math.random() - 0.5) * 600,
        700 + Math.random() * 900, origin.z + 3200 + i * 350);
      mesh.lookAt(origin);
      this.scene.add(mesh);
      this.enemies.push({ id: i, name: t.name, class: t.cls, mesh, hp: t.hp, maxHp: t.hp, baseSpeed: t.speed,
        velocity: new THREE.Vector3(0, 0, t.speed), isDead: false, shootCooldown: 2 + Math.random() * 3,
        maneuverTimer: Math.random() * 3, isBoss: !!t.boss, roll: 0, jink: 0 });
    }
  }

  clear() {
    for (const m of this.missiles || []) this.scene.remove(m.mesh);
    this.missiles = [];
    this.threat = 0;
    for (let e of this.enemies) {
      if (e.mesh) {
        this.scene.remove(e.mesh);
      }
    }
    this.enemies = [];
  }

  update(dt, playerPos, playerVel, onPlayerDamaged) {
    for (let enemy of this.enemies) {
      if (enemy.isDead || !enemy.mesh) continue;

      const toPlayer = playerPos.clone().sub(enemy.mesh.position);
      const distToPlayer = toPlayer.length();

      // AI States: Patrol vs Dogfight Intercept
      enemy.maneuverTimer -= dt;
      if (enemy.maneuverTimer <= 0) {
        enemy.maneuverTimer = 2.0 + Math.random() * 3.0;
      }

      // Steer toward player if within 6000m
      if (distToPlayer < 6000) {
        const targetDir = toPlayer.clone().normalize();
        const currentDir = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.mesh.quaternion);

        // Turn towards player smoothly
        const turnSpeed = enemy.isBoss ? 2.2 : 1.2;
        currentDir.lerp(targetDir, turnSpeed * dt).normalize();

        enemy.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), currentDir);

        // Bank into turns
        enemy.roll += ((Math.sin(Date.now() * 0.002 + enemy.id) * 0.6) - enemy.roll) * dt * 2;
        enemy.mesh.rotateZ(enemy.roll * 0.05);
        if (distToPlayer < 900) { enemy.jink += dt; enemy.mesh.rotateX(Math.sin(enemy.jink * 3 + enemy.id) * 0.02); } // evasive jink

        // Firing logic against player
        enemy.shootCooldown -= dt;
        if (distToPlayer < 1200 && !this.playerSafe && enemy.shootCooldown <= 0) {
          const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.mesh.quaternion);
          const aimDot = forward.dot(targetDir);

          if (aimDot > 0.88) { // Aimed at player
            enemy.shootCooldown = enemy.isBoss ? 0.8 : 2.0;
            this.particles.spawnBullet(enemy.mesh.position, forward, enemy.velocity);
            // Check hit against player
            if (distToPlayer < 600 && Math.random() < 0.35) onPlayerDamaged(25);
          }
        }
      }

      // Enemy homing missile launch (long range, needs a nose-on shot)
      enemy.missileCd = (enemy.missileCd ?? 6 + Math.random() * 8) - dt;
      if (distToPlayer > 700 && distToPlayer < 3500 && enemy.missileCd <= 0 && !this.playerSafe && this.missiles.length < 4) {
        const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.mesh.quaternion);
        if (fwd.dot(toPlayer.clone().normalize()) > 0.9) {
          enemy.missileCd = enemy.isBoss ? 7 : 12 + Math.random() * 6;
          this.launchMissile(enemy.mesh.position, fwd);
        }
      }

      // Move forward
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.mesh.quaternion);
      enemy.velocity.copy(forward.multiplyScalar(enemy.baseSpeed));
      enemy.mesh.position.addScaledVector(enemy.velocity, dt);
      if (enemy.mesh.position.y < 320) { enemy.mesh.position.y = 320; enemy.mesh.rotateX(-0.03); } // never hit the city
      AircraftModelGenerator.updateAfterburnerFX(enemy.mesh, 0.8, true);

      // Low health smoke
      if (enemy.hp < enemy.maxHp * 0.4 && Math.random() > 0.5) {
        this.particles.spawnMissileSmoke(enemy.mesh.position);
      }
    }
    this.updateMissiles(dt, playerPos, onPlayerDamaged);
  }

  launchMissile(pos, dir) {
    const mesh = createMissileModel(); mesh.scale.setScalar(2.2);
    mesh.position.copy(pos).addScaledVector(dir, 12);
    this.scene.add(mesh);
    this.missiles.push({ mesh, dir: dir.clone(), speed: 330, life: 11, decoy: null, rolled: false });
    this.audio.playWarningChime('missile');
  }

  updateMissiles(dt, playerPos, onPlayerDamaged) {
    let nearest = Infinity;
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt;
      if (this.playerSafe) m.life = Math.min(m.life, 0.5); // base AA shoots missiles down
      // Flares can seduce the seeker: 60% chance once a flare is within 350m
      if (!m.rolled) {
        const f = this.particles.flares.find(f => f.mesh.position.distanceTo(m.mesh.position) < 350);
        if (f) { m.rolled = true; if (Math.random() < 0.6) m.decoy = f; }
      }
      const tgt = m.decoy ? m.decoy.mesh.position : playerPos;
      const to = tgt.clone().sub(m.mesh.position);
      const d = to.length();
      if (!m.decoy || m.decoy.life > 0) m.dir.lerp(to.normalize(), Math.min(1, 1.5 * dt)).normalize();
      m.mesh.position.addScaledVector(m.dir, m.speed * dt);
      m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), m.dir);
      this.particles.spawnMissileSmoke(m.mesh.position);
      if (!m.decoy) nearest = Math.min(nearest, d);
      const hitPlayer = !m.decoy && d < 30;
      const hitFlare = m.decoy && d < 20;
      if (hitPlayer || hitFlare || m.life <= 0 || m.mesh.position.y < 20) {
        if (hitPlayer) onPlayerDamaged(180);
        if (hitPlayer || hitFlare) { this.particles.spawnExplosion(m.mesh.position, 1.2); this.audio.playExplosion(false); }
        this.scene.remove(m.mesh);
        this.missiles.splice(i, 1);
      }
    }
    this.threat = nearest; // metres to closest missile locked on the player
  }

  damageEnemy(enemy, damage) {
    if (enemy.isDead) return false;

    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      enemy.isDead = true;
      this.particles.spawnExplosion(enemy.mesh.position, enemy.isBoss ? 3.0 : 1.8);
      this.audio.playExplosion(enemy.isBoss);

      this.scene.remove(enemy.mesh);
      return true; // Enemy destroyed!
    }
    return false;
  }

  getAliveCount() {
    return this.enemies.filter(e => !e.isDead).length;
  }
}

