/**
 * Mission Objectives, 3-Wave Progression, Scoring & Rewards
 */
export class MissionManager {
  constructor(missionConfig = null) {
    this.config = missionConfig;
    this.isVictory = false;
    this.isDefeat = false;

    this.currentWaveIndex = 0;
    this.totalWaves = 3;

    this.airKills = 0;
    this.groundKills = 0;
    this.targetAirKills = 10;
    this.targetGroundKills = 4;

    this.score = 0;
    this.xpAwarded = 0;
    this.creditsAwarded = 0;

    this.startTime = performance.now();
    this.waveTitle = 'WAVE 1 // VANGUARD';

    if (missionConfig) {
      this.setMission(missionConfig);
    }
  }

  setMission(missionConfig) {
    this.config = missionConfig;
    this.isVictory = false;
    this.isDefeat = false;
    this.currentWaveIndex = 0;
    this.totalWaves = missionConfig.waves ? missionConfig.waves.length : 3;

    this.airKills = 0;
    this.groundKills = 0;
    this.targetAirKills = missionConfig.targetAirKills || 10;
    this.targetGroundKills = missionConfig.targetGroundKills || (missionConfig.groundTargets ? missionConfig.groundTargets.length : 4);

    this.score = 0;
    this.startTime = performance.now();
    this.updateWaveTitle();
  }

  getCurrentWaveConfig() {
    if (this.config && this.config.waves && this.config.waves[this.currentWaveIndex]) {
      return this.config.waves[this.currentWaveIndex];
    }
    return { wave: this.currentWaveIndex + 1, enemies: 4, boss: this.currentWaveIndex === 2 };
  }

  updateWaveTitle() {
    const wave = this.getCurrentWaveConfig();
    this.waveTitle = wave.title || `WAVE ${this.currentWaveIndex + 1} OF ${this.totalWaves}`;
  }

  recordAirKill(isBoss = false) {
    this.airKills++;
    this.score += isBoss ? 5000 : 1200;
  }

  recordGroundKill(points = 1500) {
    this.groundKills++;
    this.score += points;
    this.checkCompletion();
  }

  checkWaveAdvance(aliveEnemyCount, onAdvanceWave) {
    if (aliveEnemyCount === 0 && !this.isVictory && !this.isDefeat) {
      if (this.currentWaveIndex < this.totalWaves - 1) {
        this.currentWaveIndex++;
        this.updateWaveTitle();
        if (onAdvanceWave) {
          onAdvanceWave(this.getCurrentWaveConfig());
        }
      } else {
        this.checkCompletion();
      }
    }
  }

  setDefeat() {
    this.isDefeat = true;
    this.xpAwarded = 350;
    this.creditsAwarded = 800;
  }

  checkCompletion() {
    const allWavesDone = (this.currentWaveIndex >= this.totalWaves - 1);
    const groundDone = (this.groundKills >= this.targetGroundKills);

    if (allWavesDone && groundDone) {
      this.isVictory = true;
      this.xpAwarded = this.config?.rewardXP || 1800;
      this.creditsAwarded = this.config?.rewardCredits || 5000;
    }
  }

  getObjectiveText() {
    const waveStr = `WAVE ${this.currentWaveIndex + 1}/${this.totalWaves}`;
    const airStr = `AIR: ${this.airKills}/${this.targetAirKills}`;
    const gndStr = `SAM/RADAR: ${this.groundKills}/${this.targetGroundKills}`;
    return `${waveStr} | ${airStr} | ${gndStr}`;
  }

  getFormattedTime() {
    const elapsed = Math.floor((performance.now() - this.startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
