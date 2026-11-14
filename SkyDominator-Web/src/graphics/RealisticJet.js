import * as THREE from 'three';
// extrude a flat polygon [x, y] to a thin plate
const ext = (pts, depth) => { const s = new THREE.Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach(p => s.lineTo(...p)); s.closePath(); return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); };

// 5th-gen stealth fighter (nose = +Z, afterburner flames named for AircraftModelGenerator.updateAfterburnerFX)
export function createJet(primary = 0x2a3038, accent = 0x00e5ff) {
  const g = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: primary, metalness: 0.55, roughness: 0.42, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(primary).multiplyScalar(0.4), metalness: 0.7, roughness: 0.5, side: THREE.DoubleSide });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1b3550, metalness: 1, roughness: 0.05, emissive: 0x06121e });
  const lit = (c) => new THREE.MeshBasicMaterial({ color: c });
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };

  // Fuselage: lathe profile (radius, z) flattened into a chined body
  const prof = [[0.01, -9.5], [0.8, -9.2], [1.15, -7], [1.45, -3], [1.5, 0], [1.35, 3], [1.05, 6], [0.6, 8.8], [0.25, 10.6], [0.02, 11.6]].map(([r, z]) => new THREE.Vector2(r, z));
  add(new THREE.LatheGeometry(prof, 20).rotateX(Math.PI / 2).scale(1.3, 0.62, 1), hull);
  // Wings, stabilators, leading-edge root extensions
  const wing = ext([[0.8, -2], [7.6, 2.8], [7.6, 4.6], [0.8, 7]], 0.14).rotateX(-Math.PI / 2).translate(0, -0.07, 0);
  const stab = ext([[0.8, -1], [3.6, 2.2], [3.6, 3.4], [0.8, 4.6]], 0.1).rotateX(-Math.PI / 2).translate(0, -0.05, 0);
  const lerx = ext([[0.9, -7], [2.6, -2.5], [0.9, -1]], 0.1).rotateX(-Math.PI / 2);
  for (const s of [1, -1]) {
    add(wing, hull).scale.x = s;
    const st = add(stab, hull, 0, 0, -6); st.scale.x = s;
    const lx = add(lerx, hull, 0, 0.05, 0); lx.scale.x = s;
    // canted twin tails
    const tail = add(ext([[3, 0], [5.2, 3.6], [6.6, 3.6], [7.5, 0]], 0.1).rotateY(Math.PI / 2).translate(-0.05, 0, 0), hull, s * 1.5, 0.5, 0);
    tail.rotation.z = -s * 0.32;
    // intakes, nav lights, wingtip rails
    add(new THREE.BoxGeometry(0.9, 0.7, 3.4), dark, s * 1.55, -0.35, 3.2).rotation.y = -s * 0.05;
    add(new THREE.SphereGeometry(0.12, 6, 6), lit(s > 0 ? 0x00ff44 : 0xff2020), s * 7.6, 0.05, 3.6);
    add(new THREE.BoxGeometry(0.1, 0.1, 2), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.4 }), s * 7.6, 0, 3.6);
    // nozzle + afterburner flame
    add(new THREE.CylinderGeometry(0.62, 0.5, 1.4, 14, 1, true).rotateX(Math.PI / 2), dark, s * 0.85, 0, -9.6);
    const flame = add(new THREE.ConeGeometry(0.5, 4.5, 10).rotateX(-Math.PI / 2).translate(0, 0, -2.25),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }), s * 0.85, 0, -9.9);
    flame.name = s > 0 ? 'afterburner_flame_left' : 'afterburner_flame_right'; flame.castShadow = false;
  }
  add(new THREE.SphereGeometry(1, 16, 12).scale(0.62, 0.5, 2.6), glass, 0, 0.78, 5);
  const light = new THREE.PointLight(accent, 2.5, 15); light.position.set(0, 0, -11); light.name = 'exhaust_glow_light'; g.add(light);
  return g;
}

// AIM-style air-to-air missile: body, seeker band, cruciform fins, rocket flame
export function createMissileModel() {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xe8ecef, metalness: 0.6, roughness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x30343a, metalness: 0.5, roughness: 0.5 });
  const put = (geo, mat, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.z = z; parent.add(m); return m; };
  put(new THREE.CylinderGeometry(0.13, 0.13, 3.2, 12).rotateX(Math.PI / 2), body, 0);
  put(new THREE.ConeGeometry(0.13, 0.9, 12).rotateX(Math.PI / 2), dark, 2.05);
  put(new THREE.CylinderGeometry(0.135, 0.135, 0.25, 12).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xc02020 }), 1.2);
  for (let k = 0; k < 4; k++) {
    const pivot = new THREE.Object3D(); pivot.rotation.z = k * Math.PI / 2; g.add(pivot);
    const fin = put(new THREE.BoxGeometry(0.02, 0.5, 0.55), dark, -1.3, pivot); fin.position.y = 0.32;
    const can = put(new THREE.BoxGeometry(0.02, 0.28, 0.3), dark, 0.6, pivot); can.position.y = 0.2;
  }
  const flame = put(new THREE.ConeGeometry(0.12, 1.6, 8).rotateX(-Math.PI / 2).translate(0, 0, -0.8),
    new THREE.MeshBasicMaterial({ color: 0xff9a30, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }), -1.6);
  flame.name = 'flame';
  return g;
}
