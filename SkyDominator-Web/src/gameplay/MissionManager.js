/**
 * Mission Objectives, Scoring & Progression System
 */
export class MissionManager {
  constructor(missionConfig = null) {
    this.config = missionConfig;
    this.isVictory = false;
    this.isDefeat = false;

    this.airKills = 0;
    this.groundKills = 0;
    this.targetAirKills = missionConfig?.targetAirKills || 6;
    this.targetGroundKills = missionConfig?.targetGroundKills || 4;

    this.score = 0;
    this.xpAwarded = 0;
    this.creditsAwarded = 0;

    this.startTime = performance.now();
    this.elapsedSeconds = 0;
  }

  setMission(missionConfig) {
    this.config = missionConfig;
    this.isVictory = false;
    this.isDefeat = false;
    this.airKills = 0;
    this.groundKills = 0;
    this.targetAirKills = missionConfig.targetAirKills || 6;
    this.targetGroundKills = missionConfig.targetGroundKills || (missionConfig.groundTargets ? missionConfig.groundTargets.length : 0);
    this.score = 0;
    this.startTime = performance.now();
  }

  recordAirKill(isBoss = false) {
    this.airKills++;
    this.score += isBoss ? 4500 : 1200;
    this.checkCompletion();
  }

  recordGroundKill(points = 1500) {
    this.groundKills++;
    this.score += points;
    this.checkCompletion();
  }

  setDefeat() {
    this.isDefeat = true;
    this.xpAwarded = 250;
    this.creditsAwarded = 500;
  }

  checkCompletion() {
    if (this.airKills >= this.targetAirKills && this.groundKills >= this.targetGroundKills) {
      this.isVictory = true;
      this.xpAwarded = this.config?.rewardXP || 1500;
      this.creditsAwarded = this.config?.rewardCredits || 4000;
    }
  }

  getObjectiveText() {
    const air = `FIGHTERS: ${this.airKills}/${this.targetAirKills}`;
    const gnd = `SAM/RADAR: ${this.groundKills}/${this.targetGroundKills}`;
    return `${air} | ${gnd}`;
  }

  getFormattedTime() {
    const elapsed = Math.floor((performance.now() - this.startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
