/**
 * Multi-Stage Mission & Objectives Progression Manager (Air & Ground Strikes)
 */
export class MissionManager {
  constructor() {
    this.isActive = false;
    this.missionTime = 0;
    this.score = 0;
    this.kills = 0;
    this.totalEnemies = 5;

    // Ground targets tracking
    this.groundTargetsDestroyed = 0;
    this.requiredGroundTargets = 3;
    this.totalGroundTargets = 0;

    this.isVictory = false;
    this.isDefeat = false;

    // Player condition
    this.maxHealth = 1000;
    this.health = 1000;
    this.maxShield = 300;
    this.shield = 300;

    // Rewards
    this.creditsAwarded = 2500;
    this.xpAwarded = 1000;
  }

  startMission(totalAirEnemies = 5, missionData = null) {
    this.isActive = true;
    this.missionTime = 0;
    this.score = 0;
    this.kills = 0;
    this.totalEnemies = totalAirEnemies;

    this.groundTargetsDestroyed = 0;
    this.totalGroundTargets = missionData?.groundTargets?.length || 0;
    this.requiredGroundTargets = missionData?.primaryGroundTargetCount || Math.min(3, this.totalGroundTargets);

    this.isVictory = false;
    this.isDefeat = false;

    this.health = this.maxHealth;
    this.shield = this.maxShield;
  }

  update(dt, aliveAirCount, aliveGroundCount = 0) {
    if (!this.isActive || this.isVictory || this.isDefeat) return;

    this.missionTime += dt;
    this.kills = this.totalEnemies - aliveAirCount;
    this.groundTargetsDestroyed = this.totalGroundTargets - aliveGroundCount;

    // Victory Check: Both Ground Targets and Air Wing must be neutralized
    const groundDone = (this.totalGroundTargets === 0) || (this.groundTargetsDestroyed >= this.requiredGroundTargets);
    const airDone = (aliveAirCount === 0);

    if (groundDone && airDone && !this.isVictory) {
      this.isVictory = true;
      this.isActive = false;
      this.score += 6000; // Multi-stage victory bonus
    }

    // Shield passive recharge
    if (this.shield < this.maxShield && this.health > 0) {
      this.shield = Math.min(this.maxShield, this.shield + 15 * dt);
    }
  }

  recordEnemyKill(isBoss = false) {
    const pts = isBoss ? 2500 : 800;
    this.score += pts;
  }

  recordGroundTargetKill(type = 'SAM') {
    const pts = type === 'BUNKER' ? 1500 : (type === 'RADAR' ? 1200 : 900);
    this.score += pts;
  }

  applyDamageToPlayer(damage) {
    if (this.isDefeat || !this.isActive) return;

    if (this.shield > 0) {
      if (this.shield >= damage) {
        this.shield -= damage;
        damage = 0;
      } else {
        damage -= this.shield;
        this.shield = 0;
      }
    }

    if (damage > 0) {
      this.health = Math.max(0, this.health - damage);
      if (this.health <= 0) {
        this.isDefeat = true;
        this.isActive = false;
      }
    }
  }

  getObjectiveStatusText() {
    const groundNeeded = this.requiredGroundTargets;
    const groundDone = this.groundTargetsDestroyed;

    if (groundDone < groundNeeded && this.totalGroundTargets > 0) {
      return `PRIMARY: DESTROY SAM / RADAR BASES (${groundDone}/${groundNeeded}) // SEC: AIR COMBAT (${this.kills}/${this.totalEnemies})`;
    }
    return `PRIMARY: ELIMINATE HOSTILE FIGHTER SQUADRON (${this.kills}/${this.totalEnemies}) // AIR DEFENSE NEUTRALIZED`;
  }

  getFormattedTime() {
    const mins = Math.floor(this.missionTime / 60);
    const secs = Math.floor(this.missionTime % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
