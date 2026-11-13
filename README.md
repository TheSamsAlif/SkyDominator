# SKY DOMINATOR: APEX STRIKE
### AAA Cinematic 3D Fighter Aircraft Combat Game & Cross-Platform Experience

[![Unreal Engine 5](https://img.shields.io/badge/Unreal%20Engine-5.4%2B-blue?logo=unrealengine)](https://www.unrealengine.com/)
[![WebGL 3D](https://img.shields.io/badge/Web-Three.js%20%2F%20WebGL2-cyan?logo=three.js)](https://threejs.org/)
[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Web%20%7C%20Android%20%7C%20iOS-orange)](#)

---

## ⚡ Overview

**SKY DOMINATOR: APEX STRIKE** is a high-octane, story-driven, cinematic 3D aerial combat project featuring realistic flight aerodynamics, intelligent enemy pilot AI, futuristic weapon systems, and an interactive 3D aircraft hangar.

The project is structured into two complementary implementations:
1. **Unreal Engine 5 Core (`/SkyDominator`)**: Production C++ architecture, Chaos/aerodynamic physics movement components, modular damage models, Enhanced Input contexts, and custom save serialization for PC, Android, and iOS.
2. **Web 3D Combat Game (`/SkyDominator-Web`)**: Zero-install, high-performance WebGL 3D fighter combat game built with Three.js, procedural PBR geometry, Web Audio API sound synthesis, and touch/gamepad support—engineered for **instant 1-click Vercel deployment**!

---

## 🛩 The 12 Fictional Aircraft Identities

| ID | Codename | Aircraft Class | Wings & Silhouette | Max Speed | Tactical Special Ability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A-01** | **Apex Phantom** | Stealth Interceptor | Diamond Delta | Mach 2.8 | **Active Cloak**: Suppresses radar & IR locks for 8s |
| **A-02** | **Titan Breaker** | Heavy Strike Fighter | Broad Swept | Mach 1.9 | **Overcharged Aegis**: Frontal barrier absorbs 70% damage |
| **A-03** | **Valkyrie IX** | Advanced Multirole | Forward-Swept | Mach 2.4 | **Omni-Burst**: Multi-lock kinetic micro-missile salvo |
| **A-04** | **Hyperion Velocity** | High-Speed Experimental | Needle Scramjet | Mach 3.6 | **Supercruise Surge**: 300% afterburner surge burst |
| **A-05** | **Trident Corsair** | Naval Carrier Fighter | Inverted Gull | Mach 2.2 | **Sea-Skimmer Jammer**: Surface clutter electronic deception |
| **A-06** | **Specter ECM** | Electronic Defense | Dorsal Radome | Mach 2.0 | **EMP Disruption Wave**: Blinds enemy radar in 2.5km radius |
| **A-07** | **Raven Eye** | Tactical Reconnaissance | High-Aspect Wing | Mach 2.6 | **Battlefield Horizon**: Thermal & radar scan through clouds |
| **A-08** | **Solaris Wing** | Elite Squadron Fighter | Canard Delta | Mach 2.5 | **Vector Thrust Override**: Instant post-stall Kulbit flip |
| **A-09** | **Chronos Hypersonic** | Futuristic Hypersonic | Wave-Rider | Mach 4.2 | **Kinetic Sonic Shockwave**: Atmospheric wake damages tail pursuers |
| **A-10** | **Colossus Juggernaut**| Heavy Armored Jet | Quad-Turbine | Mach 1.6 | **Point-Defense Fortress**: Automated CIWS flak intercepts missiles |
| **A-11** | **Night Wraith** | Legendary Phantom | Blended Wing | Mach 2.7 | **Shadow Step**: Optical decoy illusion deployed to break locks |
| **A-12** | **Sky Dominator (Apex)**| Ultimate Apex Aircraft| Morphing Aero | Mach 3.2 | **Apex Overdrive**: Boundless energy, hyper-agility & triple cannon |

---

## 🎮 Flight Controls

### PC (Keyboard & Mouse)
* **Pitch & Roll**: `W` / `S` & `A` / `D` or Mouse Flight
* **Yaw (Rudder)**: `Q` / `E`
* **Throttle / Afterburner**: `Shift` (Accelerate / Boost) & `Ctrl` (Decelerate / Airbrake)
* **20mm Rotary Cannon**: `Left Mouse Button` or `Spacebar`
* **Apex-9 Guided Missiles**: `R` Key
* **Countermeasure Flares**: `C` Key
* **Cycle Camera (Chase / Cockpit)**: `V` Key

### Mobile & Tablet (Touch)
* **Virtual Flight Stick (Left Screen)**: Analog Pitch and Roll
* **Boost & Brake**: Dedicated touch action buttons
* **Weapons (Right Screen)**: Touch buttons for Cannon, Missile, and Flares

---

## 🚀 Live Vercel Deployment

This repository is pre-configured with root and web `vercel.json` and npm workspaces.

### Quick Deploy:
1. Fork or push this repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import **`SkyDominator`**.
4. Click **Deploy**! (Vercel automatically detects the build configuration).

---

## 🛠 Project Structure

```
├── docs/
│   └── TECHNICAL_DESIGN_DOCUMENT.md    # Pre-production architectural specifications
├── SkyDominator/                       # Unreal Engine 5 C++ & Blueprint Project
│   ├── SkyDominator.uproject
│   ├── Config/                         # DefaultEngine, Scalability, DeviceProfiles
│   ├── Content/                        # Asset folders & README manifest
│   └── Source/SkyDominator/            # C++ Core, Movement, Damage, Progression
└── SkyDominator-Web/                   # Vercel-Ready WebGL 3D Combat Game
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/                            # Three.js 3D Engine, Audio, Flight, UI
```

---
*Created by Sams Alif & Sky Dominator Engineering Team*

