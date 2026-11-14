import * as THREE from 'three';

/**
 * Combat Flight HUD, Ground Target Indicators & Radar Minimap Manager
 */
export class HUD {
  constructor(camera) {
    this.camera = camera;

    // DOM Elements
    this.speedVal = document.getElementById('hud-speed-val');
    this.machVal = document.getElementById('hud-mach-val');
    this.altVal = document.getElementById('hud-alt-val');
    this.radAltVal = document.getElementById('hud-radalt-val');
    this.throttleBar = document.getElementById('hud-throttle-bar');
    this.throttleVal = document.getElementById('hud-throttle-val');
    this.abTag = document.getElementById('hud-afterburner-tag');
    this.gforceVal = document.getElementById('hud-gforce-val');

    this.healthBar = document.getElementById('hud-health-bar');
    this.healthVal = document.getElementById('hud-health-val');
    this.shieldBar = document.getElementById('hud-shield-bar');
    this.shieldVal = document.getElementById('hud-shield-val');
    this.boostBar = document.getElementById('hud-boost-bar');
    this.boostVal = document.getElementById('hud-boost-val');

    this.missileCount = document.getElementById('hud-missile-count');
    this.bombCount = document.getElementById('hud-bomb-count');
    this.flareCount = document.getElementById('hud-flare-count');

    this.objectiveText = document.getElementById('hud-objective-text');
    this.missionTimer = document.getElementById('hud-mission-timer');
    this.scoreText = document.getElementById('hud-score');

    this.pitchLadder = document.getElementById('hud-pitch-ladder');
    this.lockReticle = document.getElementById('hud-lock-reticle');
    this.lockTargetName = document.getElementById('lock-target-name');
    this.lockRange = document.getElementById('lock-range');
    this.lockStatus = document.getElementById('lock-status');

    this.stallAlert = document.getElementById('hud-stall-alert');
    this.cameraName = document.getElementById('hud-camera-name');
    this.radarBlips = document.getElementById('radar-blips-container');

    // G-force vignette & Ground targets container
    this.vignette = document.getElementById('hud-gforce-vignette');
    this.groundMarkersContainer = document.getElementById('hud-ground-markers');
  }

  update(physics, combat, mission, enemies, groundTargets = []) {
    // 1. Airspeed & Altitude
    if (this.speedVal) this.speedVal.textContent = Math.round(physics.airspeedKts);
    if (this.machVal) this.machVal.textContent = physics.mach.toFixed(2);
    if (this.altVal) this.altVal.textContent = Math.round(physics.altitudeMeters).toLocaleString();
    if (this.radAltVal) this.radAltVal.textContent = Math.round(physics.altitudeMeters).toLocaleString();

    // 2. Throttle & Boost
    const thrPct = Math.round(physics.throttle * 100);
    if (this.throttleBar) this.throttleBar.style.height = `${thrPct}%`;
    if (this.throttleVal) this.throttleVal.textContent = `${thrPct}%`;

    if (this.abTag) {
      if (physics.isAfterburner) {
        this.abTag.textContent = 'AFTERBURNER';
        this.abTag.classList.add('afterburner-active');
      } else {
        this.abTag.textContent = 'MIL POWER';
        this.abTag.classList.remove('afterburner-active');
      }
    }

    if (this.gforceVal) this.gforceVal.textContent = physics.gForce.toFixed(1);

    // 3. Condition & Boost Bars
    const hpPct = Math.round((mission.health / mission.maxHealth) * 100);
    if (this.healthBar) this.healthBar.style.width = `${hpPct}%`;
    if (this.healthVal) this.healthVal.textContent = `${hpPct}%`;

    const shPct = Math.round((mission.shield / mission.maxShield) * 100);
    if (this.shieldBar) this.shieldBar.style.width = `${shPct}%`;
    if (this.shieldVal) this.shieldVal.textContent = Math.round(mission.shield);

    const bstPct = Math.round((physics.boostEnergy / physics.maxBoostEnergy) * 100);
    if (this.boostBar) this.boostBar.style.width = `${bstPct}%`;
    if (this.boostVal) this.boostVal.textContent = `${bstPct}%`;

    // 4. Weapons
    if (this.missileCount) this.missileCount.textContent = `${combat.missileAmmo} / ${combat.maxMissiles}`;
    if (this.bombCount) this.bombCount.textContent = `${combat.bombAmmo} / ${combat.maxBombs}`;
    if (this.flareCount) this.flareCount.textContent = `${combat.flareAmmo} / ${combat.maxFlares}`;

    // 5. Mission Objectives
    if (this.objectiveText) {
      this.objectiveText.textContent = mission.getObjectiveStatusText ? mission.getObjectiveStatusText() : `DEFEND AIRSPACE`;
    }
    if (this.missionTimer) this.missionTimer.textContent = mission.getFormattedTime();
    if (this.scoreText) this.scoreText.textContent = mission.score.toString().padStart(5, '0');

    // 6. Stall Warning
    if (this.stallAlert) {
      if (physics.isStalling) this.stallAlert.classList.remove('hidden');
      else this.stallAlert.classList.add('hidden');
    }

    // 7. Pitch Ladder Rotation
    if (this.pitchLadder && physics.mesh) {
      const roll = physics.mesh.rotation.z;
      const pitch = physics.mesh.rotation.x;
      this.pitchLadder.style.transform = `rotate(${roll}rad) translateY(${pitch * 80}px)`;
    }

    // 8. 3D Projected Target Lock Reticle
    this.updateTargetLock(combat);

    // 9. Ground Target Markers
    this.updateGroundTargetMarkers(groundTargets);

    // 10. Radar Minimap
    this.updateRadar(physics, enemies, groundTargets);

    // 11. G-Force Blackout & Redout Vignette
    this.updateGForceVignette(physics.gForce);

    // 12. Camera Name
    if (this.cameraName) {
      this.cameraName.textContent = physics.cameraViewMode === 0 ? 'CHASE (3RD)' : 'COCKPIT (1ST)';
    }
  }

