import * as THREE from 'three';

/**
 * High-Performance Object-Pooled Particle Engine for Aerial Combat VFX
 * Prevents garbage collection stutter during intense dogfights
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;

    // Active particle arrays
    this.bullets = [];
    this.smokeParticles = [];
    this.explosions = [];
    this.flares = [];
    this.shockwaves = [];

    // Object Pools
    this.bulletPool = [];
    this.smokePool = [];
    this.debrisPool = [];
    this.shockwavePool = [];
    this.flarePool = [];

    // Shared Geometries (Created once)
    this.bulletGeom = new THREE.CylinderGeometry(0.12, 0.12, 4.0, 4);
    this.bulletGeom.rotateX(Math.PI / 2);

    this.smokeGeom = new THREE.SphereGeometry(1.0, 6, 6);
    this.debrisGeom = new THREE.DodecahedronGeometry(1.4, 0);
    this.shockwaveGeom = new THREE.RingGeometry(1, 3, 32);
    this.shockwaveGeom.rotateX(-Math.PI / 2);
    this.flareGeom = new THREE.SphereGeometry(0.8, 6, 6);

    // Shared Materials
    this.bulletMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      blending: THREE.AdditiveBlending
    });

    this.smokeMat = new THREE.MeshBasicMaterial({
      color: 0xb4c2ce,
      transparent: true,
      opacity: 0.55,
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
      color: 0xffaa00,
      blending: THREE.AdditiveBlending
    });

    this.shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
  }

  // 1. Bullets (20mm Cannon)
  spawnBullet(origin, direction, shooterVelocity) {
    let mesh;
    if (this.bulletPool.length > 0) {
      mesh = this.bulletPool.pop();
      mesh.visible = true;
    } else {
      mesh = new THREE.Mesh(this.bulletGeom, this.bulletMat);
      this.scene.add(mesh);
    }

    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

    const speed = 1450;
    const velocity = direction.clone().multiplyScalar(speed).add(
      shooterVelocity ? shooterVelocity.clone().multiplyScalar(0.4) : new THREE.Vector3()
    );

    this.bullets.push({
      mesh,
      velocity,
      life: 2.0,
      age: 0
    });
  }

  // 2. Missile Smoke Trails
  spawnMissileSmoke(position) {
    let item;
    if (this.smokePool.length > 0) {
      item = this.smokePool.pop();
      item.mesh.visible = true;
      item.mat.opacity = 0.55;
    } else {
      const mat = this.smokeMat.clone();
      const mesh = new THREE.Mesh(this.smokeGeom, mat);
      this.scene.add(mesh);
      item = { mesh, mat };
    }

    item.mesh.position.copy(position);
    item.mesh.scale.setScalar(0.9 + Math.random() * 0.4);

    this.smokeParticles.push({
      mesh: item.mesh,
      mat: item.mat,
      life: 1.1,
      maxLife: 1.1,
      growth: 3.2
    });
  }

  // 3. Explosions & Shrapnel Debris
  spawnExplosion(position, scale = 1.0) {
    const count = Math.min(24, Math.floor(16 * scale));
    const pieces = [];

    for (let i = 0; i < count; i++) {
      let item;
      const isFire = Math.random() > 0.35;

      if (this.debrisPool.length > 0) {
        item = this.debrisPool.pop();
        item.mesh.visible = true;
        item.mat.color.setHex(isFire ? 0xff5500 : 0xb4c2ce);
        item.mat.opacity = isFire ? 0.9 : 0.6;
      } else {
        const mat = (isFire ? this.fireMat : this.smokeMat).clone();
        const mesh = new THREE.Mesh(this.debrisGeom, mat);
        this.scene.add(mesh);
        item = { mesh, mat };
      }

      item.mesh.position.copy(position);
      const pieceScale = (0.8 + Math.random() * 1.2) * scale;
      item.mesh.scale.setScalar(pieceScale);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 85 * scale,
        (Math.random() - 0.5) * 85 * scale,
        (Math.random() - 0.5) * 85 * scale
      );

      pieces.push({
        mesh: item.mesh,
        mat: item.mat,
        vel,
        life: 1.0,
        maxLife: 1.0
      });
    }

    this.explosions.push(pieces);
    this.spawnShockwave(position, 40 * scale);
  }

  // 4. Supersonic Shockwaves
  spawnShockwave(position, maxRadius = 40) {
    let item;
    if (this.shockwavePool.length > 0) {
      item = this.shockwavePool.pop();
      item.mesh.visible = true;
      item.mat.opacity = 0.8;
    } else {
      const mat = this.shockwaveMat.clone();
      const mesh = new THREE.Mesh(this.shockwaveGeom, mat);
      this.scene.add(mesh);
      item = { mesh, mat };
    }

    item.mesh.position.copy(position);
    item.mesh.scale.set(1, 1, 1);

    this.shockwaves.push({
      mesh: item.mesh,
      mat: item.mat,
      life: 0.7,
      maxLife: 0.7,
      maxRadius
    });
  }

  // 5. Thermal Countermeasure Flares
  spawnFlare(position, aircraftVelocity) {
    let mesh;
    if (this.flarePool.length > 0) {
      mesh = this.flarePool.pop();
      mesh.visible = true;
    } else {
      mesh = new THREE.Mesh(this.flareGeom, this.flareMat);
      this.scene.add(mesh);
    }

    mesh.position.copy(position);

    const vel = (aircraftVelocity ? aircraftVelocity.clone().multiplyScalar(0.4) : new THREE.Vector3()).add(new THREE.Vector3(
      (Math.random() - 0.5) * 45,
      -35 - Math.random() * 20,
      (Math.random() - 0.5) * 45
    ));

    this.flares.push({ mesh, vel, life: 3.8 });
  }

  // Frame Update Loop
  update(dt, enemySquadron, onHitEnemy) {
    // 1. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.age += dt;
      b.mesh.position.addScaledVector(b.velocity, dt);

      // Hit detection against enemies with bullet magnetism
      if (enemySquadron) {
        const enemies = enemySquadron.enemies || enemySquadron;
        if (Array.isArray(enemies)) {
          for (const enemy of enemies) {
            if (!enemy.isDead && enemy.mesh) {
              const toEnemy = enemy.mesh.position.clone().sub(b.mesh.position);
              const dist = toEnemy.length();

              // Magnetized bullet pull when close to enemy
              if (dist < 65.0) {
                b.velocity.lerp(toEnemy.normalize().multiplyScalar(1450), dt * 6.5);
              }

              // Generous 36m hit radius for satisfying dogfight gun kills
              if (dist < 36.0) {
                this.spawnExplosion(b.mesh.position, 0.6);
                if (onHitEnemy) onHitEnemy(enemy, 45);
                b.age = b.life;
                break;
              }
            }
          }
        }
      }

      if (b.age >= b.life || b.mesh.position.y <= 0) {
        b.mesh.visible = false;
        this.bulletPool.push(b.mesh);
        this.bullets.splice(i, 1);
      }
    }

    // 2. Update Smoke Trails
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const s = this.smokeParticles[i];
      s.life -= dt;
      const progress = 1.0 - (s.life / s.maxLife);
      const scale = 1.0 + progress * s.growth;
      s.mesh.scale.set(scale, scale, scale);
      s.mat.opacity = Math.max(0, (s.life / s.maxLife) * 0.55);

      if (s.life <= 0) {
        s.mesh.visible = false;
        this.smokePool.push({ mesh: s.mesh, mat: s.mat });
        this.smokeParticles.splice(i, 1);
      }
    }

    // 3. Update Explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const pieces = this.explosions[i];
      let allDead = true;

      for (let p of pieces) {
        p.life -= dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.multiplyScalar(1.0 + dt * 1.4);
        p.mat.opacity = Math.max(0, p.life / p.maxLife);

        if (p.life > 0) {
          allDead = false;
        } else if (p.mesh.visible) {
          p.mesh.visible = false;
          this.debrisPool.push({ mesh: p.mesh, mat: p.mat });
        }
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
      const rad = progress * sw.maxRadius;
      sw.mesh.scale.set(rad, rad, 1);
      sw.mat.opacity = Math.max(0, (1.0 - progress) * 0.8);

      if (sw.life <= 0) {
        sw.mesh.visible = false;
        this.shockwavePool.push({ mesh: sw.mesh, mat: sw.mat });
        this.shockwaves.splice(i, 1);
      }
    }

    // 5. Update Flares
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i];
      f.life -= dt;
      f.mesh.position.addScaledVector(f.vel, dt);
      f.vel.y -= 9.8 * 3.5 * dt;

      if (Math.random() > 0.6) {
        this.spawnMissileSmoke(f.mesh.position);
      }

      if (f.life <= 0 || f.mesh.position.y <= 0) {
        f.mesh.visible = false;
        this.flarePool.push(f.mesh);
        this.flares.splice(i, 1);
      }
    }
  }

  // Clear all active particles without memory leaks
  clear() {
    for (const b of this.bullets) {
      b.mesh.visible = false;
      this.bulletPool.push(b.mesh);
    }
    this.bullets = [];

    for (const s of this.smokeParticles) {
      s.mesh.visible = false;
      this.smokePool.push({ mesh: s.mesh, mat: s.mat });
    }
    this.smokeParticles = [];

    for (const exp of this.explosions) {
      for (const p of exp) {
        p.mesh.visible = false;
        this.debrisPool.push({ mesh: p.mesh, mat: p.mat });
      }
    }
    this.explosions = [];

    for (const sw of this.shockwaves) {
      sw.mesh.visible = false;
      this.shockwavePool.push({ mesh: sw.mesh, mat: sw.mat });
    }
    this.shockwaves = [];

    for (const f of this.flares) {
      f.mesh.visible = false;
      this.flarePool.push(f.mesh);
    }
    this.flares = [];
  }
}
