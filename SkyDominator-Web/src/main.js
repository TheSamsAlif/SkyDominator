import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { SoundManager } from './audio/SoundManager.js';
import { AIRCRAFT_ROSTER, SKINS_PALETTE } from './core/AircraftData.js';
import { AircraftModelGenerator } from './graphics/AircraftModelGenerator.js';
import { EnvironmentGenerator } from './graphics/EnvironmentGenerator.js';
import { ParticleSystem } from './graphics/ParticleSystem.js';
import { FlightPhysics } from './core/FlightPhysics.js';
import { InputManager } from './core/InputManager.js';
import { CombatSystem } from './gameplay/CombatSystem.js';
import { EnemySquadronManager } from './gameplay/EnemyAI.js';
import { MissionManager } from './gameplay/MissionManager.js';
import { HUD } from './ui/HUD.js';
import { HangarUI } from './ui/HangarUI.js';
import { MISSIONS } from './core/Missions.js';

class SkyDominatorApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.gameState = 'HANGAR'; // 'HANGAR' | 'COMBAT' | 'DEBRIEF'

    // Systems
    this.soundManager = new SoundManager();
    this.inputManager = new InputManager();
    this.missionManager = new MissionManager();

    this.selectedAircraftSpec = AIRCRAFT_ROSTER[0];
    this.selectedSkin = SKINS_PALETTE.stealth;

    // Screen Shake & Camera Trauma state
    this.trauma = 0;

    this.initThree();
    this.initGameSystems();
    this.initUI();

    this.zoomFov = 75;
    this.zoomCur = 75;
    window.addEventListener('wheel', (e) => {
      if (this.gameState === 'COMBAT') {
        this.zoomFov = THREE.MathUtils.clamp(this.zoomFov + e.deltaY * 0.03, 12, 75);
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyZ' && this.gameState === 'COMBAT') {
        this.zoomFov = this.zoomFov > 40 ? 18 : 75;
      }
    });

    this.baseStatus = document.createElement('div');
    this.baseStatus.style.cssText = 'position:fixed;top:92px;left:50%;transform:translateX(-50%);font:700 13px monospace;color:#00ffaa;letter-spacing:2px;text-shadow:0 0 8px #00ffaa;z-index:50;pointer-events:none';
    document.body.appendChild(this.baseStatus);

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 20000);

    // Setup PMREM RoomEnvironment for realistic PBR metallic reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    // Post-Processing: UnrealBloomPass for glowing HUD, tracers & afterburners
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.55,  // strength
      0.4,   // radius
      0.82   // threshold
    );
    this.composer.addPass(this.bloomPass);

    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
      this.bloomPass.setSize(w, h);
    });
  }

  initGameSystems() {
    this.environment = new EnvironmentGenerator(this.scene);
    this.environment.createEnvironment();

    this.particles = new ParticleSystem(this.scene);
    this.combatSystem = new CombatSystem(this.scene, this.particles, this.soundManager);
    this.enemySquadron = new EnemySquadronManager(this.scene, this.particles, this.soundManager);

    this.aircraftMesh = AircraftModelGenerator.createAircraft(this.selectedAircraftSpec, this.selectedSkin);
    this.scene.add(this.aircraftMesh);

    this.physics = new FlightPhysics(this.aircraftMesh, this.camera);
    this.hud = new HUD(this.camera);

    this.hangarOrbit = {
      angle: 0,
      distance: 34,
      height: 9,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0
    };
    this.setupHangarControls();
  }

  setupHangarControls() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.gameState === 'HANGAR') {
        this.hangarOrbit.isDragging = true;
        this.hangarOrbit.lastMouseX = e.clientX;
        this.hangarOrbit.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      this.hangarOrbit.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.gameState === 'HANGAR' && this.hangarOrbit.isDragging) {
        const dx = e.clientX - this.hangarOrbit.lastMouseX;
        const dy = e.clientY - this.hangarOrbit.lastMouseY;
        this.hangarOrbit.angle += dx * 0.008;
        this.hangarOrbit.height = THREE.MathUtils.clamp(this.hangarOrbit.height + dy * 0.05, 2, 25);
        this.hangarOrbit.lastMouseX = e.clientX;
        this.hangarOrbit.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('wheel', (e) => {
      if (this.gameState === 'HANGAR') {
        this.hangarOrbit.distance = THREE.MathUtils.clamp(this.hangarOrbit.distance + e.deltaY * 0.03, 16, 60);
      }
    });

    const btnResetCam = document.getElementById('btn-camera-reset');
    if (btnResetCam) {
      btnResetCam.addEventListener('click', () => {
        this.hangarOrbit.angle = 0;
        this.hangarOrbit.distance = 34;
        this.hangarOrbit.height = 9;
      });
    }
  }

  initUI() {
    const audioOverlay = document.getElementById('audio-prompt-overlay');
    const btnInitAudio = document.getElementById('btn-init-audio');
    const hangarOverlay = document.getElementById('hangar-overlay');

    btnInitAudio.addEventListener('click', () => {
      this.soundManager.init();
      this.soundManager.resume();
      audioOverlay.classList.add('hidden');
      hangarOverlay.classList.remove('hidden');
    });

    // Mission selector injected above launch button
    this.currentMission = MISSIONS[0];
    const launchWrap = document.querySelector('.launch-actions');
    if (launchWrap) {
      const box = document.createElement('div');
      box.style.cssText = 'display:grid;gap:6px;margin-bottom:10px';
      box.innerHTML = '<div style="font:600 11px monospace;color:#00e5ff;letter-spacing:2px">// SELECT MISSION</div>' +
        '<select id="mission-select" style="background:#0a1420;color:#fff;border:1px solid #00e5ff;padding:8px;font:600 13px monospace">' +
        MISSIONS.map((m, i) => `<option value="${i}">${i + 1}. ${m.city} - ${m.op}</option>`).join('') + '</select>' +
        '<div id="mission-brief" style="font:12px monospace;color:#9fb8c8">' + MISSIONS[0].brief + '</div>';
      launchWrap.prepend(box);
      box.querySelector('select').addEventListener('change', (e) => {
        this.currentMission = MISSIONS[+e.target.value];
        box.querySelector('#mission-brief').textContent = this.currentMission.brief;
        const lm = document.querySelector('#btn-launch-mission .launch-main');
        if (lm) lm.textContent = 'LAUNCH: ' + this.currentMission.city;
      });
    }

    this.hangarUI = new HangarUI(
      (spec, skin) => this.onAircraftSelected(spec, skin),
      (skin) => this.onSkinSelected(skin),
      (spec, skin) => this.launchMission(spec, skin)
    );

    const btnReturnHangar = document.getElementById('btn-return-hangar');
    const btnReplay = document.getElementById('btn-replay-mission');

    if (btnReturnHangar) {
      btnReturnHangar.addEventListener('click', () => {
        document.getElementById('debrief-overlay').classList.add('hidden');
        document.getElementById('hangar-overlay').classList.remove('hidden');
        this.enterHangarMode();
      });
    }

    if (btnReplay) {
      btnReplay.addEventListener('click', () => {
        document.getElementById('debrief-overlay').classList.add('hidden');
        this.launchMission(this.selectedAircraftSpec, this.selectedSkin);
      });
    }
  }

  onAircraftSelected(spec, skin) {
    this.selectedAircraftSpec = spec;
    this.rebuildAircraftModel();
  }

  onSkinSelected(skin) {
    this.selectedSkin = skin;
    this.rebuildAircraftModel();
  }

  rebuildAircraftModel() {
    if (this.aircraftMesh) {
      this.scene.remove(this.aircraftMesh);
    }
    this.aircraftMesh = AircraftModelGenerator.createAircraft(this.selectedAircraftSpec, this.selectedSkin);
    this.scene.add(this.aircraftMesh);

    if (this.physics) {
      this.physics.setAircraftMesh(this.aircraftMesh);
    }
  }

  addCameraShake(amount) {
    this.trauma = THREE.MathUtils.clamp(this.trauma + amount, 0, 1.0);
  }

  launchMission(spec, skin) {
    this.selectedAircraftSpec = spec;
    this.selectedSkin = skin;
    this.gameState = 'COMBAT';

    document.getElementById('hangar-overlay').classList.add('hidden');
    document.getElementById('combat-hud').classList.remove('hidden');

    this.rebuildAircraftModel();

    // Reset Flight Position to Runway
    this.physics.groundY = 17;
    this.physics.position.set(0, 17, -3700);
    this.physics.velocity.set(0, 0, 0);
    this.physics.throttle = 1.0;
    this.zoomFov = 75;
    this.zoomCur = 75;
    this.physics.boostEnergy = 100;
    this.aircraftMesh.position.copy(this.physics.position);
    this.aircraftMesh.rotation.set(0, 0, 0);

    // Build city theme & ground defense targets
    const m = this.currentMission;
    this.environment.loadTheme(m);
    this.environment.showHangar(false);

    // Reset combat ordnance
    this.combatSystem.missileAmmo = this.combatSystem.maxMissiles;
    this.combatSystem.bombAmmo = this.combatSystem.maxBombs;
    this.combatSystem.flareAmmo = this.combatSystem.maxFlares;

    // Spawn Enemy Squadron
    this.enemySquadron.spawnMissionSquadron(m, new THREE.Vector3(0, 1100, -1500));
    const totalAir = this.enemySquadron.enemies.length;

    // Start mission manager
    this.missionManager.startMission(totalAir, m);
    this.missionManager.creditsAwarded = 2500 + totalAir * 300;
    this.missionManager.xpAwarded = 1000 + totalAir * 150;
  }

  enterHangarMode() {
    this.gameState = 'HANGAR';
    document.getElementById('combat-hud').classList.add('hidden');
    this.enemySquadron.clear();
    this.baseStatus.textContent = '';
    this.zoomFov = 75;
    this.zoomCur = 75;
    this.camera.fov = 75;
    this.camera.updateProjectionMatrix();
    this.environment.showHangar(true);
    this.scene.background = new THREE.Color(0x0c1e30);

    this.rebuildAircraftModel();
    this.aircraftMesh.position.set(0, 227, 0);
    this.aircraftMesh.rotation.set(0, 0, 0);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    // Update Environment
    this.environment.update(dt);

    if (this.gameState === 'HANGAR') {
      if (!this.hangarOrbit.isDragging) {
        this.hangarOrbit.angle += dt * 0.25;
      }

      const camX = Math.sin(this.hangarOrbit.angle) * this.hangarOrbit.distance;
      const camZ = Math.cos(this.hangarOrbit.angle) * this.hangarOrbit.distance;
      this.camera.position.set(camX, 227 + this.hangarOrbit.height, camZ);
      this.camera.lookAt(0, 227 + 2, 0);

      AircraftModelGenerator.updateAfterburnerFX(
        this.aircraftMesh,
        this.hangarUI.isTestThrust ? 1.0 : 0.0,
        this.hangarUI.isTestThrust
      );

      this.soundManager.updateEngine(this.hangarUI.isTestThrust ? 1.0 : 0.0, this.hangarUI.isTestThrust, 0);

    } else if (this.gameState === 'COMBAT') {
      // 1. Process Input
      this.inputManager.update();
      if (this.inputManager.cycleCamera) {
        this.physics.cycleCamera();
      }

      // 2. Flight Physics
      this.physics.update(dt, this.inputManager);

      // 3. Engine Audio & Visual Flame Cones
      AircraftModelGenerator.updateAfterburnerFX(
        this.aircraftMesh,
        this.physics.throttle,
        this.physics.isAfterburner
      );
      this.soundManager.updateEngine(
        this.physics.throttle,
        this.physics.isAfterburner,
        this.physics.airspeedKts
      );

      if (this.physics.isStalling && Math.random() > 0.85) {
        this.soundManager.playWarningChime('stall');
      }

      // Camera zoom (mouse wheel / Z)
      this.zoomCur += (this.zoomFov - this.zoomCur) * Math.min(1, 8 * dt);
      if (this.zoomCur < 70) {
        this.camera.fov = this.zoomCur;
        this.camera.updateProjectionMatrix();
      }

      // Airbase Safe Zone, landing, repair and rearm
      const b = this.environment.base;
      const pp = this.physics.position;
      const spd = this.physics.velocity.length();
      const inSafe = !!b && Math.hypot(pp.x - b.x, pp.z - b.z) < b.radius;
      const onGround = !!b && pp.y < b.groundY + 4;
      this.enemySquadron.playerSafe = inSafe;

      if (inSafe) {
        for (const e of this.enemySquadron.enemies) {
          if (!e.isDead && Math.hypot(e.mesh.position.x - b.x, e.mesh.position.z - b.z) < b.radius * 1.15) {
            if (this.enemySquadron.damageEnemy(e, 90 * dt)) {
              this.missionManager.recordEnemyKill(e.isBoss);
            }
          }
        }
      }

      let msg = '';
      if (inSafe && onGround && spd < 45) {
        const mm = this.missionManager;
        mm.health = Math.min(mm.maxHealth, mm.health + 250 * dt);
        mm.shield = mm.maxShield;
        this.combatSystem.missileAmmo = this.combatSystem.maxMissiles;
        this.combatSystem.bombAmmo = this.combatSystem.maxBombs;
        this.combatSystem.flareAmmo = this.combatSystem.maxFlares;
        msg = 'LANDED // REPAIRING & FULL REARM (MISSILES & BOMBS)';
      } else if (onGround && spd < 90) {
        msg = 'TAKEOFF: HOLD SHIFT // PITCH UP AT ~280 KTS';
      } else if (inSafe) {
        msg = 'SAFE ZONE // BASE AA DEFENSE ACTIVE // LAND TO REARM';
      }
      if (this.zoomFov < 70) {
        msg += (msg ? '  |  ' : '') + `ZOOM ${(75 / this.zoomFov).toFixed(1)}x`;
      }
      this.baseStatus.textContent = msg;

      // 4. Weapons & Combat (Air + Ground Targets)
      const aliveGroundTargets = this.environment.getAliveGroundTargets();

      this.combatSystem.update(
        dt,
        this.aircraftMesh,
        this.physics.velocity,
        this.inputManager,
        this.enemySquadron.enemies,
        (enemy, dmg) => {
          const killed = this.enemySquadron.damageEnemy(enemy, dmg);
          if (killed) {
            this.missionManager.recordEnemyKill(enemy.isBoss);
            this.addCameraShake(0.35);
          }
        },
        aliveGroundTargets,
        (gt, dmg) => {
          const destroyed = this.environment.damageGroundTarget(gt, dmg, this.particles, this.soundManager);
          if (destroyed) {
            this.missionManager.recordGroundTargetKill(gt.type);
            this.addCameraShake(0.45);
          }
        }
      );

      // 5. Enemy AI Squadron
      this.enemySquadron.update(
        dt,
        this.physics.position,
        this.physics.velocity,
        (damage) => {
          this.missionManager.applyDamageToPlayer(damage);
          this.soundManager.playExplosion(false);
          this.addCameraShake(0.3); // Screen shake on player hit
        }
      );

      // Missile threat alert + subtle camera jitter
      const alert = document.getElementById('hud-missile-alert');
      const threat = this.enemySquadron.threat < Infinity && this.enemySquadron.missiles.length > 0;
      if (alert) alert.classList.toggle('hidden', !threat);
      if (threat) {
        if (Math.random() > 0.9) this.soundManager.playWarningChime('missile');
        this.addCameraShake(0.04);
      }

      // 6. VFX Particles (Bullets vs Air & Ground Targets)
      this.particles.update(
        dt,
        this.enemySquadron.enemies,
        (enemy, dmg) => {
          const killed = this.enemySquadron.damageEnemy(enemy, dmg);
          if (killed) {
            this.missionManager.recordEnemyKill(enemy.isBoss);
            this.addCameraShake(0.35);
          }
        },
        aliveGroundTargets,
        (gt, dmg) => {
          const destroyed = this.environment.damageGroundTarget(gt, dmg, this.particles, this.soundManager);
          if (destroyed) {
            this.missionManager.recordGroundTargetKill(gt.type);
            this.addCameraShake(0.45);
          }
        }
      );

      // 7. Mission State & Multi-Stage Objectives
      this.missionManager.update(dt, this.enemySquadron.getAliveCount(), aliveGroundTargets.length);

      // 8. HUD Update
      this.hud.update(
        this.physics,
        this.combatSystem,
        this.missionManager,
        this.enemySquadron.enemies,
        aliveGroundTargets
      );

      // 9. Apply Screen Shake / Camera Trauma
      if (this.trauma > 0) {
        this.trauma = Math.max(0, this.trauma - dt * 1.25);
        const shake = Math.pow(this.trauma, 2);
        this.camera.position.x += (Math.random() - 0.5) * 2.2 * shake;
        this.camera.position.y += (Math.random() - 0.5) * 2.2 * shake;
        this.camera.rotation.z += (Math.random() - 0.5) * 0.045 * shake;
      }

      // Check Mission End
      if (this.missionManager.isVictory || this.missionManager.isDefeat) {
        this.showDebriefModal();
      }
    }

    // Render through Post-Processing Composer (UnrealBloomPass)
    this.composer.render();
  }

  showDebriefModal() {
    this.gameState = 'DEBRIEF';
    document.getElementById('combat-hud').classList.add('hidden');
    const debrief = document.getElementById('debrief-overlay');
    debrief.classList.remove('hidden');

    const badge = document.getElementById('debrief-outcome-badge');
    if (this.missionManager.isVictory) {
      badge.textContent = `MISSION SUCCESS // ${this.currentMission.city} AIR & GROUND DEFENSES SECURED`;
      badge.className = 'outcome-badge victory';
    } else {
      badge.textContent = 'AIRCRAFT LOST // MISSION FAILED';
      badge.className = 'outcome-badge defeat';
    }

    document.getElementById('d-kills').textContent = `${this.missionManager.kills} AIR / ${this.missionManager.groundTargetsDestroyed} GROUND`;
    document.getElementById('d-time').textContent = this.missionManager.getFormattedTime();
    document.getElementById('d-score').textContent = this.missionManager.score.toLocaleString();
    document.getElementById('d-xp').textContent = `+${this.missionManager.xpAwarded} XP`;
    document.getElementById('d-credits').textContent = `+${this.missionManager.creditsAwarded} CR`;
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new SkyDominatorApp();
});
