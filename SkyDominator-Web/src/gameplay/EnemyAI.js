import * as THREE from 'three';
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
  }

  spawnMissionSquadron() {
    this.clear();

    const enemyTypes = [
      { name: 'DRONE-ALPHA', class: 'Scout Drone', hp: 200, speed: 180, color: 0x882222, wingspan: 11 },
      { name: 'SU-57 HOSTILE', class: 'Interceptor', hp: 450, speed: 210, color: 0x334455, wingspan: 15 },
      { name: 'MIG-35 BANDIT', class: 'Interceptor', hp: 450, speed: 200, color: 0x2e3b4e, wingspan: 14 },
      { name: 'BLACK WIDOW', class: 'Strike Fighter', hp: 600, speed: 190, color: 0x221111, wingspan: 16 },
      { name: 'VANGUARD ZERO', class: 'Ace Boss', hp: 1200, speed: 250, color: 0x990000, wingspan: 17 }
    ];

    const spawnPositions = [
      new THREE.Vector3(800, 1200, 1500),
      new THREE.Vector3(-1200, 1500, 1800),
      new THREE.Vector3(400, 900, 2400),
      new THREE.Vector3(-600, 1400, 2800),
      new THREE.Vector3(0, 1800, 3200) // Boss
    ];

    for (let i = 0; i < enemyTypes.length; i++) {
      const type = enemyTypes[i];
      const pos = spawnPositions[i];

      const mesh = AircraftModelGenerator.createAircraft({
        id: `enemy_${i}`,
        defaultColor: type.color,
        accentColor: 0xff1744,
        wingspan: type.wingspan,
        wingType: (i === 4) ? 'forward_swept' : 'diamond_delta'
      });

      mesh.position.copy(pos);
      // Face toward player's starting area
      mesh.lookAt(0, 800, -2000);

      this.scene.add(mesh);

      this.enemies.push({
        id: i,
        name: type.name,
        class: type.class,
        mesh: mesh,
        hp: type.hp,
        maxHp: type.hp,
        baseSpeed: type.speed,
        velocity: new THREE.Vector3(0, 0, type.speed),
        isDead: false,
        shootCooldown: 1.0 + Math.random() * 2.0,
        maneuverTimer: Math.random() * 3.0,
        isBoss: (i === 4)
      });
    }
  }

  clear() {
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
        enemy.mesh.rotation.z = Math.sin(Date.now() * 0.002 + enemy.id) * 0.6;

        // Firing logic against player
        enemy.shootCooldown -= dt;
        if (distToPlayer < 1200 && enemy.shootCooldown <= 0) {
          const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.mesh.quaternion);
          const aimDot = forward.dot(targetDir);

          if (aimDot > 0.88) { // Aimed at player
            enemy.shootCooldown = enemy.isBoss ? 0.8 : 2.0;
            this.particles.spawnBullet(enemy.mesh.position, forward, enemy.velocity);
            // Check hit against player
            if (distToPlayer < 800) {
              onPlayerDamaged(25); // 25 damage to player
            }
          }
        }
      }

      // Move forward
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.mesh.quaternion);
      enemy.velocity.copy(forward.multiplyScalar(enemy.baseSpeed));
      enemy.mesh.position.addScaledVector(enemy.velocity, dt);

      // Low health smoke
      if (enemy.hp < enemy.maxHp * 0.4 && Math.random() > 0.5) {
        this.particles.spawnMissileSmoke(enemy.mesh.position);
      }
    }
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

