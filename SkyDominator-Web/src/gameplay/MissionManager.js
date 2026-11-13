/**
 * Mission & Objectives Progression Manager
 */
export class MissionManager {
  constructor() {
    this.isActive = false;
    this.missionTime = 0;
    this.score = 0;
    this.kills = 0;
    this.totalEnemies = 5;
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

  startMission() {
    this.isActive = true;
    this.missionTime = 0;
    this.score = 0;
    this.kills = 0;
    this.isVictory = false;
    this.isDefeat = false;

    this.health = this.maxHealth;
    this.shield = this.maxShield;
  }

  update(dt, aliveEnemiesCount) {
    if (!this.isActive || this.isVictory || this.isDefeat) return;

    this.missionTime += dt;
    this.kills = this.totalEnemies - aliveEnemiesCount;

    // Victory Check: All 5 enemies destroyed
    if (aliveEnemiesCount === 0 && !this.isVictory) {
      this.isVictory = true;
      this.isActive = false;
      this.score += 5000; // Mission completion bonus
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

  applyDamageToPlayer(damage) {
    if (this.isDefeat || !this.isActive) return;

    // Shield absorption first
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

  getFormattedTime() {
    const mins = Math.floor(this.missionTime / 60);
    const secs = Math.floor(this.missionTime % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

