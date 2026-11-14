import * as THREE from 'three';
import { createMissileModel } from '../graphics/RealisticJet.js';
import { AircraftModelGenerator } from '../graphics/AircraftModelGenerator.js';

/**
 * Intelligent Enemy Fighter AI System
 * Features:
 * - 3-Wave Combat Deployment (Vanguard, Strike, Ace Boss)
 * - Tactical Wingman V-Formation & Target Engagement
 * - Dynamic Evasive Break Turns & High-G Jinking
 * - Terrain & Ocean Ground Collision Avoidance
 * - Enemy Defensive Flares against Player Missiles
 * - Difficulty scaling (Easy / Normal / Hard)
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

    // Difficulty Setting ('easy' | 'normal' | 'hard')
    this.difficulty = 'normal';
  }

  setDifficulty(diff) {
    this.difficulty = diff.toLowerCase();
  }

  spawnWave(waveConfig, origin = new THREE.Vector3(0, 450, 0)) {
    this.clear();

    const count = waveConfig.enemies || 4;
    const isBossWave = !!waveConfig.boss;

    let leaderMesh = null;

    for (let i = 0; i < count; i++) {
      const isBoss = (isBossWave && i === 0);
      const isWingman = (isBossWave && (i === 1 || i === 2));

      const mesh = AircraftModelGenerator.createAircraft({
        id: `enemy_w${waveConfig.wave}_${i}`,
        defaultColor: isBoss ? 0x240810 : (isWingman ? 0x1c1a24 : 0x141e28),
        accentColor: isBoss ? 0xff1744 : (isWingman ? 0xff8c00 : 0x00e5ff),
        wingspan: isBoss ? 18.0 : (isWingman ? 15.5 : 14.0),
        wingType: isBoss ? 'forward_swept' : (isWingman ? 'canard_swept' : 'diamond_delta')
      });

      mesh.scale.setScalar(isBoss ? 1.6 : 1.35);

      // Positioning: Tactical V-Formation if Boss wave, or dispersed arc
      if (isBoss) {
        mesh.position.set(origin.x, origin.y + 120, origin.z + 2400);
        leaderMesh = mesh;
      } else if (isWingman && leaderMesh) {
        const side = i === 1 ? -1 : 1;
        mesh.position.set(origin.x + side * 220, origin.y + 90, origin.z + 2250);
      } else {
        const angle = (i / count) * Math.PI * 1.6 - 0.8;
        const dist = 2200 + Math.random() * 800;
        mesh.position.set(origin.x + Math.sin(angle) * dist, origin.y + (Math.random() - 0.5) * 300, origin.z + Math.cos(angle) * dist);
      }

      mesh.lookAt(origin.x, origin.y, origin.z);
      this.scene.add(mesh);

      // Difficulty tuning
      const speedMult = this.difficulty === 'hard' ? 1.25 : (this.difficulty === 'easy' ? 0.85 : 1.0);
      const baseSpeed = (isBoss ? 230 : 185) * speedMult;

      this.enemies.push({
        id: i,
        name: isBoss ? 'APEX ACE COMMANDER [VEX-01]' : (isWingman ? `WINGMAN [ECHO-${i}]` : `BANDIT #${(i + 1).toString().padStart(2, '0')}`),
        mesh,
        hp: (isBoss ? 650 : (isWingman ? 320 : 220)),
        maxHp: (isBoss ? 650 : (isWingman ? 320 : 220)),
        baseSpeed,
        velocity: new THREE.Vector3(0, 0, baseSpeed),
        isDead: false,
        isBoss,
        isWingman,
        leader: isWingman ? leaderMesh : null,
        shootCooldown: 2.0 + Math.random() * 2.0,
        missileCd: (this.difficulty === 'hard' ? 6 : (this.difficulty === 'easy' ? 16 : 10)) + Math.random() * 6,
        flareCd: 4.0,
        evadeTimer: 0,
        isEvading: false,
        roll: 0
      });
    }

    if (this.audio) {
      const msg = isBossWave
        ? 'Warning! Hostile Ace Squadron detected in sector!'
        : `Hostile reinforcements inbound, wave ${waveConfig.wave}!`;
      this.audio.speakRadioChatter(msg, 'AWACS');
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

      // Wingman V-Formation follower logic when distant
      if (enemy.isWingman && enemy.leader && distToPlayer > 3000) {
        const offset = new THREE.Vector3(enemy.id === 1 ? -180 : 180, 0, -120).applyQuaternion(enemy.leader.quaternion);
        const targetPos = enemy.leader.position.clone().add(offset);
        enemy.mesh.position.lerp(targetPos, dt * 2.5);
        enemy.mesh.quaternion.slerp(enemy.leader.quaternion, dt * 3.0);
        continue;
      }

      // Evasive Jinking Maneuver check
      if (enemy.evadeTimer > 0) {
        enemy.evadeTimer -= dt;
        enemy.mesh.rotateZ(dt * 4.5); // barrel roll
        enemy.mesh.rotateX(-dt * 1.5); // pull high-G climb
      } else {
        // Intercept Steering toward player
        if (distToPlayer < 8000) {
          const targetDir = toPlayer.clone().normalize();
          const currentForward = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.mesh.quaternion);

          const turnSpeed = (enemy.isBoss ? 2.2 : 1.3) * (this.difficulty === 'hard' ? 1.3 : 1.0);
          currentForward.lerp(targetDir, turnSpeed * dt).normalize();
          enemy.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), currentForward);

          // Bank into turns
          enemy.roll = THREE.MathUtils.lerp(enemy.roll, Math.sin(Date.now() * 0.002 + enemy.id) * 0.8, dt * 2.2);
          enemy.mesh.rotateZ(enemy.roll * 0.08);

          // Cannon Firing against player
          enemy.shootCooldown -= dt;
          if (distToPlayer < 1400 && !this.playerSafe && enemy.shootCooldown <= 0) {
            const aimDot = currentForward.dot(targetDir);
            if (aimDot > 0.84) {
              enemy.shootCooldown = enemy.isBoss ? 0.8 : 2.0;
              this.particles.spawnBullet(enemy.mesh.position, currentForward, enemy.velocity);

              const hitChance = this.difficulty === 'hard' ? 0.5 : (this.difficulty === 'easy' ? 0.2 : 0.35);
              if (distToPlayer < 750 && Math.random() < hitChance) {
                onPlayerDamaged(20, enemy.mesh.position);
              }
            }
          }

          // Long-range Homing Missile Launch
          enemy.missileCd -= dt;
          if (distToPlayer > 800 && distToPlayer < 4200 && enemy.missileCd <= 0 && !this.playerSafe && this.missiles.length < 5) {
            const aimDot = currentForward.dot(targetDir);
            if (aimDot > 0.86) {
              const baseCd = this.difficulty === 'hard' ? 6 : (this.difficulty === 'easy' ? 16 : 10);
              enemy.missileCd = enemy.isBoss ? 6 : baseCd + Math.random() * 6;
              this.launchMissile(enemy.mesh.position, currentForward);
            }
          }
        }
      }

      // Move forward along nose (+Z)
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(enemy.mesh.quaternion);
      enemy.velocity.copy(forward).multiplyScalar(enemy.baseSpeed);
      enemy.mesh.position.addScaledVector(enemy.velocity, dt);

      // Sound Doppler Flyby for close pass
      if (distToPlayer < 120 && Math.random() < 0.25) {
        if (this.audio) this.audio.playDopplerFlyby(distToPlayer);
      }

      // Low altitude ground avoidance (keep enemy above terrain/water)
      if (enemy.mesh.position.y < 120) {
        enemy.mesh.position.y = 120;
        enemy.mesh.rotateX(-0.06);
      }

      AircraftModelGenerator.updateAfterburnerFX(enemy.mesh, 0.85, true);

      // Low health smoke trail
      if (enemy.hp < enemy.maxHp * 0.35 && Math.random() > 0.55) {
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
      speed: 350,
      life: 9.5,
      decoy: null
    });

    if (this.audio) {
      this.audio.playWarningChime('missile');
      this.audio.speakRadioChatter('Warning: Missile locked on you! Deploy flares!', 'AWACS');
    }
  }

  updateMissiles(dt, playerPos, onPlayerDamaged) {
    let nearest = Infinity;

    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt;

      if (this.playerSafe) m.life = Math.min(m.life, 0.35);

      // Flares decoy chance scales with difficulty
      const flareSuccessRate = this.difficulty === 'hard' ? 0.40 : (this.difficulty === 'easy' ? 0.90 : 0.65);

      if (!m.decoy && this.particles.flares) {
        const f = this.particles.flares.find(fl => fl.mesh.position.distanceTo(m.mesh.position) < 350);
        if (f && Math.random() < flareSuccessRate) {
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
        if (hitPlayer) onPlayerDamaged(150, m.mesh.position);
        this.particles.spawnExplosion(m.mesh.position, 1.5);
        if (this.audio) this.audio.playExplosion(false);

        this.scene.remove(m.mesh);
        this.missiles.splice(i, 1);
      }
    }

    this.threat = nearest;
  }

  triggerEnemyEvasion(targetEnemy) {
    if (!targetEnemy || targetEnemy.isDead) return;
    targetEnemy.evadeTimer = 1.6;

    // Hard difficulty: deploy defensive flares!
    if (this.difficulty === 'hard' && Math.random() < 0.6) {
      this.particles.spawnFlare(targetEnemy.mesh.position, targetEnemy.velocity);
    }
  }

  damageEnemy(enemy, damage) {
    if (enemy.isDead) return false;

    enemy.hp -= damage;
    this.triggerEnemyEvasion(enemy);

    if (enemy.hp <= 0) {
      enemy.isDead = true;
      this.particles.spawnExplosion(enemy.mesh.position, enemy.isBoss ? 3.5 : 1.9);
      if (this.audio) {
        this.audio.playExplosion(enemy.isBoss);
        const killCalls = ['Bandit splashed!', 'Target destroyed, excellent shot!', 'Direct hit! Scratch one hostile!'];
        const line = killCalls[Math.floor(Math.random() * killCalls.length)];
        this.audio.speakRadioChatter(line, 'WINGMAN');
      }

      this.scene.remove(enemy.mesh);
      return true;
    }
    return false;
  }

  getAliveCount() {
    return this.enemies.filter(e => !e.isDead).length;
  }
}
