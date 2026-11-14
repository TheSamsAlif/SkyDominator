import * as THREE from 'three';

/**
 * Aerodynamic 6-DOF Fighter Flight Physics Engine
 * Features:
 * - Direct Equilibrium Flight Assist (Auto-Horizon Leveling, No Somersaults)
 * - Coordinated Aerodynamic Banking Turns
 * - Dynamic Lift, Thrust, Airbrake & Afterburner Boost
 * - Rock-Steady Cinematic Chase & Cockpit Cameras
 */
export class FlightPhysics {
  constructor(aircraftMesh, camera) {
    this.mesh = aircraftMesh;
    this.camera = camera;

    // Kinematic vectors
    this.position = new THREE.Vector3(0, 450, 0);
    this.quaternion = new THREE.Quaternion();
    this.velocity = new THREE.Vector3(0, 0, 180);

    // Directional axes (Nose = +Z in this game's asset convention)
    this.forward = new THREE.Vector3(0, 0, 1);
    this.up = new THREE.Vector3(0, 1, 0);
    this.right = new THREE.Vector3(1, 0, 0);

    // Aerodynamic rotation angles (Euler radians)
    this.pitch = 0;
    this.yaw = 0;
    this.roll = 0;

    // Handling rates
    this.pitchSpeed = 1.35;
    this.rollSpeed = 2.4;
    this.yawSpeed = 1.4;

    // Throttle & Airspeed
    this.throttle = 0.65;
    this.speed = 190;
    this.minSpeed = 120;
    this.maxSpeed = 380;
    this.boostSpeed = 520;

    this.isAfterburner = false;
    this.isAirbrake = false;
    this.boostEnergy = 100.0;
    this.maxBoostEnergy = 100.0;
    this.boostRechargeRate = 14.0;

    // Ground & Ceiling Limits
    this.groundY = 18;
    this.flightCeiling = 3500;

    // Telemetry
    this.airspeedKts = 370;
    this.mach = 0.58;
    this.altitudeMeters = 450;
    this.gForce = 1.0;
    this.isStalling = false;

    // Camera Mode: 0 = Chase (3rd Person), 1 = Cockpit (1st Person)
    this.cameraViewMode = 0;

    // Camera smoothing targets
    this.currentCamPos = new THREE.Vector3(0, 455, -28);
    this.currentCamLook = new THREE.Vector3(0, 451, 30);
  }

  applyBoostUpgrade(level = 0) {
    this.boostRechargeRate = 14.0 * (1.0 + level * 0.25);
  }

