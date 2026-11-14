export const MISSIONS = [
  {
    id: 'dubai_air_superiority',
    name: 'Operation Mirage Shield',
    city: 'Dubai',
    weather: 'sunset',
    description: 'Hostile fighters and fortified coastal SAM sites threat Burj Khalifa. Neutralize air defense and hostile wings.',
    difficulty: 'Normal',
    flightCeiling: 3200,
    radarRange: 7500,
    skyColor: 0x1a0f1e,
    ambientColor: 0x3d2638,
    fogColor: 0x221326,
    fogDensity: 0.00018,
    sunPosition: [2800, 1100, 3200],
    sunColor: 0xffaa55,
    citySpread: 4500,
    targetAirKills: 8,
    targetGroundKills: 4,
    waves: [
      { wave: 1, title: 'WAVE 1 // VANGUARD PATROL', enemies: 3, boss: false },
      { wave: 2, title: 'WAVE 2 // STRIKE REINFORCEMENTS', enemies: 4, boss: false },
      { wave: 3, title: 'WAVE 3 // ACE SQUADRON [VIPER HUNTERS]', enemies: 3, boss: true }
    ],
    groundTargets: [
      { id: 'sam_1', type: 'sam', position: [800, 0, 900], name: 'SAM Site Alpha', health: 250 },
      { id: 'sam_2', type: 'sam', position: [-950, 0, 1200], name: 'SAM Site Bravo', health: 250 },
      { id: 'radar_1', type: 'radar', position: [400, 0, 1800], name: 'Coastal Radar Dome', health: 300 },
      { id: 'fuel_1', type: 'fuel', position: [-400, 0, 600], name: 'Fuel Reserve Depot', health: 200 }
    ],
    rewardCredits: 4500,
    rewardXP: 1400
  },
  {
    id: 'tokyo_night_intercept',
    name: 'Neon Fortress Intercept',
    city: 'Tokyo',
    weather: 'night',
    description: 'Night intercept mission. Stealth enemy squadron detected navigating through Tokyo tower grid with radar stations.',
    difficulty: 'Hard',
    flightCeiling: 3000,
    radarRange: 8000,
    skyColor: 0x02050c,
    ambientColor: 0x0d1626,
    fogColor: 0x030814,
    fogDensity: 0.00022,
    sunPosition: [-2800, 400, -2200],
    sunColor: 0x3366cc,
    citySpread: 5000,
    targetAirKills: 10,
    targetGroundKills: 5,
    waves: [
      { wave: 1, title: 'WAVE 1 // STEALTH INTRUDERS', enemies: 3, boss: false },
      { wave: 2, title: 'WAVE 2 // HEAVY INTERCEPT SQUAD', enemies: 4, boss: false },
      { wave: 3, title: 'WAVE 3 // APEX SHADOW ACE [SHINOBI]', enemies: 4, boss: true }
    ],
    groundTargets: [
      { id: 'sam_tokyo_1', type: 'sam', position: [600, 0, -800], name: 'SAM Unit Kilo', health: 250 },
      { id: 'sam_tokyo_2', type: 'sam', position: [-800, 0, -1100], name: 'SAM Unit Victor', health: 250 },
      { id: 'radar_tokyo', type: 'radar', position: [1100, 0, 700], name: 'Bay Radar Tower', health: 300 },
      { id: 'bunker_1', type: 'bunker', position: [-300, 0, -1600], name: 'Command Center', health: 400 },
      { id: 'fuel_tokyo', type: 'fuel', position: [200, 0, -1300], name: 'Industrial Fuel Silo', health: 200 }
    ],
    rewardCredits: 5800,
    rewardXP: 1900
  },
  {
    id: 'dhaka_monsoon_strike',
    name: 'Thunderbolt Over Padma',
    city: 'Dhaka',
    weather: 'monsoon',
    description: 'Dense monsoon skies with low cloud deck and lightning. Eliminate hostile SAM batteries and ground radars.',
    difficulty: 'Normal',
    flightCeiling: 2800,
    radarRange: 7000,
    skyColor: 0x0a121c,
    ambientColor: 0x1f2e3d,
    fogColor: 0x121b28,
    fogDensity: 0.00034,
    sunPosition: [1200, 1400, 1000],
    sunColor: 0xaabbcc,
    citySpread: 4200,
    targetAirKills: 8,
    targetGroundKills: 4,
    waves: [
      { wave: 1, title: 'WAVE 1 // RAIN SQUALL VANGUARD', enemies: 3, boss: false },
      { wave: 2, title: 'WAVE 2 // MONSOON STRIKE FORCE', enemies: 3, boss: false },
      { wave: 3, title: 'WAVE 3 // STORM ACE COMMANDER', enemies: 3, boss: true }
    ],
    groundTargets: [
      { id: 'sam_dhaka_1', type: 'sam', position: [750, 0, 500], name: 'Padma SAM Defense', health: 250 },
      { id: 'sam_dhaka_2', type: 'sam', position: [-600, 0, 950], name: 'Bridge Guard SAM', health: 250 },
      { id: 'radar_dhaka', type: 'radar', position: [0, 0, 1500], name: 'Air Surveillance Station', health: 300 },
      { id: 'fuel_dhaka', type: 'fuel', position: [-500, 0, 400], name: 'Substation Depot', health: 200 }
    ],
    rewardCredits: 4800,
    rewardXP: 1550
  },
  {
    id: 'new_york_coastal_defense',
    name: 'Liberty Aegis',
    city: 'New York',
    weather: 'sunrise',
    description: 'High-threat naval incursion near Manhattan. Coordinate air-to-ground strikes on radar hubs and dogfight top aces.',
    difficulty: 'Hard',
    flightCeiling: 3500,
    radarRange: 8500,
    skyColor: 0x121e2e,
    ambientColor: 0x2e3c4e,
    fogColor: 0x182436,
    fogDensity: 0.00019,
    sunPosition: [3200, 1600, -2600],
    sunColor: 0xffe2aa,
    citySpread: 5500,
    targetAirKills: 10,
    targetGroundKills: 4,
    waves: [
      { wave: 1, title: 'WAVE 1 // HARBOR PATROL', enemies: 3, boss: false },
      { wave: 2, title: 'WAVE 2 // MANHATTAN INTERCEPT WING', enemies: 4, boss: false },
      { wave: 3, title: 'WAVE 3 // ATLANTIC FLEET ACE [TITAN]', enemies: 4, boss: true }
    ],
    groundTargets: [
      { id: 'sam_ny_1', type: 'sam', position: [900, 0, 1300], name: 'Harbor SAM Battery', health: 250 },
      { id: 'sam_ny_2', type: 'sam', position: [-1200, 0, 800], name: 'Island SAM Defense', health: 250 },
      { id: 'radar_ny', type: 'radar', position: [500, 0, -1100], name: 'Sector EW Radar', health: 300 },
      { id: 'fuel_ny', type: 'fuel', position: [-700, 0, -900], name: 'Dockside Depot', health: 200 }
    ],
    rewardCredits: 6200,
    rewardXP: 2100
  },
  {
    id: 'singapore_strait_supremacy',
    name: 'Apex Strait Supremacy',
    city: 'Singapore',
    weather: 'overcast',
    description: 'Final showdown over Marina Strait. Heavy enemy squadron with integrated long-range SAM network.',
    difficulty: 'Apex Master',
    flightCeiling: 3600,
    radarRange: 9000,
    skyColor: 0x06111f,
    ambientColor: 0x1a293d,
    fogColor: 0x0a1626,
    fogDensity: 0.00021,
    sunPosition: [-2400, 1800, 2600],
    sunColor: 0xffe6c2,
    citySpread: 5200,
    targetAirKills: 12,
    targetGroundKills: 5,
    waves: [
      { wave: 1, title: 'WAVE 1 // STRAIT GUARDIANS', enemies: 4, boss: false },
      { wave: 2, title: 'WAVE 2 // HEAVY MARITIME ASSAULT', enemies: 4, boss: false },
      { wave: 3, title: 'WAVE 3 // APEX DOMINATOR ELITE SQUADRON', enemies: 5, boss: true }
    ],
    groundTargets: [
      { id: 'sam_sg_1', type: 'sam', position: [850, 0, 600], name: 'Strait SAM Platform A', health: 300 },
      { id: 'sam_sg_2', type: 'sam', position: [-900, 0, 950], name: 'Strait SAM Platform B', health: 300 },
      { id: 'sam_sg_3', type: 'sam', position: [300, 0, 1800], name: 'Marina SAM Battery', health: 300 },
      { id: 'radar_sg', type: 'radar', position: [-400, 0, 1400], name: 'Primary Phased Array', health: 350 },
      { id: 'fuel_sg', type: 'fuel', position: [600, 0, -700], name: 'Refinery Fuel Tank', health: 250 }
    ],
    rewardCredits: 8500,
    rewardXP: 3000
  }
];
