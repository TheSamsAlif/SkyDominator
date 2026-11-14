import * as THREE from 'three';

/**
 * High-Performance Particle Engine for Aerial Combat VFX
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.bullets = [];
    this.smokeParticles = [];
    this.explosions = [];
    this.flares = [];
    this.shockwaves = [];

    // Reusable Materials
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

  spawnBullet(origin, direction, shooterVelocity) {
    const geom = new THREE.CylinderGeometry(0.1, 0.1, 3.8, 4);
    geom.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geom, this.bulletMat);

    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

    const speed = 1400;
    const velocity = direction.clone().multiplyScalar(speed).add(shooterVelocity ? shooterVelocity.clone().multiplyScalar(0.4) : new THREE.Vector3());

    this.scene.add(mesh);
    this.bullets.push({
      mesh,
      velocity,
      life: 2.0,
      age: 0
    });
  }

  spawnMissileSmoke(position) {
    const geom = new THREE.SphereGeometry(0.9 + Math.random() * 0.4, 6, 6);
    const mesh = new THREE.Mesh(geom, this.smokeMat.clone());
    mesh.position.copy(position);
    this.scene.add(mesh);

    this.smokeParticles.push({
      mesh,
      life: 1.1,
      maxLife: 1.1,
      growth: 3.2
    });
  }

  spawnExplosion(position, scale = 1.0) {
    const count = Math.floor(18 * scale);
    const pieces = [];

    for (let i = 0; i < count; i++) {
      const geom = new THREE.DodecahedronGeometry((1.2 + Math.random() * 1.5) * scale, 0);
      const mesh = new THREE.Mesh(geom, (Math.random() > 0.35) ? this.fireMat.clone() : this.smokeMat.clone());
      mesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 80 * scale,
        (Math.random() - 0.5) * 80 * scale,
        (Math.random() - 0.5) * 80 * scale
      );

      this.scene.add(mesh);
      pieces.push({ mesh, vel, life: 1.0, maxLife: 1.0 });
    }

    this.explosions.push(pieces);
    this.spawnShockwave(position, 40 * scale);
  }

  spawnShockwave(position, maxRadius = 40) {
    const ringGeo = new THREE.RingGeometry(1, 3, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(ringGeo, this.shockwaveMat.clone());
    mesh.position.copy(position);
    this.scene.add(mesh);

    this.shockwaves.push({
      mesh,
      life: 0.7,
      maxLife: 0.7,
      maxRadius
    });
  }

  spawnFlare(position, aircraftVelocity) {
    const geom = new THREE.SphereGeometry(0.8, 6, 6);
    const mesh = new THREE.Mesh(geom, this.flareMat);
    mesh.position.copy(position);

    const vel = (aircraftVelocity ? aircraftVelocity.clone().multiplyScalar(0.4) : new THREE.Vector3()).add(new THREE.Vector3(
      (Math.random() - 0.5) * 45,
      -35 - Math.random() * 20,
      (Math.random() - 0.5) * 45
    ));

    this.scene.add(mesh);
    this.flares.push({ mesh, vel, life: 3.8 });
  }

  update(dt, enemySquadron, onHitEnemy) {
    // 1. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.age += dt;
      b.mesh.position.addScaledVector(b.velocity, dt);

      // Hit detection against enemies
      if (enemySquadron) {
        const enemies = enemySquadron.enemies || enemySquadron;
        if (Array.isArray(enemies)) {
          for (const enemy of enemies) {
            if (!enemy.isDead && enemy.mesh) {
              const dist = b.mesh.position.distanceTo(enemy.mesh.position);
              if (dist < 14.0) {
                this.spawnExplosion(b.mesh.position, 0.5);
                if (onHitEnemy) onHitEnemy(enemy, 35);
                b.age = b.life;
                break;
              }
            }
          }
        }
      }

      if (b.age >= b.life || b.mesh.position.y <= 0) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
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
      s.mesh.material.opacity = Math.max(0, (s.life / s.maxLife) * 0.55);

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
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.multiplyScalar(1.0 + dt * 1.4);
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
      const rad = progress * sw.maxRadius;
      sw.mesh.scale.set(rad, rad, 1);
      sw.mesh.material.opacity = Math.max(0, (1.0 - progress) * 0.8);

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
      f.vel.y -= 9.8 * 3.5 * dt;

      if (Math.random() > 0.6) {
        this.spawnMissileSmoke(f.mesh.position);
      }

      if (f.life <= 0 || f.mesh.position.y <= 0) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        this.flares.splice(i, 1);
      }
    }
  }
}
