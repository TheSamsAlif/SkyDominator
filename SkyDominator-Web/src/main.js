import * as THREE from 'three';
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

    this.initThree();
    this.initGameSystems();
    this.initUI();

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
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 20000);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initGameSystems() {
    // Environment & Particles
    this.environment = new EnvironmentGenerator(this.scene);
    this.environment.createEnvironment();

    this.particles = new ParticleSystem(this.scene);
    this.combatSystem = new CombatSystem(this.scene, this.particles, this.soundManager);
    this.enemySquadron = new EnemySquadronManager(this.scene, this.particles, this.soundManager);

    // Initial Aircraft Model
    this.aircraftMesh = AircraftModelGenerator.createAircraft(this.selectedAircraftSpec, this.selectedSkin);
    this.scene.add(this.aircraftMesh);

    // Flight Physics
    this.physics = new FlightPhysics(this.aircraftMesh, this.camera);

    // HUD
    this.hud = new HUD(this.camera);

    // Hangar Camera Orbit State
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
    // 1. Audio Engage Modal
    const audioOverlay = document.getElementById('audio-prompt-overlay');
    const btnInitAudio = document.getElementById('btn-init-audio');
    const hangarOverlay = document.getElementById('hangar-overlay');

    btnInitAudio.addEventListener('click', () => {
      this.soundManager.init();
      this.soundManager.resume();
      audioOverlay.classList.add('hidden');
      hangarOverlay.classList.remove('hidden');
    });

    // 2. Hangar UI Controller
    this.hangarUI = new HangarUI(
      (spec, skin) => this.onAircraftSelected(spec, skin),
      (skin) => this.onSkinSelected(skin),
      (spec, skin) => this.launchMission(spec, skin)
    );

    // 3. Debrief Return / Replay Buttons
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

  launchMission(spec, skin) {
    this.selectedAircraftSpec = spec;
    this.selectedSkin = skin;
    this.gameState = 'COMBAT';

    document.getElementById('hangar-overlay').classList.add('hidden');
    document.getElementById('combat-hud').classList.remove('hidden');

    this.rebuildAircraftModel();

    // Reset Flight Position to Combat Altitude
    this.physics.position.set(0, 1100, -2500);
    this.physics.velocity.set(0, 0, 200);
    this.physics.throttle = 0.7;
    this.physics.boostEnergy = 100;
    this.aircraftMesh.position.copy(this.physics.position);
    this.aircraftMesh.rotation.set(0, 0, 0);

    // Spawn Enemy Air Squadron
    this.enemySquadron.spawnMissionSquadron();
    this.missionManager.startMission();
  }

  enterHangarMode() {
    this.gameState = 'HANGAR';
    document.getElementById('combat-hud').classList.add('hidden');
    this.enemySquadron.clear();

    this.rebuildAircraftModel();
    this.aircraftMesh.position.set(0, 227, 0); // On runway
    this.aircraftMesh.rotation.set(0, 0, 0);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    // Update Environment
    this.environment.update(dt);

    if (this.gameState === 'HANGAR') {
      // Rotate Hangar Orbit Camera
      if (!this.hangarOrbit.isDragging) {
        this.hangarOrbit.angle += dt * 0.25; // Gentle automatic spin
      }

      const camX = Math.sin(this.hangarOrbit.angle) * this.hangarOrbit.distance;
      const camZ = Math.cos(this.hangarOrbit.angle) * this.hangarOrbit.distance;
      this.camera.position.set(camX, 227 + this.hangarOrbit.height, camZ);
      this.camera.lookAt(0, 227 + 2, 0);

      // Test thrust visual preview
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

      // 4. Weapons & Combat
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
        }
      );

      // 6. VFX Particles
      this.particles.update(
        dt,
        this.enemySquadron.enemies,
        (enemy, dmg) => {
          const killed = this.enemySquadron.damageEnemy(enemy, dmg);
          if (killed) {
            this.missionManager.recordEnemyKill(enemy.isBoss);
          }
        }
      );

      // 7. Mission State & Objectives
      this.missionManager.update(dt, this.enemySquadron.getAliveCount());

      // 8. HUD Update
      this.hud.update(
        this.physics,
        this.combatSystem,
        this.missionManager,
        this.enemySquadron.enemies
      );

      // Check Mission End (Victory or Defeat)
      if (this.missionManager.isVictory || this.missionManager.isDefeat) {
        this.showDebriefModal();
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  showDebriefModal() {
    this.gameState = 'DEBRIEF';
    document.getElementById('combat-hud').classList.add('hidden');
    const debrief = document.getElementById('debrief-overlay');
    debrief.classList.remove('hidden');

    const badge = document.getElementById('debrief-outcome-badge');
    if (this.missionManager.isVictory) {
      badge.textContent = 'MISSION SUCCESS // AIRSPACE SECURED';
      badge.className = 'outcome-badge victory';
    } else {
      badge.textContent = 'AIRCRAFT LOST // MISSION FAILED';
      badge.className = 'outcome-badge defeat';
    }

    document.getElementById('d-kills').textContent = `${this.missionManager.kills} / ${this.missionManager.totalEnemies}`;
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

