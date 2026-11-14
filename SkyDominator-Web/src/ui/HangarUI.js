import { AIRCRAFT_ROSTER, SKINS_PALETTE } from '../core/AircraftData.js';
import { MISSIONS } from '../core/Missions.js';

/**
 * Interactive 3D Hangar Bay & Customization UI Controller
 */
export class HangarUI {
  constructor(onSelectAircraft, onSelectSkin, onSelectMission, onSelectDifficulty, onLaunchMission) {
    this.onSelectAircraft = onSelectAircraft;
    this.onSelectSkin = onSelectSkin;
    this.onSelectMission = onSelectMission;
    this.onSelectDifficulty = onSelectDifficulty;
    this.onLaunchMission = onLaunchMission;

    this.currentAircraftIndex = 0;
    this.currentMissionIndex = 0;
    this.currentSkin = 'stealth';
    this.currentDifficulty = 'normal';
    this.isTestThrust = false;

    this.initDOM();
  }

  initDOM() {
    this.cardsWrapper = document.getElementById('aircraft-cards-wrapper');
    this.nameElem = document.getElementById('aircraft-name');
    this.classElem = document.getElementById('aircraft-class');
    this.loreElem = document.getElementById('aircraft-lore');

    this.valSpeed = document.getElementById('val-speed');
    this.barSpeed = document.getElementById('bar-speed');
    this.valAgility = document.getElementById('val-agility');
    this.barAgility = document.getElementById('bar-agility');
    this.valArmor = document.getElementById('val-armor');
    this.barArmor = document.getElementById('bar-armor');
    this.valRadar = document.getElementById('val-radar');
    this.barRadar = document.getElementById('bar-radar');

    this.abilityName = document.getElementById('ability-name');
    this.abilityDesc = document.getElementById('ability-desc');

    // Populate 12 Aircraft Cards in Carousel
    if (this.cardsWrapper) {
      let html = '';
      AIRCRAFT_ROSTER.forEach((ac, idx) => {
        html += `
          <div class="aircraft-card ${idx === 0 ? 'active' : ''}" data-index="${idx}">
            <div class="card-id">A-${(idx + 1).toString().padStart(2, '0')}</div>
            <div class="card-name">${ac.name}</div>
            <div class="card-class">${ac.class}</div>
          </div>
        `;
      });
      this.cardsWrapper.innerHTML = html;

      this.cardsWrapper.querySelectorAll('.aircraft-card').forEach(card => {
        card.addEventListener('click', () => {
          const idx = parseInt(card.dataset.index);
          this.selectAircraftIndex(idx);
        });
      });
    }

    // Prev / Next Arrows
    const btnPrev = document.getElementById('btn-prev-aircraft');
    const btnNext = document.getElementById('btn-next-aircraft');
    if (btnPrev) btnPrev.addEventListener('click', () => this.selectAircraftIndex(this.currentAircraftIndex - 1));
    if (btnNext) btnNext.addEventListener('click', () => this.selectAircraftIndex(this.currentAircraftIndex + 1));

    // Skin Buttons
    document.querySelectorAll('.skin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.skin-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentSkin = btn.dataset.skin;
        this.onSelectSkin(SKINS_PALETTE[this.currentSkin]);
      });
    });

    // Difficulty Selector Buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentDifficulty = btn.dataset.diff;
        if (this.onSelectDifficulty) {
          this.onSelectDifficulty(this.currentDifficulty);
        }
      });
    });

    // Populate Mission Select Dropdown
    const missionSelect = document.getElementById('hangar-mission-select');
    if (missionSelect) {
      missionSelect.innerHTML = MISSIONS.map((m, idx) => `
        <option value="${idx}">OPERATION: ${m.name.toUpperCase()} [${m.city.toUpperCase()}]</option>
      `).join('');

      missionSelect.addEventListener('change', (e) => {
        this.currentMissionIndex = parseInt(e.target.value);
        this.updateMissionDetails();
        if (this.onSelectMission) {
          this.onSelectMission(MISSIONS[this.currentMissionIndex]);
        }
      });
    }

    // Test Thrust Button
    const btnTestThrust = document.getElementById('btn-toggle-engine');
    if (btnTestThrust) {
      btnTestThrust.addEventListener('click', () => {
        this.isTestThrust = !this.isTestThrust;
        btnTestThrust.classList.toggle('active', this.isTestThrust);
      });
    }

    // Launch Mission Button
    const btnLaunch = document.getElementById('btn-launch-mission');
    if (btnLaunch) {
      btnLaunch.addEventListener('click', () => {
        this.onLaunchMission(
          AIRCRAFT_ROSTER[this.currentAircraftIndex],
          SKINS_PALETTE[this.currentSkin],
          MISSIONS[this.currentMissionIndex],
          this.currentDifficulty
        );
      });
    }

    this.updatePanelData();
    this.updateMissionDetails();
  }

  selectAircraftIndex(idx) {
    if (idx < 0) idx = AIRCRAFT_ROSTER.length - 1;
    if (idx >= AIRCRAFT_ROSTER.length) idx = 0;

    this.currentAircraftIndex = idx;

    if (this.cardsWrapper) {
      const cards = this.cardsWrapper.querySelectorAll('.aircraft-card');
      cards.forEach((c, i) => {
        c.classList.toggle('active', i === idx);
        if (i === idx) c.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      });
    }

    this.updatePanelData();
    this.onSelectAircraft(AIRCRAFT_ROSTER[this.currentAircraftIndex], SKINS_PALETTE[this.currentSkin]);
  }

  updatePanelData() {
    const ac = AIRCRAFT_ROSTER[this.currentAircraftIndex];
    if (!ac) return;

    if (this.nameElem) this.nameElem.textContent = ac.name.toUpperCase();
    if (this.classElem) this.classElem.textContent = ac.class.toUpperCase();
    if (this.loreElem) this.loreElem.textContent = ac.lore;

    if (this.valSpeed) this.valSpeed.textContent = `MACH ${ac.topSpeedMach}`;
    if (this.barSpeed) this.barSpeed.style.width = `${(ac.topSpeedMach / 4.2) * 100}%`;

    if (this.valAgility) this.valAgility.textContent = `${ac.agility}%`;
    if (this.barAgility) this.barAgility.style.width = `${ac.agility}%`;

    if (this.valArmor) this.valArmor.textContent = `${ac.armorHP} HP`;
    if (this.barArmor) this.barArmor.style.width = `${(ac.armorHP / 3000) * 100}%`;

    if (this.valRadar) this.valRadar.textContent = `${ac.radarRangeKm} KM`;
    if (this.barRadar) this.barRadar.style.width = `${(ac.radarRangeKm / 50) * 100}%`;

    if (this.abilityName) this.abilityName.textContent = ac.abilityName;
    if (this.abilityDesc) this.abilityDesc.textContent = ac.abilityDesc;
  }

  updateMissionDetails() {
    const m = MISSIONS[this.currentMissionIndex];
    if (!m) return;

    const descElem = document.getElementById('hangar-mission-desc');
    const diffElem = document.getElementById('hangar-mission-diff');
    const rewardsElem = document.getElementById('hangar-mission-rewards');

    if (descElem) descElem.textContent = m.description;
    if (diffElem) diffElem.textContent = `DIFFICULTY: ${m.difficulty.toUpperCase()} | WEATHER: ${m.weather.toUpperCase()}`;
    if (rewardsElem) rewardsElem.textContent = `REWARD: +${m.rewardCredits.toLocaleString()} CR | +${m.rewardXP.toLocaleString()} XP`;
  }
}
