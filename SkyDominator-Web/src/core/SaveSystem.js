/**
 * Persistent Player Profile, Economy, Aircraft Unlocks & Upgrade Shop System
 * Backed by LocalStorage
 */
export class SaveSystem {
  static STORAGE_KEY = 'SKY_DOMINATOR_PROFILE_V1';

  static DEFAULT_PROFILE = {
    credits: 6500,
    xp: 0,
    rank: 'CAPTAIN [LVL 1]',
    unlockedAircraft: ['A01_ApexPhantom', 'A02_TitanBreaker'],
    upgrades: {
      armor: 0,   // +20% HP per level (Max 5)
      missiles: 0, // +2 max missiles per level (Max 4)
      flares: 0,   // +4 max flares per level (Max 4)
      boost: 0    // +25% boost energy recharge per level (Max 4)
    },
    settings: {
      quality: 'high', // 'low' | 'medium' | 'high'
      mouseSensitivity: 1.0,
      volume: 0.85,
      bloom: true
    },
    completedMissions: []
  };

  static loadProfile() {
    try {
      const data = localStorage.getItem(SaveSystem.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...SaveSystem.DEFAULT_PROFILE, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load profile from localStorage:', e);
    }
    return { ...SaveSystem.DEFAULT_PROFILE };
  }

  static saveProfile(profile) {
    try {
      localStorage.setItem(SaveSystem.STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save profile to localStorage:', e);
    }
  }

  static getUpgradeCost(type, currentLevel) {
    const baseCosts = {
      armor: 2000,
      missiles: 2500,
      flares: 1200,
      boost: 1800
    };
    return (baseCosts[type] || 1500) * (currentLevel + 1);
  }

  static getMaxLevel(type) {
    const maxLevels = {
      armor: 5,
      missiles: 4,
      flares: 4,
      boost: 4
    };
    return maxLevels[type] || 4;
  }
}

