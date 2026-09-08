# Astra handoff — FINAL POLISH ONLY

Branch: `feature/ladakh-cinematic-preloader`.

## User vision
Night-time Ladakh. Hyperrealistic 3D snowy ridges. `P → R → Ā → Ṇ → A` is the loader itself: five heavy 3D letters fall one-by-one and land on DIFFERENT ridges/heights/depths with natural left/right slope tilt. Each impact throws powder snow + heavier chunks, compresses the landing snow and settles with weight. Full-screen wind-driven snow/spindrift. No loading bar. Central `Ā` is the hero/highest ridge. Preserve the rest of the site and existing reveal/complete callbacks.

## Production implementation already done
- **ACTIVE SCENE:** `src/components/LadakhPreloaderScenePro.jsx`
  - true displaced multi-layer 3D terrain (foreground/hero/distant)
  - hand-shaped jagged ridge masses + warped erosion/gullies
  - slope/altitude/wind-aware snow-vs-rock shading
  - moon texture + restrained moonlight + stars + aerial fog + valley mist
  - two depth layers of moving snowfall
  - physically accelerated letter drops + slope-aware final orientation
  - impact camera kick + squash/bounce
  - 150 fine powder particles + 34 heavier snow chunks per impact
  - final letter hold + actual asset-loading gate
- `src/components/LadakhCinematicFX.jsx`
  - ridge-hugging spindrift
  - moon cloud veil
  - landing compression mark, shock ring and settled snow chunks
- `src/lib/ladakhPreloader.js`
  - timings, five hand-directed `LETTER_RIGS`, impact/bounce envelopes
- `src/components/Preloader.jsx`
  - imports the Pro scene; loading + site transition integration. **Do not rewrite.**
- `src/components/Preloader.css`
  - restrained cinematic vignette/HUD; scan-line effect intentionally reduced so it reads as landscape, not sci-fi monitor.
- Build + tests are green.

## What is left for Astra
ONLY final visual tuning after looking at the rendered result/screenshot. Do not re-architect or explore the repo.

Inspect in this order only:
1. `src/components/LadakhPreloaderScenePro.jsx`
2. `src/components/LadakhCinematicFX.jsx`
3. `src/lib/ladakhPreloader.js`
4. `src/components/Preloader.css` only if framing/HUD needs adjustment

High-value knobs:
- final mountain silhouette: `HERO_PEAKS`, `DISTANT_PEAKS`, `FOREGROUND_PEAKS`
- letter composition: `LETTER_RIGS`
- framing: `SceneDirector` baseY/baseZ/lookAt + Canvas `fov`
- realism: terrain roughness/snow thresholds, directional-light intensity, fog density
- impact feel: fine/coarse velocities + puff scale in `ImpactBurst`
- snow density: the two `SnowField` counts + `RidgeSpindrift`

Do **not** add a progress bar, replace the loader concept, touch the rest of the website, or redo loading architecture. The remaining task is cinematic art-direction polish, not engineering reconstruction.
