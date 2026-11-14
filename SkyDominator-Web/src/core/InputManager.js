/**
 * Cross-Platform Unified Input Manager (Keyboard, Mouse, Touch, Gamepad)
 */
export class InputManager {
  constructor() {
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.throttleUp = false;
    this.throttleDown = false;
    this.boost = false;
    this.airbrake = false;

    // Weapons & Actions
    this.fireCannon = false;
    this.fireMissile = false;
    this.fireBomb = false;
    this.deployFlare = false;
    this.cycleCameraTriggered = false;
    this.pauseTriggered = false;

    this.mouseSensitivity = 1.0;

    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false };
    this.touchStick = { active: false, deltaX: 0, deltaY: 0 };
    this.isTouchDevice = false;

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Escape' || e.code === 'KeyP') {
        this.pauseTriggered = true;
      }
      if (e.code === 'KeyV') {
        this.cycleCameraTriggered = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      const rawX = (e.clientX - halfW) / halfW;
      const rawY = (e.clientY - halfH) / halfH;
      this.mouse.x = Math.max(-1.0, Math.min(1.0, rawX * this.mouseSensitivity));
      this.mouse.y = Math.max(-1.0, Math.min(1.0, rawY * this.mouseSensitivity));
    });

    window.addEventListener('mouseleave', () => {
      this.mouse.x = 0;
      this.mouse.y = 0;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouse.down = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
    });

    // Touch Support
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      this.isTouchDevice = true;
      const touchControlsElem = document.getElementById('mobile-touch-controls');
      if (touchControlsElem) {
        touchControlsElem.style.display = 'block';
      }
      this.setupTouchControls();
    }
  }

  setupTouchControls() {
    const stickZone = document.getElementById('virtual-flight-stick');
    const thumb = document.getElementById('touch-stick-thumb');

    if (stickZone && thumb) {
      const handleTouch = (touch) => {
        const rect = stickZone.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = (touch.clientX - centerX) / 50;
        let dy = (touch.clientY - centerY) / 50;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1.0) {
          dx /= dist;
          dy /= dist;
        }

        this.touchStick.deltaX = dx;
        this.touchStick.deltaY = dy;
        thumb.style.transform = `translate(${dx * 35}px, ${dy * 35}px)`;
      };

      stickZone.addEventListener('touchstart', (e) => {
        this.touchStick.active = true;
        handleTouch(e.touches[0]);
      }, { passive: false });

      stickZone.addEventListener('touchmove', (e) => {
        if (this.touchStick.active) {
          handleTouch(e.touches[0]);
        }
      }, { passive: false });

      const resetThumb = () => {
        this.touchStick.active = false;
        this.touchStick.deltaX = 0;
        this.touchStick.deltaY = 0;
        thumb.style.transform = `translate(0px, 0px)`;
      };

      stickZone.addEventListener('touchend', resetThumb);
      stickZone.addEventListener('touchcancel', resetThumb);
    }

    const bindTouchBtn = (id, onStart, onEnd) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); onStart(); }, { passive: false });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); onEnd(); }, { passive: false });
      }
    };

    bindTouchBtn('touch-btn-boost', () => { this.boost = true; }, () => { this.boost = false; });
    bindTouchBtn('touch-btn-brake', () => { this.airbrake = true; }, () => { this.airbrake = false; });
    bindTouchBtn('touch-btn-fire-cannon', () => { this.fireCannon = true; }, () => { this.fireCannon = false; });
    bindTouchBtn('touch-btn-fire-missile', () => { this.fireMissile = true; }, () => { this.fireMissile = false; });
    bindTouchBtn('touch-btn-bomb', () => { this.fireBomb = true; }, () => { this.fireBomb = false; });
    bindTouchBtn('touch-btn-flare', () => { this.deployFlare = true; }, () => { this.deployFlare = false; });
    bindTouchBtn('touch-btn-cam', () => { this.cycleCameraTriggered = true; }, () => {});
  }

  consumePauseTrigger() {
    const triggered = this.pauseTriggered;
    this.pauseTriggered = false;
    return triggered;
  }

  consumeCycleCamera() {
    const triggered = this.cycleCameraTriggered;
    this.cycleCameraTriggered = false;
    return triggered;
  }

  update() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (gp) {
      this.pitch = gp.axes[1];
      this.roll = -gp.axes[0];
      this.throttleUp = !!(gp.buttons[7] && gp.buttons[7].pressed);
      this.airbrake = !!(gp.buttons[6] && gp.buttons[6].pressed);
      this.yaw = (gp.buttons[5]?.pressed ? -1 : 0) + (gp.buttons[4]?.pressed ? 1 : 0);
      this.fireCannon = !!(gp.buttons[0] && gp.buttons[0].pressed);
      this.fireMissile = !!(gp.buttons[1] && gp.buttons[1].pressed);
      this.fireBomb = !!(gp.buttons[2] && gp.buttons[2].pressed);
      this.boost = !!(gp.buttons[10] && gp.buttons[10].pressed);
      return;
    }

    if (this.touchStick.active) {
      this.pitch = this.touchStick.deltaY;
      this.roll = -this.touchStick.deltaX;
      return;
    }

    let kPitch = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) kPitch += 1.0;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) kPitch -= 1.0;

    let kRoll = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) kRoll += 1.0;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) kRoll -= 1.0;

    const deadzone = 0.12;
    let mPitch = Math.abs(this.mouse.y) > deadzone ? this.mouse.y * 0.9 : 0;
    let mRoll = Math.abs(this.mouse.x) > deadzone ? -this.mouse.x * 1.1 : 0;

    this.pitch = kPitch !== 0 ? kPitch : mPitch;
    this.roll = kRoll !== 0 ? kRoll : mRoll;

    let kYaw = 0;
    if (this.keys['KeyQ']) kYaw += 1.0;
    if (this.keys['KeyE']) kYaw -= 1.0;
    this.yaw = kYaw;

    this.throttleUp = !!(this.keys['ShiftLeft'] || this.keys['KeyZ']);
    this.throttleDown = !!(this.keys['ControlLeft'] || this.keys['KeyX']);
    this.boost = !!(this.keys['ShiftLeft'] || (this.keys['Space'] && !this.mouse.down));
    this.airbrake = !!(this.keys['KeyK']);

    this.fireCannon = !!(this.keys['Space'] || this.mouse.down);
    this.fireMissile = !!(this.keys['KeyR'] || this.keys['KeyM']);
    this.fireBomb = !!(this.keys['KeyB']);
    this.deployFlare = !!(this.keys['KeyC'] || this.keys['KeyF']);
  }
}
