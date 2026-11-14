# 3D GLTF / GLB Fighter Jet Models Directory

Place your custom 3D aircraft models (.glb or .gltf) in this directory:
- `f35.glb` or `jet.glb` : 5th/6th-Gen Stealth Fighter Model
- `enemy_jet.glb` : Hostile Squadron Jet Model

### Model Requirements:
- Format: Binary `.glb` (recommended) or `.gltf` (embedded or with textures).
- Compression: DRACO mesh compression is fully supported via DRACOLoader.
- Orientation: Forward nose pointing along the **+Z axis** (or normalized automatically by AircraftModelGenerator).
- Center: Centered pivot at the aircraft's center of mass.
- If no `.glb` file is found in this directory, the game automatically falls back to the high-detail procedural stealth jet from `RealisticJet.js`.