  setAircraftMesh(mesh) {
    this.mesh = mesh;
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.quaternion.copy(this.quaternion);
    }
  }

  cycleCamera() {
    this.cameraViewMode = (this.cameraViewMode + 1) % 2;
  }

  resetPosition(x = 0, y = 300, z = 0, heading = 0) {
    this.position.set(x, y, z);
    this.pitch = 0;
    this.yaw = heading;
    this.roll = 0;
    this.speed = 190;
    this.velocity.set(0, 0, this.speed);
    this.quaternion.setFromEuler(new THREE.Euler(0, this.yaw, 0, 'YXZ'));
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.quaternion.copy(this.quaternion);
    }
    this.currentCamPos.set(x, y + 6, z - 28);
    this.currentCamLook.set(x, y + 2, z + 30);
  }

  update(dt, input) {
    if (!input) return;

    // 1. Throttle, Boost & Airbrake
    if (input.throttleUp) this.throttle = Math.min(1.0, this.throttle + dt * 0.45);
    if (input.throttleDown) this.throttle = Math.max(0.2, this.throttle - dt * 0.45);

    this.isAirbrake = !!input.airbrake;
    this.isAfterburner = !!input.boost && this.boostEnergy > 2;

    if (this.isAfterburner) {
      this.boostEnergy = Math.max(0, this.boostEnergy - 28 * dt);
    } else {
      this.boostEnergy = Math.min(this.maxBoostEnergy, this.boostEnergy + this.boostRechargeRate * dt);
    }

    let targetSpeed = this.minSpeed + this.throttle * (this.maxSpeed - this.minSpeed);
    if (this.isAfterburner) targetSpeed = this.boostSpeed;
    if (this.isAirbrake) targetSpeed *= 0.55;

    this.speed = THREE.MathUtils.lerp(this.speed, targetSpeed, dt * 2.2);

    // 2. Flight Control Inputs & Equilibrium Stabilization
    // Deflection mapping with strong horizon auto-leveling (Zero unwanted somersaults)
    let targetPitch = 0;
    let targetRoll = 0;
    let targetYawRate = 0;

    // Keyboard inputs
    if (input.keys['KeyW'] || input.keys['ArrowDown']) targetPitch -= 0.65; // nose down dive
    if (input.keys['KeyS'] || input.keys['ArrowUp']) targetPitch += 0.75;   // nose up climb

    if (input.keys['KeyA'] || input.keys['ArrowLeft']) {
      targetRoll += 0.70;      // bank left
      targetYawRate += 1.35;   // turn heading left
    }
    if (input.keys['KeyD'] || input.keys['ArrowRight']) {
      targetRoll -= 0.70;      // bank right
      targetYawRate -= 1.35;   // turn heading right
    }

    // Rudder Yaw (Q / E)
    if (input.yaw) {
      targetYawRate += input.yaw * 1.5;
    }

    // Mouse Deflection Steering
    if (Math.abs(input.mouse.y) > 0.08) {
      targetPitch -= (input.mouse.y * 0.75);
    }
    if (Math.abs(input.mouse.x) > 0.08) {
      targetRoll -= (input.mouse.x * 0.65);
      targetYawRate -= (input.mouse.x * 1.6);
    }

    // Mobile Virtual Touch Stick
    if (input.touchStick && input.touchStick.active) {
      targetPitch -= (input.touchStick.deltaY * 0.75);
      targetRoll -= (input.touchStick.deltaX * 0.65);
      targetYawRate -= (input.touchStick.deltaX * 1.6);
    }

    // Clamp target bounds so the jet stays under full pilot control
    targetPitch = THREE.MathUtils.clamp(targetPitch, -0.85, 0.85); // max +/- 48 deg
    targetRoll = THREE.MathUtils.clamp(targetRoll, -1.05, 1.05);   // max +/- 60 deg

    // Responsive spring-damper auto-leveling
    this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, dt * 4.2);
    this.roll = THREE.MathUtils.lerp(this.roll, targetRoll, dt * 5.5);

    // Coordinated aerodynamic banking turn
    const bankTurnRate = -Math.sin(this.roll) * 1.1;
    this.yaw += (targetYawRate + bankTurnRate) * dt;

    // 3. Stable Quaternion (YXZ Euler)
    const euler = new THREE.Euler(this.pitch, this.yaw, this.roll, 'YXZ');
    this.quaternion.setFromEuler(euler);

    this.forward.set(0, 0, 1).applyQuaternion(this.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(this.quaternion);
    this.right.set(1, 0, 0).applyQuaternion(this.quaternion);

    // 4. Update Velocity & Position
    this.velocity.copy(this.forward).multiplyScalar(this.speed);
    this.position.addScaledVector(this.velocity, dt);

    // Low altitude soft-floor protection
    if (this.position.y < this.groundY) {
      this.position.y = this.groundY;
      this.pitch = Math.max(0.08, this.pitch);
    }

    if (this.position.y > this.flightCeiling) {
      this.position.y = this.flightCeiling;
      this.pitch = Math.min(-0.08, this.pitch);
    }

    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.quaternion.copy(this.quaternion);
    }

    // 5. Telemetry
    this.airspeedKts = Math.round(this.speed * 1.94384);
    this.mach = (this.speed / 340.0).toFixed(2);
    this.altitudeMeters = Math.round(this.position.y);
    this.gForce = Math.max(1.0, 1.0 + Math.abs(targetPitch - this.pitch) * 2.5 + Math.abs(this.roll) * 1.5);
    this.isStalling = this.speed < 125 && this.position.y > 60;

    // 6. Camera Update
    this.updateCamera(dt);
  }

  updateCamera(dt) {
    if (!this.camera) return;

    if (this.cameraViewMode === 0) {
      // 3rd-Person Chase Camera: Positioned behind the jet (-Z) looking forward (+Z)
      const camOffset = new THREE.Vector3(0, 5.2, -26).applyQuaternion(this.quaternion);
      const targetCamPos = this.position.clone().add(camOffset);

      this.currentCamPos.lerp(targetCamPos, dt * 9.0);
      this.camera.position.copy(this.currentCamPos);

      const lookOffset = new THREE.Vector3(0, 1.8, 35).applyQuaternion(this.quaternion);
      const targetLook = this.position.clone().add(lookOffset);
      this.currentCamLook.lerp(targetLook, dt * 14.0);

      this.camera.lookAt(this.currentCamLook);
      this.camera.up.lerp(this.up, dt * 5.0).normalize();

      const targetFOV = this.isAfterburner ? 86 : 74;
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, dt * 3.0);
      this.camera.updateProjectionMatrix();

    } else {
      // 1st-Person Cockpit Camera
      const cockpitOffset = new THREE.Vector3(0, 0.95, 4.2).applyQuaternion(this.quaternion);
      this.camera.position.copy(this.position.clone().add(cockpitOffset));

      const lookAhead = this.camera.position.clone().add(this.forward.clone().multiplyScalar(150));
      this.camera.lookAt(lookAhead);
      this.camera.up.copy(this.up);

      this.camera.fov = 82;
      this.camera.updateProjectionMatrix();
    }
  }
}
