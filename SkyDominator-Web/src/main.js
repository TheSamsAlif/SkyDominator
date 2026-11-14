import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { AIRCRAFT_ROSTER, SKINS_PALETTE } from './core/AircraftData.js';
import { MISSIONS } from './core/Missions.js';
import { SaveSystem } from './core/SaveSystem.js';
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
import { SoundManager } from './audio/SoundManager.js';

/**
 * Sky Dominator: Apex Strike - Master Game Orchestrator
 * Integrates:
 * - Persistent Progression & Upgrade Shop (SaveSystem)
 * - Dynamic Tactical Pause & In-Game Avionics Settings
 * - Quality Presets (Low / Med / High PBR) & Object Pooling
 * - Directional Damage Screen Indicators & Real-Time FPS Telemetry
 * - Safe-Zone Airbase Rearm & Repair
 */
class SkyDominatorApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.gameState = 'HANGAR'; // 'HANGAR' | 'COMBAT' | 'PAUSED' | 'DEBRIEF'

    // Persistent Profile
    this.profile = SaveSystem.loadProfile();

    // Selected Configuration
    this.selectedAircraftSpec = AIRCRAFT_ROSTER[0];
    this.selectedSkin = SKINS_PALETTE.stealth;
    this.selectedMission = MISSIONS[0];
    this.selectedDifficulty = 'normal';

    // Core Systems
    this.soundManager = new SoundManager();
    this.inputManager = new InputManager();
    this.missionManager = new MissionManager(this.selectedMission);

    // Apply Saved Settings
    if (this.profile.settings) {
      if (this.profile.settings.mouseSensitivity) {
        this.inputManager.mouseSensitivity = this.profile.settings.mouseSensitivity;
      }
      if (this.profile.settings.volume !== undefined) {
        this.soundManager.setMasterVolume(this.profile.settings.volume);
      }
    }

    // Camera Trauma
    this.trauma = 0;

    // Rolling FPS Telemetry
    this.fps = 60;

    // Hangar Camera Orbit State
    this.hangarOrbit = {
      angle: 0.6,
      distance: 36,
      height: 8,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0
    };

    this.sunLight = null;
    this.ambLight = null;
    this.hasRearmedThisLanding = false;

    this.initThree();
    this.initGameSystems();
    this.initUI();
    this.initPauseAndSettings();

    // Apply initial graphics preset
    this.applyQualitySetting(this.profile.settings ? this.profile.settings.quality : 'high');

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
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.5, 30000);

    // PBR Environment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture;

    // Post-Processing UnrealBloomPass
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.65,
      0.4,
      0.85
    );
    this.composer.addPass(this.bloomPass);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  applyQualitySetting(quality = 'high') {
    if (!this.profile.settings) this.profile.settings = {};
    this.profile.settings.quality = quality;

    if (quality === 'low') {
      this.renderer.shadowMap.enabled = false;
      this.renderer.setPixelRatio(1.0);
      if (this.bloomPass) this.bloomPass.enabled = false;
    } else if (quality === 'medium') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.BasicShadowMap;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      if (this.sunLight && this.sunLight.shadow) {
        this.sunLight.shadow.mapSize.set(1024, 1024);
      }
      if (this.bloomPass) this.bloomPass.enabled = !!this.profile.settings.bloom;
    } else {
      // High (PBR)
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
      if (this.sunLight && this.sunLight.shadow) {
        this.sunLight.shadow.mapSize.set(2048, 2048);
      }
      if (this.bloomPass) this.bloomPass.enabled = (this.profile.settings.bloom !== false);
    }
  }

  initGameSystems() {
    this.environment = new EnvironmentGenerator(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.combatSystem = new CombatSystem(this.scene, this.particles, this.soundManager);
    this.enemySquadron = new EnemySquadronManager(this.scene, this.particles, this.soundManager);

    this.rebuildAircraftModel();
    this.physics = new FlightPhysics(this.aircraftMesh, this.camera);
    this.hud = new HUD(this.camera);

    // Directional damage hook
    this.combatSystem.onDamageReceived = (direction) => {
      this.hud.flashDamage(direction);
    };

    this.setupHangarControls();
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
        this.hangarOrbit.height = THREE.MathUtils.clamp(this.hangarOrbit.height + dy * 0.05, 2, 28);
        this.hangarOrbit.lastMouseX = e.clientX;
        this.hangarOrbit.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('wheel', (e) => {
      if (this.gameState === 'HANGAR') {
        this.hangarOrbit.distance = THREE.MathUtils.clamp(this.hangarOrbit.distance + e.deltaY * 0.04, 18, 65);
      }
    });

    const btnResetCam = document.getElementById('btn-camera-reset');
    if (btnResetCam) {
      btnResetCam.addEventListener('click', () => {
        this.hangarOrbit.angle = 0.6;
        this.hangarOrbit.distance = 36;
        this.hangarOrbit.height = 8;
      });
    }
  }

  initUI() {
    const audioOverlay = document.getElementById('audio-prompt-overlay');
    const btnInitAudio = document.getElementById('btn-init-audio');
    const hangarOverlay = document.getElementById('hangar-overlay');

    if (btnInitAudio) {
      btnInitAudio.addEventListener('click', () => {
        this.soundManager.initAudio();
        if (audioOverlay) audioOverlay.classList.add('hidden');
        if (hangarOverlay) hangarOverlay.classList.remove('hidden');
        this.enterHangarMode();
      });
    }

    this.hangarUI = new HangarUI(
      (spec, skin) => {
        this.selectedAircraftSpec = spec;
        this.selectedSkin = skin;
        this.rebuildAircraftModel();
        this.aircraftMesh.position.set(0, 5, 0);
      },
      (skin) => {
        this.selectedSkin = skin;
        this.rebuildAircraftModel();
        this.aircraftMesh.position.set(0, 5, 0);
      },
      (mission) => {
        this.selectedMission = mission;
        this.missionManager.setMission(mission);
      },
      (diff) => {
        this.selectedDifficulty = diff;
        this.enemySquadron.setDifficulty(diff);
      },
      (spec, skin, mission, diff) => {
        this.selectedAircraftSpec = spec;
        this.selectedSkin = skin;
        this.selectedMission = mission;
        this.selectedDifficulty = diff;
        this.launchCombatMission();
      },
      () => {
        this.openSettingsModal();
      }
    );

    const btnReturnHangar = document.getElementById('btn-return-hangar');
    const btnReplay = document.getElementById('btn-replay-mission');

    if (btnReturnHangar) {
      btnReturnHangar.addEventListener('click', () => {
        document.getElementById('debrief-overlay').classList.add('hidden');
        this.enterHangarMode();
      });
    }

    if (btnReplay) {
      btnReplay.addEventListener('click', () => {
        document.getElementById('debrief-overlay').classList.add('hidden');
        this.launchCombatMission();
      });
    }
  }

  initPauseAndSettings() {
    const pauseOverlay = document.getElementById('pause-overlay');
    const btnHudPause = document.getElementById('btn-hud-pause');
    const btnPauseResume = document.getElementById('btn-pause-resume');
    const btnPauseSettings = document.getElementById('btn-pause-settings');
    const btnPauseRestart = document.getElementById('btn-pause-restart');
    const btnPauseHangar = document.getElementById('btn-pause-hangar');

    if (btnHudPause) {
      btnHudPause.addEventListener('click', () => this.togglePause());
    }

    if (btnPauseResume) {
      btnPauseResume.addEventListener('click', () => this.resumeSortie());
    }

    if (btnPauseSettings) {
      btnPauseSettings.addEventListener('click', () => this.openSettingsModal());
    }

    if (btnPauseRestart) {
      btnPauseRestart.addEventListener('click', () => {
        if (pauseOverlay) pauseOverlay.classList.add('hidden');
        this.launchCombatMission();
      });
    }

    if (btnPauseHangar) {
      btnPauseHangar.addEventListener('click', () => {
        if (pauseOverlay) pauseOverlay.classList.add('hidden');
        this.enterHangarMode();
      });
    }

    // Settings Modal DOM
    const settingsModal = document.getElementById('settings-overlay');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnSaveSettings = document.getElementById('btn-save-settings');

    const sliderSens = document.getElementById('slider-sensitivity');
    const valSens = document.getElementById('val-sensitivity');
    const sliderVol = document.getElementById('slider-volume');
    const valVol = document.getElementById('val-volume');
    const btnToggleBloom = document.getElementById('btn-toggle-bloom');
    const qualityPills = document.querySelectorAll('#setting-quality-group .setting-pill-btn');

    if (btnCloseSettings && settingsModal) {
      btnCloseSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
    }

    // Quality selection
    qualityPills.forEach(pill => {
      pill.addEventListener('click', () => {
        qualityPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const q = pill.dataset.quality;
        this.applyQualitySetting(q);
      });
    });

    // Sensitivity slider
    if (sliderSens && valSens) {
      sliderSens.value = this.profile.settings ? this.profile.settings.mouseSensitivity : 1.0;
      valSens.textContent = `${sliderSens.value}x`;

      sliderSens.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valSens.textContent = `${val.toFixed(1)}x`;
        this.inputManager.mouseSensitivity = val;
        this.profile.settings.mouseSensitivity = val;
      });
    }

    // Volume slider
    if (sliderVol && valVol) {
      sliderVol.value = Math.round((this.profile.settings ? this.profile.settings.volume : 0.85) * 100);
      valVol.textContent = `${sliderVol.value}%`;

      sliderVol.addEventListener('input', (e) => {
        const pct = parseInt(e.target.value);
        valVol.textContent = `${pct}%`;
        const v = pct / 100;
        this.soundManager.setMasterVolume(v);
        this.profile.settings.volume = v;
      });
    }

    // Bloom toggle
    if (btnToggleBloom) {
      btnToggleBloom.addEventListener('click', () => {
        const current = this.bloomPass ? this.bloomPass.enabled : true;
        const next = !current;
        if (this.bloomPass) this.bloomPass.enabled = next;
        this.profile.settings.bloom = next;
        btnToggleBloom.classList.toggle('active', next);
        btnToggleBloom.textContent = next ? 'ENABLED' : 'DISABLED';
      });
    }

    if (btnSaveSettings && settingsModal) {
      btnSaveSettings.addEventListener('click', () => {
        SaveSystem.saveProfile(this.profile);
        settingsModal.classList.add('hidden');
      });
    }
  }

  togglePause() {
    if (this.gameState === 'COMBAT') {
      this.pauseSortie();
    } else if (this.gameState === 'PAUSED') {
      this.resumeSortie();
    }
  }

  pauseSortie() {
    if (this.gameState !== 'COMBAT') return;
    this.gameState = 'PAUSED';
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) pauseOverlay.classList.remove('hidden');
    this.soundManager.pauseAudio();
  }

  resumeSortie() {
    if (this.gameState !== 'PAUSED') return;
    this.gameState = 'COMBAT';
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    this.soundManager.resumeAudio();
  }

  openSettingsModal() {
    const settingsModal = document.getElementById('settings-overlay');
    if (settingsModal) settingsModal.classList.remove('hidden');
  }

  enterHangarMode() {
    this.gameState = 'HANGAR';
    document.getElementById('hangar-overlay').classList.remove('hidden');
    document.getElementById('combat-hud').classList.add('hidden');
    document.getElementById('debrief-overlay').classList.add('hidden');
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');

    this.soundManager.resumeAudio();
    this.particles.clear();
    this.combatSystem.clear();
    this.enemySquadron.clear();
    this.rebuildAircraftModel();

    this.scene.background = new THREE.Color(0x040810);
    this.scene.fog = new THREE.FogExp2(0x060c18, 0.0003);

    this.environment.generateEnvironment({ citySpread: 2000, groundTargets: [], weather: 'clear' });
    this.aircraftMesh.position.set(0, 5, 0);
    this.aircraftMesh.quaternion.set(0, 0, 0, 1);
  }

  launchCombatMission() {
    this.gameState = 'COMBAT';
    document.getElementById('hangar-overlay').classList.add('hidden');
    document.getElementById('combat-hud').classList.remove('hidden');
    document.getElementById('debrief-overlay').classList.add('hidden');
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');

    const missionNameEl = document.getElementById('hud-mission-name');
    if (missionNameEl) {
      missionNameEl.textContent = `OPERATION: ${this.selectedMission.name.toUpperCase()} [${this.selectedMission.city.toUpperCase()}]`;
    }

    // Load profile upgrades & settings
    this.profile = SaveSystem.loadProfile();
    this.combatSystem.applyUpgrades(this.profile.upgrades);
    this.physics.applyBoostUpgrade(this.profile.upgrades.boost || 0);

    // Atmosphere
    this.scene.background = new THREE.Color(this.selectedMission.skyColor);
    this.scene.fog = new THREE.FogExp2(this.selectedMission.fogColor, this.selectedMission.fogDensity);

    // Directional Sunlight
    if (this.sunLight) this.scene.remove(this.sunLight);
    this.sunLight = new THREE.DirectionalLight(this.selectedMission.sunColor, 2.2);
    this.sunLight.position.set(...this.selectedMission.sunPosition);
    this.sunLight.castShadow = true;
    const shadowMapSize = this.profile.settings.quality === 'medium' ? 1024 : 2048;
    this.sunLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    this.scene.add(this.sunLight);

    if (this.ambLight) this.scene.remove(this.ambLight);
    this.ambLight = new THREE.AmbientLight(this.selectedMission.ambientColor, 1.4);
    this.scene.add(this.ambLight);

    // Generate City, Weather & Ground Targets
    this.environment.generateEnvironment(this.selectedMission);

    // Reset & Prepare Systems
    this.particles.clear();
    this.combatSystem.clear();
    this.missionManager.setMission(this.selectedMission);
    this.enemySquadron.setDifficulty(this.selectedDifficulty);
    this.combatSystem.rearmAll();
    this.rebuildAircraftModel();

    // Reset player position airborne over runway heading out
    this.physics.resetPosition(0, 450, -400, 0);

    // Spawn Wave 1
    const firstWave = this.missionManager.getCurrentWaveConfig();
    this.enemySquadron.spawnWave(firstWave, this.physics.position);
    this.hud.showWaveBanner(firstWave.title || 'WAVE 1 // VANGUARD');

    // Initial AWACS Radio Greeting
    this.soundManager.speakRadioChatter(
      `Viper-1, radar contact positive over ${this.selectedMission.city}. Weapons free!`,
      'AWACS',
      (sub) => this.hud.showRadioSubtitle(sub)
    );
  }

  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    // Rolling FPS computation
    if (dt > 0) {
      this.fps = THREE.MathUtils.lerp(this.fps, 1.0 / dt, 0.06);
      this.hud.updateFPS(this.fps, dt * 1000);
    }

    if (this.gameState === 'HANGAR') {
      this.environment.update(dt);

      if (!this.hangarOrbit.isDragging) {
        this.hangarOrbit.angle += dt * 0.25;
      }

      const camX = Math.sin(this.hangarOrbit.angle) * this.hangarOrbit.distance;
      const camZ = Math.cos(this.hangarOrbit.angle) * this.hangarOrbit.distance;
      this.camera.position.set(camX, 5 + this.hangarOrbit.height, camZ);
      this.camera.lookAt(0, 5 + 1.5, 0);
      this.camera.up.set(0, 1, 0);

      AircraftModelGenerator.updateAfterburnerFX(
        this.aircraftMesh,
        this.hangarUI.isTestThrust ? 1.0 : 0.0,
        this.hangarUI.isTestThrust
      );

      if (this.soundManager) {
        this.soundManager.updateEngine(this.hangarUI.isTestThrust ? 1.0 : 0.0, this.hangarUI.isTestThrust, 0);
      }

    } else if (this.gameState === 'PAUSED') {
      // Pause trigger check
      this.inputManager.update();
      if (this.inputManager.consumePauseTrigger()) {
        this.resumeSortie();
      }

    } else if (this.gameState === 'COMBAT') {
      // Check for pause toggle
      this.inputManager.update();
      if (this.inputManager.consumePauseTrigger()) {
        this.pauseSortie();
        this.composer.render();
        return;
      }

      if (this.inputManager.consumeCycleCamera()) {
        this.physics.cycleCamera();
      }

      // 1. Flight Physics
      this.physics.update(dt, this.inputManager);

      // 2. Dynamic Weather (Rain follows player, lightning flashes)
      this.environment.update(dt, this.physics.position);

      // 3. Audio & Afterburners
      AircraftModelGenerator.updateAfterburnerFX(
        this.aircraftMesh,
        this.physics.throttle,
        this.physics.isAfterburner
      );

      if (this.soundManager) {
        this.soundManager.updateEngine(
          this.physics.throttle,
          this.physics.isAfterburner,
          this.physics.airspeedKts
        );
        if (this.physics.isStalling && Math.random() > 0.85) {
          this.soundManager.playWarningChime('stall');
        }
      }

      // 4. Weapons & Combat
      this.combatSystem.update(
        dt,
        this.aircraftMesh,
        this.physics.velocity,
        this.inputManager,
        this.enemySquadron,
        this.environment.groundTargetsGroup,
        (enemy, damage) => {
          const destroyed = this.enemySquadron.damageEnemy(enemy, damage);
          if (destroyed) {
            this.missionManager.recordAirKill(enemy.isBoss);
            this.addTrauma(0.25);
          }
        }
      );

      // 5. Safe-Zone Airbase Detection & Touchdown Rearm
      const distFromBase = new THREE.Vector2(this.physics.position.x, this.physics.position.z).length();
      const inSafeZone = distFromBase < 1400;
      this.enemySquadron.playerSafe = inSafeZone;

      if (inSafeZone && this.physics.altitudeMeters < 38) {
        if (!this.hasRearmedThisLanding) {
          this.combatSystem.rearmAll();
          this.hasRearmedThisLanding = true;
          this.hud.showRearmBanner();
          this.soundManager.speakRadioChatter(
            'Airbase approach confirmed. Armor repaired, payload rearmed!',
            'BASE TOWER',
            (sub) => this.hud.showRadioSubtitle(sub)
          );
        }
      } else if (this.physics.altitudeMeters > 75) {
        this.hasRearmedThisLanding = false;
      }

      // 6. Enemy AI Update
      this.enemySquadron.update(
        dt,
        this.physics.position,
        this.physics.velocity,
        (damage, attackerPos) => {
          const isDead = this.combatSystem.applyDamageToPlayer(damage, attackerPos, this.aircraftMesh);
          this.addTrauma(0.4);
          if (this.soundManager) this.soundManager.playExplosion(false);

          if (isDead) {
            this.missionManager.setDefeat();
            this.soundManager.speakRadioChatter('Mayday! Viper-1 is going down!', 'AWACS');
            this.showDebriefModal();
          }
        }
      );

      // 7. 3-Wave Auto-Progression Check
      this.missionManager.checkWaveAdvance(this.enemySquadron.getAliveCount(), (newWave) => {
        this.enemySquadron.spawnWave(newWave, this.physics.position);
        this.hud.showWaveBanner(newWave.title);
        this.addTrauma(0.35);
      });

      // 8. Ground Target Destruction
      if (this.environment.groundTargetsGroup) {
        this.environment.groundTargetsGroup.children.forEach((gt) => {
          if (gt.userData && gt.userData.isAlive && gt.userData.health <= 0) {
            gt.userData.isAlive = false;
            this.particles.spawnExplosion(gt.position, 3.5);
            this.missionManager.recordGroundKill(1500);
            this.addTrauma(0.3);
            this.soundManager.speakRadioChatter(
              `Ground defense ${gt.userData.name} neutralized!`,
              'AWACS',
              (sub) => this.hud.showRadioSubtitle(sub)
            );
          }
        });
      }

      // 9. Update VFX Particles
      this.particles.update(dt, this.enemySquadron, (enemy, dmg) => {
        const destroyed = this.enemySquadron.damageEnemy(enemy, dmg);
        if (destroyed) {
          this.missionManager.recordAirKill(enemy.isBoss);
          this.addTrauma(0.25);
        }
      });

      // 10. Update HUD (with Tone Alert synchronization)
      this.hud.update(
        this.physics,
        this.combatSystem,
        this.missionManager,
        this.enemySquadron,
        this.environment.groundTargetsGroup,
        dt,
        this.soundManager
      );

      // 11. Camera Trauma / Screen Shake
      if (this.trauma > 0) {
        const shake = this.trauma * this.trauma;
        this.camera.position.x += (Math.random() - 0.5) * shake * 1.5;
        this.camera.position.y += (Math.random() - 0.5) * shake * 1.5;
        this.camera.position.z += (Math.random() - 0.5) * shake * 1.5;
        this.trauma = Math.max(0, this.trauma - dt * 0.85);
      }

      // 12. Victory Condition
      if (this.missionManager.isVictory) {
        this.soundManager.speakRadioChatter(
          'Airspace cleared! Outstanding job Viper-1, mission accomplished!',
          'AWACS',
          (sub) => this.hud.showRadioSubtitle(sub)
        );
        this.showDebriefModal();
      }
    }

    this.composer.render();
  }

  showDebriefModal() {
    this.gameState = 'DEBRIEF';
    document.getElementById('combat-hud').classList.add('hidden');
    const debrief = document.getElementById('debrief-overlay');
    debrief.classList.remove('hidden');

    const badge = document.getElementById('debrief-outcome-badge');
    const title = document.getElementById('debrief-mission-title');

    if (this.missionManager.isVictory) {
      badge.textContent = 'MISSION SUCCESS // AIRSPACE SECURED';
      badge.className = 'outcome-badge victory';
    } else {
      badge.textContent = 'AIRCRAFT LOST // MISSION FAILED';
      badge.className = 'outcome-badge defeat';
    }

    if (title) title.textContent = `OPERATION: ${this.selectedMission.name.toUpperCase()}`;

    const totalKills = `${this.missionManager.airKills + this.missionManager.groundKills} / ${this.missionManager.targetAirKills + this.missionManager.targetGroundKills}`;
    document.getElementById('d-kills').textContent = totalKills;
    document.getElementById('d-time').textContent = this.missionManager.getFormattedTime();
    document.getElementById('d-score').textContent = this.missionManager.score.toLocaleString();
    document.getElementById('d-xp').textContent = `+${this.missionManager.xpAwarded} XP`;
    document.getElementById('d-credits').textContent = `+${this.missionManager.creditsAwarded} CR`;

    // Persist Credits & XP Rewards
    this.profile.credits = (this.profile.credits || 0) + this.missionManager.creditsAwarded;
    this.profile.xp = (this.profile.xp || 0) + this.missionManager.xpAwarded;
    SaveSystem.saveProfile(this.profile);
    if (this.hangarUI) {
      this.hangarUI.updateCreditsDisplay();
    }
  }
}

// Start application
window.addEventListener('DOMContentLoaded', () => {
  new SkyDominatorApp();
});
