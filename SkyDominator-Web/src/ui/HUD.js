import * as THREE from 'three';

/**
 * Military Aerial Combat Heads-Up Display (HUD) System
 */
export class HUD {
  constructor(camera) {
    this.camera = camera;

    // Flight Telemetry DOM elements
    this.speedVal = document.getElementById('hud-speed-val');
    this.machVal = document.getElementById('hud-mach-val');
    this.altVal = document.getElementById('hud-alt-val');
    this.gforceVal = document.getElementById('hud-gforce-val');
    this.throttleVal = document.getElementById('hud-throttle-val');

    // Pitch ladder & compass
    this.pitchLadder = document.getElementById('hud-pitch-ladder');
    this.compassTape = document.getElementById('hud-compass-tape');

    // Health, Shield & Boost Gauges
    this.healthBar = document.getElementById('hud-health-bar');
    this.healthVal = document.getElementById('hud-health-val');
    this.shieldBar = document.getElementById('hud-shield-bar');
    this.shieldVal = document.getElementById('hud-shield-val');
    this.boostBar = document.getElementById('hud-boost-bar');
    this.boostVal = document.getElementById('hud-boost-val');

    // Weapon Payload Counters
    this.missileCount = document.getElementById('hud-missile-count');
    this.bombCount = document.getElementById('hud-bomb-count');
    this.flareCount = document.getElementById('hud-flare-count');
    this.cameraName = document.getElementById('hud-camera-name');

    // Air Target Reticle
    this.targetBox = document.getElementById('hud-target-reticle');
    this.targetDist = document.getElementById('hud-target-dist');
    this.targetLockTag = document.getElementById('hud-target-lock-tag');

    // Ground Target Diamonds Container
    this.groundContainer = document.getElementById('hud-ground-markers');
    this.groundMarkerPool = new Map();

    // Radar Minimap
    this.radarBlipsContainer = document.getElementById('radar-blips-container');

    // G-Force Overlays
    this.fxBlackout = document.getElementById('fx-blackout');
    this.fxRedout = document.getElementById('fx-redout');

    // Objectives Text
    this.objectiveText = document.getElementById('hud-objective-text');
  }

  update(physics, combatSystem, missionManager, enemySquadron, groundTargetsGroup) {
    if (!physics) return;

    // 1. Telemetry Displays
    const speedKmh = Math.round(physics.speed * 3.6);
    if (this.speedVal) this.speedVal.textContent = speedKmh;
    if (this.machVal) this.machVal.textContent = `MACH ${physics.mach}`;
    if (this.altVal) this.altVal.textContent = physics.altitudeMeters;
    if (this.gforceVal) this.gforceVal.textContent = `${physics.gForce.toFixed(1)}G`;
    if (this.throttleVal) {
      const thrPct = Math.round(physics.throttle * 100);
      this.throttleVal.textContent = physics.isAfterburner ? 'BOOST' : `${thrPct}%`;
      this.throttleVal.classList.toggle('highlight', physics.isAfterburner);
    }

    // 2. Pitch Ladder and Compass Heading
    if (this.pitchLadder) {
      const pitchDeg = (physics.pitch * 180 / Math.PI);
      const rollDeg = (physics.roll * 180 / Math.PI);
      this.pitchLadder.style.transform = `translate(-50%, -50%) rotate(${rollDeg}deg) translateY(${pitchDeg * 4}px)`;
    }

    if (this.compassTape) {
      const headingDeg = Math.round(((physics.yaw * 180 / Math.PI) % 360 + 360) % 360);
      this.compassTape.textContent = `HDG ${headingDeg.toString().padStart(3, '0')}°`;
    }

    // 3. Status Gauges
    const health = combatSystem.playerHealth ?? 100;
    const shield = combatSystem.playerShield ?? 100;
    const boost = Math.round(physics.boostEnergy);

    if (this.healthBar) this.healthBar.style.width = `${Math.max(0, health)}%`;
    if (this.healthVal) this.healthVal.textContent = `${Math.max(0, Math.round(health))}%`;
    if (this.shieldBar) this.shieldBar.style.width = `${Math.max(0, shield)}%`;
    if (this.shieldVal) this.shieldVal.textContent = `${Math.max(0, Math.round(shield))}`;
    if (this.boostBar) this.boostBar.style.width = `${boost}%`;
    if (this.boostVal) this.boostVal.textContent = `${boost}%`;

    // 4. Weapon Counts
    if (this.missileCount) this.missileCount.textContent = `${combatSystem.missileAmmo} / ${combatSystem.maxMissiles}`;
    if (this.bombCount) this.bombCount.textContent = `${combatSystem.bombAmmo} / ${combatSystem.maxBombs}`;
    if (this.flareCount) this.flareCount.textContent = `${combatSystem.flareAmmo} / ${combatSystem.maxFlares}`;
    if (this.cameraName) this.cameraName.textContent = physics.cameraViewMode === 0 ? 'CHASE (3RD)' : 'COCKPIT (1ST)';

    // 5. Objective Progress
    if (this.objectiveText && missionManager) {
      this.objectiveText.textContent = missionManager.getObjectiveText();
    }

    // 6. G-Force Screen FX
    this.updateGForceEffects(physics.gForce);

    // 7. Air Target Lock Reticle
    this.updateTargetReticle(physics.position, combatSystem.currentTarget, combatSystem.isLocked, combatSystem.lockProgress);

    // 8. Ground Attack Markers
    this.updateGroundMarkers(groundTargetsGroup);

    // 9. Radar Minimap Blips
    this.updateRadar(physics, enemySquadron, groundTargetsGroup);
  }

