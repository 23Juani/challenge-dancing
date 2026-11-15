---
name: image-to-code
description: Replicate visual interfaces, mockups, design screenshots, and reference images with pixel-level fidelity into clean, modern, and production-ready code (HTML/CSS, JavaScript/TypeScript, Three.js shaders, and Kotlin Jetpack Compose). Use whenever given a reference image (e.g. mockups, dashboards, HUDs, landing pages, mobile screens) to extract color palettes, typography, glassmorphism tokens, layout hierarchy, and micro-interactions.
---

# Image-to-Code Skill

This skill governs the systematic, pixel-accurate conversion of visual references into working frontend and mobile software architectures.

## Core Methodology

### 1. Visual Token Extraction
Before writing markup or code, analyze the input image and extract:
- **Color Palette:** Exact HEX/RGBA values for base background, surface elevations, card borders, neon accents, and text contrast tiers.
- **Glassmorphism Spec:** `backdrop-filter: blur(16px-24px)`, subtle multi-layer borders `rgba(255,255,255,0.08)`, and translucent linear gradients.
- **Typography:** Primary grotesque/geometric font family (e.g., `Inter`, `Outfit`), font weights (regular, semibold, black), letter-spacing, and line heights.
- **Spatial Geometry:** Card border radii (`12px`, `16px`, `24px`, pill `9999px`), grid tracks, gap spacing, and padding rhythm.

### 2. Web & 3D Implementation (HTML/CSS/Three.js)
- Build modular CSS design tokens in `tokens.css`.
- Use semantic HTML with absolute and flex/grid positioning for HUD overlays above 3D WebGL canvases.
- For geospatial / satellite 3D scenes:
  - Match atmospheric fog, lighting angles, and tone mapping (e.g. ACESFilmic) to the photographic reference.
  - Implement custom GLSL shaders for risk contours, heatmaps, and glowing dashed vector boundaries.
  - Create crisp CSS2D or SVG callout badges anchored to 3D world coordinates.

### 3. Native Android Implementation (Kotlin + Jetpack Compose)
- Translate HUD glass cards to Compose `Surface` or `Card` with `SurfaceGlass` colors, rounded corner shapes, and high-contrast typography.
- Use Compose animations (`rememberInfiniteTransition`, `animateFloatAsState`) for pulsing radar/hazard indicators.
- Structure state cleanly with MVVM and reactive `StateFlow`.