  updateTargetLock(combat) {
    if (!this.lockReticle) return;

    if (combat.currentTarget && !combat.currentTarget.isDead && combat.currentTarget.mesh) {
      const targetPos = combat.currentTarget.mesh.position.clone();
      const screenPos = targetPos.project(this.camera);

      if (screenPos.z < 1.0) {
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

        this.lockReticle.style.left = `${x - 20}px`;
        this.lockReticle.style.top = `${y - 20}px`;
        this.lockReticle.classList.remove('hidden');

        if (this.lockTargetName) this.lockTargetName.textContent = `TGT: ${combat.currentTarget.name}`;
        const distKm = (targetPos.distanceTo(this.camera.position) / 1000).toFixed(1);
        if (this.lockRange) this.lockRange.textContent = `RNG: ${distKm} KM`;

        if (this.lockStatus) {
          if (combat.isLocked) {
            this.lockStatus.textContent = 'LOCKED';
            this.lockStatus.className = 'lock-state-locked';
          } else {
            this.lockStatus.textContent = `SEEKING ${(combat.lockProgress * 100).toFixed(0)}%`;
            this.lockStatus.className = 'lock-state-seeking';
          }
        }
        return;
      }
    }

    this.lockReticle.classList.add('hidden');
  }

  updateGroundTargetMarkers(groundTargets) {
    if (!this.groundMarkersContainer) return;

    let html = '';
    const camPos = this.camera.position;

    for (let gt of groundTargets) {
      if (gt.isDead || !gt.position) continue;

      const screenPos = gt.position.clone().add(new THREE.Vector3(0, 15, 0)).project(this.camera);

      // Only draw if target is in front of the camera and within 8km
      const dist = gt.position.distanceTo(camPos);
      if (screenPos.z < 1.0 && dist < 8500) {
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
        const distKm = (dist / 1000).toFixed(1);

        html += `
          <div class="ground-marker-item" style="left:${x}px; top:${y}px;">
            <div class="ground-marker-diamond"></div>
            <div class="ground-marker-label">[${gt.type}] ${gt.name} (${distKm}KM)</div>
          </div>
        `;
      }
    }

    this.groundMarkersContainer.innerHTML = html;
  }

  updateGForceVignette(gForce) {
    if (!this.vignette) return;

    if (gForce > 5.5) {
      // High-G Blackout: Tunnel vision darkening
      const alpha = Math.min(0.85, (gForce - 5.5) / 3.5);
      this.vignette.className = 'hud-vignette-overlay blackout';
      this.vignette.style.opacity = alpha.toFixed(2);
    } else if (gForce < -1.0) {
      // Negative-G Redout: Blood rush to eyes
      const alpha = Math.min(0.75, (-1.0 - gForce) / 2.2);
      this.vignette.className = 'hud-vignette-overlay redout';
      this.vignette.style.opacity = alpha.toFixed(2);
    } else {
      this.vignette.style.opacity = '0';
    }
  }

  updateRadar(physics, enemies, groundTargets = []) {
    if (!this.radarBlips || !enemies) return;

    let html = '';
    const playerPos = physics.position;
    const playerRotY = physics.mesh.rotation.y;
    const radarRange = 6000;
    const radarRadiusPx = 60;

    // 1. Air Hostiles (Red blips)
    for (let e of enemies) {
      if (e.isDead || !e.mesh) continue;

      const dx = e.mesh.position.x - playerPos.x;
      const dz = e.mesh.position.z - playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < radarRange) {
        const angle = Math.atan2(dx, dz) - playerRotY;
        const r = (dist / radarRange) * radarRadiusPx;
        const bx = 70 + Math.sin(angle) * r;
        const by = 70 - Math.cos(angle) * r;

        html += `<div class="radar-blip-enemy" style="left:${bx}px; top:${by}px;"></div>`;
      }
    }

    // 2. Ground Targets (Amber blips)
    for (let gt of groundTargets) {
      if (gt.isDead || !gt.position) continue;

      const dx = gt.position.x - playerPos.x;
      const dz = gt.position.z - playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < radarRange) {
        const angle = Math.atan2(dx, dz) - playerRotY;
        const r = (dist / radarRange) * radarRadiusPx;
        const bx = 70 + Math.sin(angle) * r;
        const by = 70 - Math.cos(angle) * r;

        html += `<div class="radar-blip-enemy" style="background:#ffaa00; box-shadow:0 0 6px #ffaa00; left:${bx}px; top:${by}px;"></div>`;
      }
    }

    this.radarBlips.innerHTML = html;
  }
}
