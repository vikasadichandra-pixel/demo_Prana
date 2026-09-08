# Astra handoff — Ladakh cinematic preloader

Work only on branch `feature/ladakh-cinematic-preloader`.

User vision: night-time Ladakh, genuinely 3D jagged snowy ridges, full-screen drifting snow. `P → R → Ā → Ṇ → A` is the loader: letters fall one-by-one and land on separate ridges at different heights/left-right tilts. Each impact must feel heavy and throw a realistic powder-snow burst with residual drift. No loading bar. Final `Ā` is the hero/highest central ridge. Preserve the rest of the site and existing reveal/complete callbacks.

Already implemented:
- `src/components/LadakhPreloaderScene.jsx`: procedural multi-depth hero/background/foreground terrain, sharp localized ridges, slope-aware snow/rock coloring, night sky/moon/fog, far+near snow fields, falling 3D Text3D letters, hand-directed ridge anchors, clock-driven physics snow bursts, small landing bounce/squash, impact camera kick.
- `src/lib/ladakhPreloader.js`: timing + `LETTER_RIGS` choreography.
- `src/components/Preloader.jsx`: asset-loading gate and transition integration. Do not replace this unless necessary.
- `src/components/Preloader.css`: cinematic HUD/vignette. No progress bar.
- CI: `.github/workflows/ladakh-preloader-ci.yml`; build/tests are green.

If further visual tuning is needed, inspect only these first:
1. `src/components/LadakhPreloaderScene.jsx`
2. `src/lib/ladakhPreloader.js`
3. `src/components/Preloader.css`

Do not re-explore/rewrite the whole repo. Prefer tuning `HERO_PEAKS`, terrain roughness/snow slope thresholds, camera framing, `LETTER_RIGS`, lighting/fog, and `ImpactBurst`. Keep changes isolated to this branch.
