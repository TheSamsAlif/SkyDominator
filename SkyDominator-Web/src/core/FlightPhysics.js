import * as THREE from 'three';

/**
 * 6-DOF Aerodynamic Flight Physics Engine
 */
export class FlightPhysics {
  constructor(aircraftMesh, camera) {
    this.mesh = aircraftMesh;
    this.camera = camera;

    // Kinematic states
    this.position = new THREE.Vector3(0, 800, -2500);
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.velocity = new THREE.Vector3(0, 0, 180); // Start flying forward
    this.forward = new THREE.Vector3(0, 0, 1);
    this.up = new THREE.Vector3(0, 1, 0);
    this.right = new THREE.Vector3(1, 0, 0);

    // Aerodynamic performance parameters
    this.throttle = 0.6; // 0.0 to 1.0
    this.isAfterburner = false;
    this.isAirbrake = false;
    this.boostEnergy = 100.0;
    this.maxBoostEnergy = 100.0;

    this.pitchRate = 1.6; // rad/s
    this.rollRate = 3.2;  // rad/s
    this.yawRate = 0.8;   // rad/s

    this.airspeedKts = 420;
    this.mach = 0.65;
    this.altitudeMeters = 800;
    this.gForce = 1.0;
    this.angleOfAttack = 0.0;
    this.isStalling = false;

    // Camera view index: 0 = Chase, 1 = Cockpit, 2 = Cinematic Orbit
    this.cameraViewMode = 0;
    this.cameraOffset = new THREE.Vector3(0, 6, -26);
    this.cameraTarget = new THREE.Vector3(0, 2, 8);
  }

  setAircraftMesh(newMesh) {
    this.mesh = newMesh;
  }

  cycleCamera() {
    this.cameraViewMode = (this.cameraViewMode + 1) % 2; // 0 = Chase, 1 = Cockpit
  }

  update(dt, input) {
    if (!this.mesh) return;

    // 1. Throttle & Boost Controls
    if (input.throttleUp) this.throttle = Math.min(1.0, this.throttle + dt * 0.4);
    if (input.throttleDown) this.throttle = Math.max(0.1, this.throttle - dt * 0.4);

    this.isAirbrake = input.airbrake;
    this.isAfterburner = input.boost && this.boostEnergy > 0;

    if (this.isAfterburner) {
      this.boostEnergy = Math.max(0, this.boostEnergy - 30 * dt);
    } else {
      this.boostEnergy = Math.min(this.maxBoostEnergy, this.boostEnergy + 12 * dt);
    }

    // 2. Control Rotational Authority (Scales with dynamic airspeed)
    const currentSpeed = this.velocity.length();
    const controlAuthority = Math.min(1.0, Math.max(0.2, currentSpeed / 120));

    const pitchInput = input.pitch;
    const rollInput = input.roll;
    const yawInput = input.yaw;

    // Apply rotations in local aircraft frame
    const deltaPitch = pitchInput * this.pitchRate * controlAuthority * dt;
    const deltaRoll = rollInput * this.rollRate * controlAuthority * dt;
    const deltaYaw = yawInput * this.yawRate * controlAuthority * dt;

    this.mesh.rotateX(deltaPitch);
    this.mesh.rotateZ(-deltaRoll);
    this.mesh.rotateY(-deltaYaw);

    // Extract current directional vectors from mesh quaternion
    this.mesh.getWorldDirection(this.forward);
    this.up.set(0, 1, 0).applyQuaternion(this.mesh.quaternion);
    this.right.set(1, 0, 0).applyQuaternion(this.mesh.quaternion);

    // 3. Compute Forces
    // Thrust
    let thrustPower = 180 * this.throttle;
    if (this.isAfterburner) thrustPower *= 1.85;
    if (this.isAirbrake) thrustPower *= 0.5;

    const thrustForce = this.forward.clone().multiplyScalar(thrustPower);

    // Dynamic Lift
    const normalizedVel = this.velocity.clone().normalize();
    const forwardDot = THREE.MathUtils.clamp(this.forward.dot(normalizedVel), -1, 1);
    this.angleOfAttack = Math.acos(forwardDot) * (180 / Math.PI);

    // Stall logic
    this.isStalling = (this.angleOfAttack > 22.0) || (this.airspeedKts < 120 && this.position.y > 60);

    let liftCoeff = Math.sin(this.angleOfAttack * Math.PI / 90) * 1.5;
    if (this.isStalling) liftCoeff *= 0.3;

    const liftMag = (currentSpeed * currentSpeed * 0.003) * liftCoeff;
    const liftForce = this.up.clone().multiplyScalar(liftMag);

    // Drag
    let dragCoeff = 0.0018;
    if (this.isAirbrake) dragCoeff += 0.0035;
    if (this.mach > 0.95 && this.mach < 1.15) dragCoeff += 0.002; // Transonic drag wave
    const dragForce = this.velocity.clone().multiplyScalar(-currentSpeed * dragCoeff);

    // Gravity
    const gravityForce = new THREE.Vector3(0, -9.8 * 3.5, 0);

    // Total Acceleration
    const totalForce = thrustForce.add(liftForce).add(dragForce).add(gravityForce);
    this.velocity.addScaledVector(totalForce, dt);

    // Update Position
    this.position.addScaledVector(this.velocity, dt);

    // Ocean Collision / Minimum altitude clamp
    if (this.position.y < 5) {
      this.position.y = 5;
      this.velocity.y = Math.max(0, this.velocity.y);
    }

    this.mesh.position.copy(this.position);

    // 4. Update Telemetry
    this.airspeedKts = currentSpeed * 2.1;
    this.mach = this.airspeedKts / 661.0;
    this.altitudeMeters = this.position.y;
    this.gForce = Math.max(0.5, (totalForce.y / 9.8) + 1.0);

    // 5. Camera Management
    this.updateCamera(dt);
  }

  updateCamera(dt) {
    if (this.cameraViewMode === 0) {
      // 3rd Person Dynamic Chase View with velocity lag and high-Mach FOV
      const offset = this.cameraOffset.clone().applyQuaternion(this.mesh.quaternion);
      const targetCamPos = this.position.clone().add(offset);

      // Smooth camera interpolation
      this.camera.position.lerp(targetCamPos, dt * 10);

      const lookTarget = this.position.clone().add(this.cameraTarget.clone().applyQuaternion(this.mesh.quaternion));
      this.camera.lookAt(lookTarget);

      // Dynamic FOV based on speed / Mach
      const targetFOV = THREE.MathUtils.clamp(75 + (this.mach * 18), 75, 105);
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, dt * 4);
      this.camera.updateProjectionMatrix();

    } else if (this.cameraViewMode === 1) {
      // Cockpit 1st Person Perspective
      const cockpitOffset = new THREE.Vector3(0, 0.75, 4.2).applyQuaternion(this.mesh.quaternion);
      this.camera.position.copy(this.position.clone().add(cockpitOffset));

      const lookTarget = this.camera.position.clone().add(this.forward.clone().multiplyScalar(100));
      this.camera.lookAt(lookTarget);

      this.camera.fov = 85;
      this.camera.updateProjectionMatrix();
    }
  }
}

