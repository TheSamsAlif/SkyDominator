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
  }

  spawnBullet(origin, direction, shooterVelocity) {
    const geom = new THREE.CylinderGeometry(0.08, 0.08, 3.5, 4);
    geom.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geom, this.bulletMat);

    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);

    const speed = 1200; // cm/s * 10
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

  spawnExplosion(position, scale = 1.0) {
    const count = 18;
    const pieces = [];

    for (let i = 0; i < count; i++) {
      const geom = new THREE.DodecahedronGeometry((1.5 + Math.random() * 2) * scale, 0);
      const mesh = new THREE.Mesh(geom, (Math.random() > 0.3) ? this.fireMat.clone() : this.smokeMat.clone());
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
  }

  spawnFlare(position, aircraftVelocity) {
    const geom = new THREE.SphereGeometry(0.6, 6, 6);
    const mesh = new THREE.Mesh(geom, this.flareMat);
    mesh.position.copy(position);

    // Eject backwards and downward
    const vel = aircraftVelocity.clone().multiplyScalar(0.6).add(new THREE.Vector3(
      (Math.random() - 0.5) * 40,
      -30 - Math.random() * 20,
      (Math.random() - 0.5) * 40
    ));

    this.scene.add(mesh);
    this.flares.push({ mesh, vel, life: 4.0 });
  }

  update(dt, enemySquadron, onHitEnemy) {
    // 1. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.age += dt;
      b.mesh.position.addScaledVector(b.velocity, dt);

      // Hit detection against enemies
      if (enemySquadron) {
        for (let enemy of enemySquadron) {
          if (!enemy.isDead && enemy.mesh) {
            const dist = b.mesh.position.distanceTo(enemy.mesh.position);
            if (dist < 12.0) { // Hitbox radius
              this.spawnExplosion(b.mesh.position, 0.4);
              onHitEnemy(enemy, 35); // 35 damage per bullet
              b.age = b.life; // Destroy bullet
              break;
            }
          }
        }
      }

      if (b.age >= b.life) {
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

    // 4. Update Flares
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i];
      f.life -= dt;
      f.mesh.position.addScaledVector(f.vel, dt);
      f.vel.y -= 9.8 * 4 * dt; // Gravity

      // Smoke puff behind flare
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