  updateGForceEffects(gForce) {
    if (!this.fxBlackout || !this.fxRedout) return;

    if (gForce > 5.5) {
      const blackoutIntensity = Math.min(0.9, (gForce - 5.5) / 4.0);
      this.fxBlackout.style.opacity = blackoutIntensity.toString();
      this.fxRedout.style.opacity = '0';
    } else if (gForce < -1.5) {
      const redoutIntensity = Math.min(0.8, Math.abs(gForce + 1.5) / 2.5);
      this.fxRedout.style.opacity = redoutIntensity.toString();
      this.fxBlackout.style.opacity = '0';
    } else {
      this.fxBlackout.style.opacity = '0';
      this.fxRedout.style.opacity = '0';
    }
  }

  updateTargetReticle(playerPos, currentTarget, isLocked, lockProgress) {
    if (!this.targetBox || !currentTarget || !currentTarget.mesh || currentTarget.isDead) {
      if (this.targetBox) this.targetBox.style.display = 'none';
      return;
    }

    const screenPos = this.projectToScreen(currentTarget.mesh.position);
    if (screenPos && screenPos.z > 0 && screenPos.z < 1) {
      this.targetBox.style.display = 'block';
      this.targetBox.style.left = `${screenPos.x}px`;
      this.targetBox.style.top = `${screenPos.y}px`;

      const distKm = (playerPos.distanceTo(currentTarget.mesh.position) / 1000).toFixed(1);
      if (this.targetDist) this.targetDist.textContent = `${distKm} KM`;

      if (this.targetLockTag) {
        if (isLocked) {
          this.targetLockTag.textContent = 'LOCK';
          this.targetLockTag.className = 'lock-status locked';
        } else {
          const pct = Math.round(lockProgress * 100);
          this.targetLockTag.textContent = `TRACK ${pct}%`;
          this.targetLockTag.className = 'lock-status acquiring';
        }
      }
    } else {
      this.targetBox.style.display = 'none';
    }
  }

  updateGroundMarkers(groundTargetsGroup) {
    if (!this.groundContainer || !groundTargetsGroup) return;

    groundTargetsGroup.children.forEach((gt) => {
      if (!gt.userData || !gt.userData.isAlive) {
        if (this.groundMarkerPool.has(gt.name)) {
          const el = this.groundMarkerPool.get(gt.name);
          el.remove();
          this.groundMarkerPool.delete(gt.name);
        }
        return;
      }

      let marker = this.groundMarkerPool.get(gt.name);
      if (!marker) {
        marker = document.createElement('div');
        marker.className = 'ground-marker-diamond';
        marker.innerHTML = `<span class="diamond-sym">◆</span><span class="diamond-txt">${gt.userData.type.toUpperCase()}</span>`;
        this.groundContainer.appendChild(marker);
        this.groundMarkerPool.set(gt.name, marker);
      }

      const screenPos = this.projectToScreen(gt.position);
      if (screenPos && screenPos.z > 0 && screenPos.z < 1) {
        marker.style.display = 'block';
        marker.style.left = `${screenPos.x}px`;
        marker.style.top = `${screenPos.y}px`;
      } else {
        marker.style.display = 'none';
      }
    });
  }

  updateRadar(physics, enemySquadron, groundTargetsGroup) {
    if (!this.radarBlipsContainer) return;
    this.radarBlipsContainer.innerHTML = '';

    const radarRange = 6000; // 6km radius
    const radarRadiusPx = 65; // Radius of 130px radar display
    const playerPos = physics.position;
    const playerHeading = physics.yaw;

    // Helper to project world coords to circular radar
    const addBlip = (worldPos, className) => {
      const dx = worldPos.x - playerPos.x;
      const dz = worldPos.z - playerPos.z;

      // Rotate coordinates relative to player compass heading
      const cosH = Math.cos(-playerHeading);
      const sinH = Math.sin(-playerHeading);
      const rx = dx * cosH - dz * sinH;
      const rz = dx * sinH + dz * cosH;

      const dist = Math.sqrt(rx * rx + rz * rz);
      if (dist < radarRange) {
        const factor = dist / radarRange;
        const px = (rx / dist) * factor * radarRadiusPx;
        const py = -(rz / dist) * factor * radarRadiusPx; // radar Y is negative Z (ahead)

        const blip = document.createElement('div');
        blip.className = className;
        blip.style.left = `${radarRadiusPx + px}px`;
        blip.style.top = `${radarRadiusPx + py}px`;
        this.radarBlipsContainer.appendChild(blip);
      }
    };

    // Enemy fighters (Red)
    if (enemySquadron && enemySquadron.enemies) {
      enemySquadron.enemies.forEach((enemy) => {
        if (!enemy.isDead && enemy.mesh) {
          addBlip(enemy.mesh.position, 'radar-blip-enemy');
        }
      });
    }

    // Ground targets (Orange)
    if (groundTargetsGroup) {
      groundTargetsGroup.children.forEach((gt) => {
        if (gt.userData && gt.userData.isAlive) {
          addBlip(gt.position, 'radar-blip-ground');
        }
      });
    }

    // Airbase / Safe zone at origin (Cyan)
    addBlip(new THREE.Vector3(0, 0, 0), 'radar-blip-base');
  }

  projectToScreen(worldPos) {
    const p = worldPos.clone().project(this.camera);
    return {
      x: (p.x * 0.5 + 0.5) * window.innerWidth,
      y: (-(p.y * 0.5) + 0.5) * window.innerHeight,
      z: p.z
    };
  }
}
