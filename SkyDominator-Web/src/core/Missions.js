// 5 city missions: each has its own sky, skyline, weather, ground targets and enemy squadron
const E = (name, cls, hp, speed, color, n = 1, boss = false) => ({ name, cls, hp, speed, color, n, boss });
const G = (id, type, name, hp, x, z, y = 14) => ({ id, type, name, hp, maxHp: hp, x, z, y, isDead: false });

export const MISSIONS = [
  {
    id: 'DXB',
    city: 'DUBAI',
    op: 'OPERATION DESERT FALCON',
    brief: 'Neutralize coastal SAM air defense sites, then clear the hostile 5th-gen fighter wing over the Gulf skyline.',
    sky: 0xf0a060, fog: 0xd8905a, fogD: 0.00022, sun: 0xffc080, land: 0xb89a62, water: 0x0b4a63, night: false,
    bld: { count: 520, minH: 60, maxH: 380, area: 3200, palette: [0xcfd8e0, 0xa8c4d8, 0x8fb0c8, 0xe8d8b8], coast: true },
    spire: { h: 620, color: 0xd9e4ee },
    groundTargets: [
      G('dxb_sam_1', 'SAM', 'SAM SITE DELTA', 350, 450, 600),
      G('dxb_sam_2', 'SAM', 'SAM SITE OMEGA', 350, -650, 950),
      G('dxb_sam_3', 'SAM', 'SAM SITE ZETA', 350, 150, 1400),
      G('dxb_radar_1', 'RADAR', 'GULF RADAR STATION', 400, -300, 1800),
      G('dxb_fuel_1', 'FUEL', 'OIL REFINERY DEPOT', 500, 800, 1100),
      G('dxb_fuel_2', 'FUEL', 'COASTAL FUEL TANK', 500, -850, 500)
    ],
    primaryGroundTargetCount: 3, // Player must destroy at least 3 SAM/ground targets
    enemies: [
      E('GHOST-9', 'Stealth Fighter', 420, 200, 0x2c3440, 3),
      E('KESTREL-X', 'Interceptor', 520, 215, 0x3a2e2e, 2),
      E('SANDSTORM ACE', 'Ace Boss', 1300, 250, 0x7a1010, 1, true)
    ]
  },
  {
    id: 'TYO',
    city: 'TOKYO',
    op: 'OPERATION NEON TYPHOON',
    brief: 'Night strike over Tokyo Bay. Neutralize bay defense SAM platforms and destroy the stealth fighter wing.',
    sky: 0x080a1c, fog: 0x14102e, fogD: 0.00035, sun: 0x7080ff, land: 0x14161f, water: 0x060b1c, night: true,
    bld: { count: 800, minH: 40, maxH: 300, area: 3600, palette: [0x2a2f45, 0x3a3558, 0x20283a], coast: true },
    spire: { h: 480, color: 0xff3a2a },
    groundTargets: [
      G('tyo_sam_1', 'SAM', 'BAY SAM BATTERY 1', 380, 500, 800),
      G('tyo_sam_2', 'SAM', 'BAY SAM BATTERY 2', 380, -600, 1100),
      G('tyo_sam_3', 'SAM', 'ISLAND SAM SITE', 380, 200, 1700),
      G('tyo_radar_1', 'RADAR', 'TOKYO BAY RADOME', 420, -400, 2000),
      G('tyo_bunker_1', 'BUNKER', 'COMMAND BUNKER', 600, 700, 1500),
      G('tyo_fuel_1', 'FUEL', 'HARBOR FUEL DEPOT', 500, -750, 700)
    ],
    primaryGroundTargetCount: 3,
    enemies: [
      E('GHOST-9', 'Stealth Fighter', 450, 205, 0x1a1e2a, 4),
      E('VIPER-7', 'Strike Fighter', 620, 195, 0x2a1030, 2),
      E('NEON REAPER', 'Ace Boss', 1500, 255, 0x600060, 1, true)
    ]
  },
  {
    id: 'DAC',
    city: 'DHAKA',
    op: 'OPERATION PADMA SHIELD',
    brief: 'Hazy dusk over the Buriganga. Neutralize river defense radar installations and repel the strike package.',
    sky: 0x8a7a6a, fog: 0x9a8a78, fogD: 0.0004, sun: 0xffb070, land: 0x4a5a3a, water: 0x4a5a45, night: false,
    bld: { count: 900, minH: 25, maxH: 160, area: 3800, palette: [0xb0a090, 0x9a8a7a, 0xc4b8a0, 0x8a7a70], coast: false },
    spire: { h: 220, color: 0xe8e0d0 },
    groundTargets: [
      G('dac_sam_1', 'SAM', 'BURIGANGA AIR DEFENSE', 360, 350, 750),
      G('dac_sam_2', 'SAM', 'SADARGHAT SAM SITE', 360, -450, 1050),
      G('dac_radar_1', 'RADAR', 'DELTA RADAR TOWER', 420, 100, 1600),
      G('dac_radar_2', 'RADAR', 'NORTH SHIELD RADAR', 420, -500, 1900),
      G('dac_fuel_1', 'FUEL', 'RIVER OIL RESERVE', 500, 650, 1200),
      G('dac_bunker_1', 'BUNKER', 'FORWARD AMMO DEPOT', 550, -250, 1400)
    ],
    primaryGroundTargetCount: 3,
    enemies: [
      E('KESTREL-X', 'Interceptor', 480, 205, 0x33402e, 5),
      E('VIPER-7', 'Strike Fighter', 650, 195, 0x2a2a2a, 2),
      E('RIVER WRAITH', 'Ace Boss', 1500, 255, 0x802010, 1, true)
    ]
  },
  {
    id: 'NYC',
    city: 'NEW YORK',
    op: 'OPERATION IRON HARBOR',
    brief: 'Dawn fog over Manhattan. Obliterate harbor SAM fortifications before neutralizing converging squadrons.',
    sky: 0x8aa0b8, fog: 0x9ab0c4, fogD: 0.0003, sun: 0xfff0d8, land: 0x2e3238, water: 0x1c3a52, night: false,
    bld: { count: 850, minH: 50, maxH: 420, area: 2800, palette: [0x6a7480, 0x586270, 0x7a8490, 0x484e5a], coast: true },
    spire: { h: 520, color: 0xb8c0cc },
    groundTargets: [
      G('nyc_sam_1', 'SAM', 'HARBOR FORTRESS SAM', 400, 400, 900),
      G('nyc_sam_2', 'SAM', 'LIBERTY ISLAND SAM', 400, -550, 1250),
      G('nyc_sam_3', 'SAM', 'HUDSON SHORE BATTERY', 400, 200, 1750),
      G('nyc_radar_1', 'RADAR', 'HARBOR SURVEILLANCE RADAR', 450, -350, 2100),
      G('nyc_fuel_1', 'FUEL', 'INDUSTRIAL FUEL STORAGE', 550, 750, 1300),
      G('nyc_bunker_1', 'BUNKER', 'COAST GUARD HQ BUNKER', 650, -150, 1550)
    ],
    primaryGroundTargetCount: 3,
    enemies: [
      E('GHOST-9', 'Stealth Fighter', 480, 210, 0x25303c, 5),
      E('KESTREL-X', 'Interceptor', 560, 220, 0x302530, 3),
      E('IRON TALON', 'Ace Boss', 1800, 260, 0x500000, 1, true)
    ]
  },
  {
    id: 'SIN',
    city: 'SINGAPORE',
    op: 'OPERATION STORM STRAIT',
    brief: 'Tropical storm over the strait. Demolish offshore SAM platforms then defeat the elite Black Wing squadron.',
    sky: 0x2a3640, fog: 0x34444e, fogD: 0.0005, sun: 0xa0c0d0, land: 0x1c3024, water: 0x10303c, night: false,
    bld: { count: 700, minH: 60, maxH: 340, area: 3000, palette: [0x70909a, 0x5a7a88, 0x8aa8b0], coast: true },
    spire: { h: 400, color: 0x9ad0e0 },
    groundTargets: [
      G('sin_sam_1', 'SAM', 'OFFSHORE PLATFORM 01', 420, 550, 850),
      G('sin_sam_2', 'SAM', 'OFFSHORE PLATFORM 02', 420, -500, 1150),
      G('sin_sam_3', 'SAM', 'ISLAND DEFENSE SAM', 420, 150, 1850),
      G('sin_radar_1', 'RADAR', 'STRAIT EARLY WARNING RADAR', 480, -300, 2200),
      G('sin_fuel_1', 'FUEL', 'PETROCHEMICAL TERMINAL', 600, 800, 1400),
      G('sin_bunker_1', 'BUNKER', 'COMMAND FORTRESS', 700, -200, 1600)
    ],
    primaryGroundTargetCount: 3,
    enemies: [
      E('GHOST-9', 'Stealth Fighter', 520, 215, 0x181c24, 6),
      E('VIPER-7', 'Strike Fighter', 700, 205, 0x241818, 3),
      E('BLACK WING LEAD', 'Ace Boss', 2400, 270, 0x100010, 2, true)
    ]
  }
];
