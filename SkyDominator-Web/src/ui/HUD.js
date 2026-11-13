import * as THREE from 'three';

/**
 * Combat Flight HUD & Radar Minimap Manager
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
  }

  update(physics, combat, mission, enemies) {
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
    if (this.flareCount) this.flareCount.textContent = `${combat.flareAmmo} / ${combat.maxFlares}`;

    // 5. Mission Objectives
    if (this.objectiveText) {
      this.objectiveText.textContent = `DEFEND APEX ATOLL // ELIMINATE SQUADRON (${mission.kills}/${mission.totalEnemies})`;
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

    // 9. Radar Minimap
    this.updateRadar(physics, enemies);

    // 10. Camera Name
    if (this.cameraName) {
      this.cameraName.textContent = physics.cameraViewMode === 0 ? 'CHASE (3RD)' : 'COCKPIT (1ST)';
    }
  }

  updateTargetLock(combat) {
    if (!this.lockReticle) return;

    if (combat.currentTarget && !combat.currentTarget.isDead && combat.currentTarget.mesh) {
      const targetPos = combat.currentTarget.mesh.position.clone();
      const screenPos = targetPos.project(this.camera);

      // Check if target is in front of camera
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

  updateRadar(physics, enemies) {
    if (!this.radarBlips || !enemies) return;

    let html = '';
    const playerPos = physics.position;
    const playerRotY = physics.mesh.rotation.y;
    const radarRange = 5000; // 5km radius
    const radarRadiusPx = 60;

    for (let e of enemies) {
      if (e.isDead || !e.mesh) continue;

      const dx = e.mesh.position.x - playerPos.x;
      const dz = e.mesh.position.z - playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < radarRange) {
        // Rotate relative to player heading
        const angle = Math.atan2(dx, dz) - playerRotY;
        const r = (dist / radarRange) * radarRadiusPx;

        const bx = 70 + Math.sin(angle) * r;
        const by = 70 - Math.cos(angle) * r;

        html += `<div class="radar-blip-enemy" style="left:${bx}px; top:${by}px;"></div>`;
      }
    }

    this.radarBlips.innerHTML = html;
  }
}

