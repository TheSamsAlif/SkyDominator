import { AIRCRAFT_ROSTER, SKINS_PALETTE } from '../core/AircraftData.js';

/**
 * Interactive 3D Hangar Bay & Customization UI Controller
 */
export class HangarUI {
  constructor(onSelectAircraft, onSelectSkin, onLaunchMission) {
    this.onSelectAircraft = onSelectAircraft;
    this.onSelectSkin = onSelectSkin;
    this.onLaunchMission = onLaunchMission;

    this.currentIndex = 0;
    this.currentSkin = 'stealth';
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

    // Populate 12 Aircraft Cards
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

      // Card click events
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
    if (btnPrev) btnPrev.addEventListener('click', () => this.selectAircraftIndex(this.currentIndex - 1));
    if (btnNext) btnNext.addEventListener('click', () => this.selectAircraftIndex(this.currentIndex + 1));

    // Skin Buttons
    document.querySelectorAll('.skin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.skin-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentSkin = btn.dataset.skin;
        this.onSelectSkin(SKINS_PALETTE[this.currentSkin]);
      });
    });

    // Test Thrust Button
    const btnTestThrust = document.getElementById('btn-toggle-engine');
    if (btnTestThrust) {
      btnTestThrust.addEventListener('click', () => {
        this.isTestThrust = !this.isTestThrust;
        btnTestThrust.style.background = this.isTestThrust ? 'var(--orange-accent)' : '';
      });
    }

    // Launch Button
    const btnLaunch = document.getElementById('btn-launch-mission');
    if (btnLaunch) {
      btnLaunch.addEventListener('click', () => {
        this.onLaunchMission(AIRCRAFT_ROSTER[this.currentIndex], SKINS_PALETTE[this.currentSkin]);
      });
    }

    this.updatePanelData();
  }

  selectAircraftIndex(idx) {
    if (idx < 0) idx = AIRCRAFT_ROSTER.length - 1;
    if (idx >= AIRCRAFT_ROSTER.length) idx = 0;

    this.currentIndex = idx;

    // Highlight card
    if (this.cardsWrapper) {
      const cards = this.cardsWrapper.querySelectorAll('.aircraft-card');
      cards.forEach((c, i) => {
        c.classList.toggle('active', i === idx);
        if (i === idx) c.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      });
    }

    this.updatePanelData();
    this.onSelectAircraft(AIRCRAFT_ROSTER[this.currentIndex], SKINS_PALETTE[this.currentSkin]);
  }

  updatePanelData() {
    const ac = AIRCRAFT_ROSTER[this.currentIndex];
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
}

