import * as THREE from 'three';

/**
 * Aerodynamic 6-DOF Fighter Flight Physics Engine
 * Features:
 * - Stable Quaternion-based rotation (No Gimbal Lock)
 * - Coordinated Aerodynamic Banking Turns
 * - Automatic Horizon Leveling & Anti-Spin Assist
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
    this.pitch = 0; // Pitch angle relative to horizon (-80 to +80 deg)
    this.yaw = 0;   // Compass heading angle
    this.roll = 0;  // Bank angle relative to horizon (-75 to +75 deg)

    // Handling rates
    this.pitchSpeed = 1.35; // rad/s
    this.rollSpeed = 2.4;   // rad/s
    this.yawSpeed = 0.85;   // rad/s

    // Throttle & Airspeed
    this.throttle = 0.65; // 0.1 to 1.0
    this.speed = 190;     // m/s (approx 680 km/h)
    this.minSpeed = 110;
    this.maxSpeed = 380;
    this.boostSpeed = 520;

    this.isAfterburner = false;
    this.isAirbrake = false;
    this.boostEnergy = 100.0;
    this.maxBoostEnergy = 100.0;

    // Ground & Ceiling Limits
    this.groundY = 15;
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
    if (input.throttleDown) this.throttle = Math.max(0.15, this.throttle - dt * 0.45);

    this.isAirbrake = !!input.airbrake;
    this.isAfterburner = !!input.boost && this.boostEnergy > 2;

    if (this.isAfterburner) {
      this.boostEnergy = Math.max(0, this.boostEnergy - 28 * dt);
    } else {
      this.boostEnergy = Math.min(this.maxBoostEnergy, this.boostEnergy + 14 * dt);
    }

    // Target speed calculation based on throttle and altitude
    let targetSpeed = this.minSpeed + this.throttle * (this.maxSpeed - this.minSpeed);
    if (this.isAfterburner) targetSpeed = this.boostSpeed;
    if (this.isAirbrake) targetSpeed *= 0.55;

    // Pitch speed bonus/penalty (gravity assist during dives/climbs)
    const diveBonus = -Math.sin(this.pitch) * 45;
    targetSpeed += diveBonus;

    // Smooth speed acceleration
    this.speed = THREE.MathUtils.lerp(this.speed, Math.max(this.minSpeed, targetSpeed), dt * 1.8);

    // 2. Flight Control Inputs
    // Pitch: W/Up = Pitch Down (dive), S/Down = Pitch Up (climb)
    const pitchInput = input.pitch || 0;
    // Roll: A/Left = Roll Left, D/Right = Roll Right
    const rollInput = input.roll || 0;
    // Yaw: Q = Yaw Left, E = Yaw Right
    const yawInput = input.yaw || 0;

    // Speed-dependent control authority
    const controlAuthority = THREE.MathUtils.clamp(this.speed / 180, 0.4, 1.2);

    // 3. Pitch Dynamics
    // S pushes pitch positive (nose up), W pushes pitch negative (nose down)
    const deltaPitch = -pitchInput * this.pitchSpeed * controlAuthority * dt;
    this.pitch = THREE.MathUtils.clamp(this.pitch + deltaPitch, -1.35, 1.35); // clamp at ~77 degrees

    // 4. Roll & Bank Dynamics
    if (Math.abs(rollInput) > 0.05) {
      // Pilot rolling actively
      this.roll = THREE.MathUtils.clamp(this.roll - rollInput * this.rollSpeed * controlAuthority * dt, -1.3, 1.3);
    } else {
      // Auto-leveling assist: gently return wings to horizontal when stick is centered
      this.roll = THREE.MathUtils.lerp(this.roll, 0, dt * 2.8);
    }

    // 5. Coordinated Aerodynamic Turning (Banking induces Yaw turn)
    // When aircraft is banked, lift force naturally turns the nose in that direction
    const bankTurnRate = -Math.sin(this.roll) * 1.35;
    const directYawRate = -yawInput * this.yawSpeed * dt;
    this.yaw += (bankTurnRate * dt) + directYawRate;

    // 6. Compute Stable Quaternion (YXZ Euler: Heading -> Pitch -> Bank)
    const euler = new THREE.Euler(this.pitch, this.yaw, this.roll, 'YXZ');
    this.quaternion.setFromEuler(euler);

    // Extract world directional vectors (Nose = +Z)
    this.forward.set(0, 0, 1).applyQuaternion(this.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(this.quaternion);
    this.right.set(1, 0, 0).applyQuaternion(this.quaternion);

    // 7. Update Velocity & Position
    // Fighter jet moves forward along its nose
    this.velocity.copy(this.forward).multiplyScalar(this.speed);
    this.position.addScaledVector(this.velocity, dt);

    // Ground collision prevention
    if (this.position.y < this.groundY) {
      this.position.y = this.groundY;
      this.pitch = Math.max(0, this.pitch); // push nose up
    }

    // Flight ceiling clamp
    if (this.position.y > this.flightCeiling) {
      this.position.y = this.flightCeiling;
      this.pitch = Math.min(0, this.pitch); // push nose down
    }

    // Sync 3D mesh
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.quaternion.copy(this.quaternion);
    }

    // 8. Telemetry Computation
    this.airspeedKts = Math.round(this.speed * 1.94384);
    this.mach = (this.speed / 340.0).toFixed(2);
    this.altitudeMeters = Math.round(this.position.y);
    this.gForce = Math.max(1.0, 1.0 + (Math.abs(deltaPitch) * 18) + (Math.abs(bankTurnRate) * 1.2));
    this.isStalling = this.speed < 125 && this.position.y > 60;

    // 9. Camera Update
    this.updateCamera(dt);
  }

  updateCamera(dt) {
    if (!this.camera) return;

    if (this.cameraViewMode === 0) {
      // === 3RD PERSON CHASE CAMERA ===
      // Behind the jet (negative Z along nose) and slightly above (positive Y)
      const camOffset = new THREE.Vector3(0, 5.2, -26).applyQuaternion(this.quaternion);
      const targetCamPos = this.position.clone().add(camOffset);

      // Smooth camera position follow
      this.currentCamPos.lerp(targetCamPos, dt * 9.0);
      this.camera.position.copy(this.currentCamPos);

      // Look at point ahead of the jet (+Z along nose)
      const lookOffset = new THREE.Vector3(0, 1.8, 35).applyQuaternion(this.quaternion);
      const targetLook = this.position.clone().add(lookOffset);
      this.currentCamLook.lerp(targetLook, dt * 14.0);

      this.camera.lookAt(this.currentCamLook);

      // Camera up aligned with aircraft up for that authentic cockpit/chase banking feel
      this.camera.up.lerp(this.up, dt * 5.0).normalize();

      // Dynamic FOV based on speed / afterburner
      const targetFOV = this.isAfterburner ? 86 : 74;
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, dt * 3.0);
      this.camera.updateProjectionMatrix();

    } else {
      // === 1ST PERSON COCKPIT CAMERA ===
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
