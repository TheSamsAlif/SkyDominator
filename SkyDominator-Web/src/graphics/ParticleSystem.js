import * as THREE from 'three';

/**
 * Enhanced Particle & Combat VFX Engine (Tracers, Smoke, Fiery Debris & Shockwaves)
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.bullets = [];
    this.smokeParticles = [];
    this.explosions = [];
    this.shockwaves = [];
    this.flares = [];

    // Reusable Materials
    this.bulletMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      blending: THREE.AdditiveBlending
    });

    this.smokeMat = new THREE.MeshBasicMaterial({
      color: 0xdde5ed,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });

    this.fireMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.flareMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      blending: THREE.AdditiveBlending
    });

    this.shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  spawnBullet(origin, direction, shooterVelocity) {
    const geom = new THREE.CylinderGeometry(0.08, 0.08, 4.0, 4);
    geom.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geom, this.bulletMat);

    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

    // Muzzle flash puff
    const flashGeom = new THREE.SphereGeometry(0.4, 6, 6);
    const flashMesh = new THREE.Mesh(flashGeom, this.fireMat.clone());
    flashMesh.position.copy(origin);
    this.scene.add(flashMesh);
    this.smokeParticles.push({
      mesh: flashMesh,
      life: 0.08,
      maxLife: 0.08,
      growth: 2.0
    });

    const speed = 1350;
    const velocity = direction.clone().multiplyScalar(speed).add(shooterVelocity.clone().multiplyScalar(0.4));

    this.scene.add(mesh);
    this.bullets.push({
      mesh,
      velocity,
      life: 1.8,
      age: 0
    });
  }

  spawnMissileSmoke(position) {
    const geom = new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.4, 0);
    const mesh = new THREE.Mesh(geom, this.smokeMat.clone());
    mesh.position.copy(position);
    this.scene.add(mesh);

    this.smokeParticles.push({
      mesh,
      life: 1.2,
      maxLife: 1.2,
      growth: 3.5
    });
  }

  spawnExplosion(position, scale = 1.0, isGroundBlast = false) {
    const count = Math.floor(18 * Math.min(2.5, scale));
    const pieces = [];

    // 1. Fiery debris chunks with gravity
    for (let i = 0; i < count; i++) {
      const geom = new THREE.DodecahedronGeometry((1.4 + Math.random() * 1.8) * scale, 0);
      const isFire = Math.random() > 0.35;
      const mesh = new THREE.Mesh(geom, isFire ? this.fireMat.clone() : this.smokeMat.clone());
      mesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 90 * scale,
        (Math.random() * 80 + 10) * scale,
        (Math.random() - 0.5) * 90 * scale
      );

      this.scene.add(mesh);
      pieces.push({ mesh, vel, life: 1.1 * scale, maxLife: 1.1 * scale });
    }
    this.explosions.push(pieces);

    // 2. Expanding blast shockwave ring
    const ringGeom = new THREE.RingGeometry(1.5, 4.0, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const shockMesh = new THREE.Mesh(ringGeom, this.shockwaveMat.clone());
    shockMesh.position.copy(position);
    if (isGroundBlast) {
      shockMesh.position.y = 15;
    }

    this.scene.add(shockMesh);
    this.shockwaves.push({
      mesh: shockMesh,
      maxScale: 35.0 * scale,
      currentScale: 1.0,
      life: 0.6,
      maxLife: 0.6
    });
  }

  spawnFlare(position, aircraftVelocity) {
    const geom = new THREE.SphereGeometry(0.6, 6, 6);
    const mesh = new THREE.Mesh(geom, this.flareMat);
    mesh.position.copy(position);

    const vel = aircraftVelocity.clone().multiplyScalar(0.6).add(new THREE.Vector3(
      (Math.random() - 0.5) * 40,
      -30 - Math.random() * 20,
      (Math.random() - 0.5) * 40
    ));

    this.scene.add(mesh);
    this.flares.push({ mesh, vel, life: 4.0 });
  }

  update(dt, enemySquadron, onHitEnemy, groundTargets = [], onHitGround = null) {
    // 1. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.age += dt;
      b.mesh.position.addScaledVector(b.velocity, dt);

      // Hit detection vs Air Hostiles
      let hit = false;
      if (enemySquadron) {
        for (let enemy of enemySquadron) {
          if (!enemy.isDead && enemy.mesh) {
            const dist = b.mesh.position.distanceTo(enemy.mesh.position);
            if (dist < 14.0) {
              this.spawnExplosion(b.mesh.position, 0.4);
              onHitEnemy(enemy, 35);
              hit = true;
              break;
            }
          }
        }
      }

      // Hit detection vs Ground Targets
      if (!hit && groundTargets && onHitGround) {
        for (let gt of groundTargets) {
          if (!gt.isDead && gt.position) {
            const dist = b.mesh.position.distanceTo(gt.position);
            if (dist < 26.0) {
              this.spawnExplosion(b.mesh.position, 0.5, true);
              onHitGround(gt, 40);
              hit = true;
              break;
            }
          }
        }
      }

      if (hit || b.age >= b.life) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        this.bullets.splice(i, 1);
      }
    }

    // 2. Update Smoke Particles
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const s = this.smokeParticles[i];
      s.life -= dt;
      const progress = 1.0 - (s.life / s.maxLife);
      const scale = 1.0 + progress * s.growth;
      s.mesh.scale.set(scale, scale, scale);
      s.mesh.material.opacity = Math.max(0, s.life / s.maxLife * 0.5);

      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
        this.smokeParticles.splice(i, 1);
      }
    }

    // 3. Update Explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const pieces = this.explosions[i];
      let allDead = true;

      for (let p of pieces) {
        p.life -= dt;
        p.vel.y -= 9.8 * 8 * dt; // Gravity on debris
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.multiplyScalar(1.0 + dt * 1.5);
        p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);

        if (p.life > 0) allDead = false;
        else this.scene.remove(p.mesh);
      }

      if (allDead) {
        this.explosions.splice(i, 1);
      }
    }

    // 4. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      const progress = 1.0 - (sw.life / sw.maxLife);
      const s = 1.0 + progress * sw.maxScale;
      sw.mesh.scale.set(s, s, s);
      sw.mesh.material.opacity = Math.max(0, (sw.life / sw.maxLife) * 0.75);

      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
      }
    }

    // 5. Update Flares
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i];
      f.life -= dt;
      f.mesh.position.addScaledVector(f.vel, dt);
      f.vel.y -= 9.8 * 4 * dt;

      if (Math.random() > 0.6) {
        this.spawnMissileSmoke(f.mesh.position);
      }

      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        this.flares.splice(i, 1);
      }
    }
  }
}
