# BENNETT — Intelligent Landslide Early Warning & Surface Change Monitoring Platform
### 2026 NASA Space Apps Challenge | Challenge: *Dancing with the SARs*

[![Live Demo](https://img.shields.io/badge/Live_Demo-challenge--dancing.vercel.app-blue?style=for-the-badge&logo=vercel)](https://challenge-dancing.vercel.app)
[![NASA Space Apps](https://img.shields.io/badge/NASA_Space_Apps-2026_Challenge-black?style=for-the-badge&logo=nasa)](https://www.spaceappschallenge.org/)
[![NISAR](https://img.shields.io/badge/Mission-NASA--ISRO_NISAR_(L%2BS_Band)-0B3D91?style=for-the-badge)](https://nisar.jpl.nasa.gov/)
[![Rust Backend](https://img.shields.io/badge/Backend-Rust_Axum_Tokio-orange?style=for-the-badge&logo=rust)](backend/)
[![Web App](https://img.shields.io/badge/Frontend-React_19_Vite_Tailwind-61DAFB?style=for-the-badge&logo=react)](https://challenge-dancing.vercel.app)
[![Android App](https://img.shields.io/badge/Mobile-Kotlin_Jetpack_Compose-3DDC84?style=for-the-badge&logo=android)](app-movile/)

> **Live Interactive Application:** [https://challenge-dancing.vercel.app](https://challenge-dancing.vercel.app)  
> **Study Area:** La Paz & El Alto, Bolivia (Andean Basin & Slopes — 21 high-risk pilot zones)

---

## Table of Contents
1. [Project Overview & Live Demo](#project-overview--live-demo)
2. [The NASA Challenge: Dancing with the SARs](#the-nasa-challenge-dancing-with-the-sars)
3. [Scientific Foundations: Active Radar Remote Sensing](#scientific-foundations-active-radar-remote-sensing)
4. [Study Area: Why La Paz, Bolivia?](#study-area-why-la-paz-bolivia)
5. [The BENNETT Solution & Architecture](#the-bennett-solution--architecture)
6. [Core Platform Features (Web UI)](#core-platform-features-web-ui)
7. [NISAR Data Processing & Selective Filtering Pipeline](#nisar-data-processing--selective-filtering-pipeline)
8. [Multi-Factor Territorial Attention Index](#multi-factor-territorial-attention-index)
9. [Component Walkthrough](#component-walkthrough)
   - [Web Application (`website` / `website-example`)](#web-application-website--website-example)
   - [Rust Prediction & Streaming Backend (`backend`)](#rust-prediction--streaming-backend-backend)
   - [Citizen Mobile Application (`app-movile`)](#citizen-mobile-application-app-movile)
   - [Data Science & ML Engine (`SLIDEGUARD_SOUP`)](#data-science--ml-engine-slideguard_soup)
10. [Quickstart Guide](#quickstart-guide)
11. [Data Sources & Open Standards](#data-sources--open-standards)
12. [Team Members](#team-members)
13. [Acknowledgments & License](#acknowledgments--license)

---

## Project Overview & Live Demo

**BENNETT** is an end-to-end, open-source decision-support and early warning ecosystem designed to translate raw, complex synthetic aperture radar (SAR) telemetry from the **NASA-ISRO SAR (NISAR)** mission into actionable territorial intelligence. 

By fusing **NISAR L-band interferometry (InSAR)**, **dielectric soil moisture dynamics**, **satellite precipitation (GPM IMERG / Open-Meteo)**, and **local geological-topographical layers**, BENNETT enables municipal authorities, geologists, and vulnerable communities in high-risk mountainous environments to anticipate slow-moving slope deformation (*creep*) and prevent catastrophic landslide collapses.

* **Explore the Live Web App:** [https://challenge-dancing.vercel.app](https://challenge-dancing.vercel.app)
* **Bilingual Support:** Full English (`EN`) and Spanish (`ES`) dynamic localization.
* **Open Source Stack:** Rust (Axum, Tokio), React 19, TypeScript, Tailwind CSS v4, MapLibre GL, Python (HDF5 / NumPy), Kotlin (Jetpack Compose).

---

## The NASA Challenge: Dancing with the SARs

> *"Earth's surface is an endless dance of natural processes and human activities, but these changes are often difficult to visualize, understand, and communicate... Your challenge is to build an interactive application that uses radar remote sensing data from the NASA-ISRO Synthetic Aperture Radar (NISAR) mission to track and visualize one or more types of surface change at locations around the world."*  
> — **2026 NASA Space Apps Challenge**

### Challenge Alignment Matrix

| Challenge Objective | BENNETT Implementation |
| :--- | :--- |
| **Track & visualize surface change** | Interactive multi-layer web map rendering Persistent Scatterer InSAR point clouds, 12-day Line-of-Sight (LOS) velocity fields, and time-series evolution for 21 urban hillslopes. |
| **Active SAR Remote Sensing** | Direct ingestion and parsing of NISAR dual-band (L-band $\lambda \approx 24\text{ cm}$) radar data, leveraging its cloud-penetrating and day-and-night observation capabilities. |
| **Dielectric Constant & Moisture** | Co-polarization backscatter ($HH$/$VV$) processing sensitive to soil volumetric water content ($\theta_v$) and dielectric constant ($\epsilon_r$) shifts preceding slope shear failure. |
| **Roughness & Polarimetry** | Cross-polarization ($HV$) volume-scattering decomposition to decontaminate vegetation canopy effects from true ground surface backscatter. |
| **Interactive Medium & Storytelling** | Web-based digital twin featuring a Scenario Simulator (stress-testing rainfall spikes), inspection prioritization ranking, automated technical PDF/printable reports, and live satellite pass trackers. |
| **Local Community Impact** | Built specifically for the vulnerable hillside communities of La Paz, Bolivia, complemented by a native Android alert app for drivers and residents. |

---

## Scientific Foundations: Active Radar Remote Sensing

Unlike passive optical sensors limited by solar illumination and cloud obstruction, NISAR’s active microwave radar sends electromagnetic pulses that react directly with Earth's surface structure, geometry, and electrical properties.

```
         NISAR Incident Wave (L-band λ=24cm / S-band λ=9cm)
                  \
                   \  θ_inc (Local Incidence Angle)
                    \
                     ▼
    ┌──────────────────────────────────────────────┐
    │  Vegetation Canopy (Leaves & Branches)       │ <-- HV (Volumetric Cross-Polarization)
    │  Penetrated by L-band (λ=24 cm)               │
    ├──────────────────────────────────────────────┤
    │  Active Slope Failure Zone / Subsurface      │
    │  • Moisture Increase (θ_v) ──► Increases ε_r  │ <-- HH / VV (Direct Surface Scattering)
    │  • Slow Creep Deformation  ──► Δφ InSAR      │ <-- Unwrapped Phase (Displacement)
    │  • Shear Rupture / Collapse ──► Drop in γ     │ <-- Temporal Coherence Loss
    └──────────────────────────────────────────────┘
```

### 1. Soil Moisture & Dielectric Constant ($\epsilon_r$)
Rainfall infiltration increases pore water pressure ($u$), reducing the soil's effective shear strength ($\tau_f$) according to the Mohr-Coulomb failure criterion:
$$\tau_f = c' + (\sigma - u) \tan(\phi')$$
As volumetric soil moisture ($\theta_v$) rises, the relative dielectric permittivity ($\epsilon_r$) surges from $\sim 3\text{--}5$ (dry soil) to $>25\text{--}35$ (near-saturated pre-failure soil). Through the Small Perturbation Model (SPM), radar backscatter ($\sigma^0$) is directly proportional to the Fresnel reflection coefficient ($R_{pp}$):
$$\sigma^0_{pp}(\theta) \propto |R_{pp}(\theta, \epsilon_r)|^2$$
**Why L-band ($\lambda \approx 24\text{ cm}$)?** Short wavelengths (X-band $\sim 3\text{ cm}$, C-band $\sim 5.6\text{ cm}$) scatter at the tree canopy top. NISAR’s L-band penetrates dense tropical and Andean vegetation, reaching the true soil surface.

### 2. Pre-failure Creep & Differential InSAR Phase
Most slope failures do not occur spontaneously; they undergo slow plastic shear deformation (*creep*) at rates of millimeters to centimeters per month. Differential InSAR measures phase differences ($\Delta \phi$) between repeat satellite passes (NISAR's 12-day orbital cycle):
$$\Delta \phi = \phi_{\text{def}} + \phi_{\text{topo}} + \phi_{\text{atm}} + \phi_{\text{noise}}$$
Line-of-Sight (LOS) displacement ($\Delta r_{\text{LOS}}$) is derived from the unwrapped interferometric phase:
$$\Delta r_{\text{LOS}} = -\frac{\lambda}{4\pi} \cdot \Delta \phi_{\text{def}}$$
For NISAR Frequency A ($\lambda = 0.24\text{ m}$), each $2\pi$ phase cycle represents $12\text{ cm}$ of deformation, achieving sub-centimeter ($1\text{--}3\text{ mm}$) precision.

### 3. Interferometric Coherence ($\gamma$) as an Instability Fingerprint
Coherence ($\gamma \in [0, 1]$) quantifies pixel phase stability across acquisitions:
* **Stable Slopes ($\gamma > 0.6$):** High phase fidelity for millimetric creep rate derivation.
* **Active Shear / Mass Colluvium ($\gamma < 0.25$):** Structural displacement and surface breakdown decorrelate the radar echo, providing a clear geometric boundary for landslide inventory mapping.

### 4. Steep Andean Topography Corrections
In steep terrain, side-looking radar encounters severe geometric distortions: *foreshortening*, *layover*, and *shadow*. BENNETT explicitly ingests:
* `incidenceAngle`: Normalizes radar backscatter to local terrain slope ($\gamma^0 = \sigma^0 / \cos \theta_{\text{local}}$).
* `layoverShadowMask`: Masks out blind regions to eliminate false positive alarms.
* `orbit` & `attitude`: Precise state vectors for rigorous DEM geocoding.

---

## Study Area: Why La Paz, Bolivia?

La Paz is one of the highest and topographically most extreme metropolitan centers on Earth (elevations from $3,200$ to $4,100\text{ m a.s.l.}$). The city is nestled inside a steep, glacially eroded canyon carved into unconsolidated, highly susceptible geological formations:

* **Geological Formations:**
  * **La Paz Fm.:** Highly plastic lacustrine silts and clays; prime detachment surfaces when wet.
  * **Colluvial Deposits:** Ancient landslide masses prone to reactivation.
  * **Calvario & Purapurani Fms.:** Glacial tills, gravels, and weakly cemented sands.
* **Precipitation Regime:** Semi-arid dry winter followed by intense convective rainfall (October–April), triggering widespread pore-pressure saturation.
* **Historical Catastrophes:** Mega-landslides such as Callapa (2011, over 140 hectares destroyed), Kantutani (2019), Llojeta, and Pampahasi illustrate the vital urgency for satellite-based early warning.
* **Pilot Scope:** **21 monitored hillside sectors** across all major municipal macrodistricts: *San Antonio, Cotahuma, Sur, Centro, Periférica, and Mallasa*.

---

## The BENNETT Solution & Architecture

BENNETT bridges raw satellite radar telemetry with frontline disaster risk reduction through a decoupled, multi-tiered architecture:

```
                                  ┌────────────────────────────────┐
                                  │   NASA Earth Observations      │
                                  │  • NISAR L0B/L2 GUNW & SME2    │
                                  │  • GPM IMERG Precipitation     │
                                  │  • ASF DAAC & CMR Search APIs  │
                                  └──────────────┬─────────────────┘
                                                 │
                                                 ▼
                                  ┌────────────────────────────────┐
                                  │  Data Pipeline (Python/HDF5)   │
                                  │  • filter_nisar_landslide.py   │
                                  │  • nisar_a_geojson.py          │
                                  │  • MintPy InSAR Processing     │
                                  └──────────────┬─────────────────┘
                                                 │
                                                 ▼
┌──────────────────────────────┐  REST / WS API  ┌────────────────────────────────┐  WebSocket / REST  ┌──────────────────────────────┐
│  BENNETT Web Platform        │◄───────────────►│  High-Performance Backend      │◄──────────────────►│  Citizen Mobile App          │
│  React 19 · Vite · Tailwind  │                 │  Rust · Axum · Tokio           │                    │  Kotlin · Jetpack Compose    │
│  MapLibre GL · Live HUD      │                 │  Clean/Hexagonal Architecture  │                    │  Live Risk Traffic Light     │
│  (challenge-dancing.vercel)  │                 │  Predictor + WS Alert Hub      │                    │  Full-screen Emergency Push  │
└──────────────────────────────┘                 └──────────────┬─────────────────┘                    └──────────────────────────────┘
                                                                │
                                                 ┌──────────────┴─────────────────┐
                                                 │ Subprocess ML Bridge (Optional)│
                                                 │ SLIDEGUARD_SOUP (Scikit/LoRA)  │
                                                 └────────────────────────────────┘
```

---

## Core Platform Features (Web UI)

The live web application ([https://challenge-dancing.vercel.app](https://challenge-dancing.vercel.app)) features four dedicated operational modules:

### 1. Home & Challenge Showcase (`#inicio` / `#home`)
* High-impact presentation of the 2026 NASA Space Apps Challenge *Dancing with the SARs*.
* Interactive Problem vs. Solution comparison matrix: from fragmented, isolated datasets to unified spatial decision intelligence.
* Quantified pilot impact across 4 dimensions: *Social, Institutional, Technological, and Environmental*.

### 2. Multi-Layer Interactive Map (`#mapa` / `#control`)
* **Base Maps:** High-resolution Esri satellite imagery and clean cartographic base styles.
* **Thematic Layers:**
  1. *Surface Displacement (InSAR):* Point cloud with velocity grading (mm/month) and temporal coherence ($\gamma$).
  2. *7-Day Accumulated Rainfall:* Satellite precipitation spatial footprint.
  3. *Estimated Soil Moisture:* Volumetric water content ($\theta_v$).
  4. *Terrain Slope Angle:* Graded topographic steepness.
  5. *Geological Substrate:* Categorized units color-coded by intrinsic vulnerability.
* **Comprehensive Slope Characterization:** Detailed inspection drawers with elevation, area (ha), aspect, mean slope, and time-series charts (InSAR cumulative movement vs. precipitation vs. coherence).

### 3. Scenario Simulator (`#simulador`)
* Stress-test slopes under hypothetical weather events: *Current Conditions, Moderate Rain, Severe Storm, Prolonged Wet Spell, and Extreme Storm*.
* Real-time recalculation of volumetric moisture, estimated velocity spikes, factor contribution breakdowns, and specific geotechnical mitigation recommendations.

### 4. Analysis & Decision Support Hub (`#analisis` / `#panel`)
* **Inspection Prioritization Table:** Real-time ranking of slopes by Attention Index ($0\text{--}100$) and dominant trigger.
* **Bivariate Scatter Analysis:** LOS Velocity vs. 7-Day Rainfall vs. Slope Angle.
* **Automated Technical Reports:** Generate standardized, printable technical reports per sector with characterization, risk metrics, and field guidance (exportable to PDF).
* **Open Data Export:** Instant CSV download of all pilot slope indicators.
* **Live Satellite Telemetry:** Real-time query to the Alaska Satellite Facility (ASF DAAC) for upcoming and archived NISAR acquisitions over the La Paz orbital track.

---

## NISAR Data Processing & Selective Filtering Pipeline

Standard raw NISAR scenes (`.h5`) reach **17 to 19 Gigabytes per pass**, laden with internal FPGA telemetry, engineering voltages, calibration tones, and secondary polarizations.

In `data/filter_nisar_landslide.py`, we engineered an in-memory optimized HDF5 extractor that preserves the official `/science/LSAR/` structure while achieving an **85% to 98% file size reduction**:

```bash
# Run the specialized NISAR landslide filter
python3 data/filter_nisar_landslide.py \
    --input data/NISAR_L0_PR_RRSD_..._001.h5 \
    --output data/NISAR_filtered_landslide.h5 \
    --crop-azimuth 0 4096 \
    --crop-range 0 4096 \
    --compression gzip \
    --compression-level 4
```

### Preserved vs. Discarded Datasets

| HDF5 Group / Variable | Physical Relevance | Geotechnical Action | Status |
| :--- | :--- | :--- | :---: |
| `/science/LSAR/identification/boundingPolygon` | WKT Footprint | GIS delineation and basin clipping | **Preserved** |
| `/science/LSAR/RRSD/.../frequencyA/txH/rxH/HH` | L-band Co-pol | Surface dielectric constant & moisture | **Preserved** |
| `/science/LSAR/RRSD/.../frequencyA/txH/rxV/HV` | L-band Cross-pol | Vegetation biomass decoupling | **Preserved** |
| `/science/LSAR/GUNW/.../unwrappedPhase` | InSAR Phase | Sub-centimeter creep displacement | **Preserved** |
| `/science/LSAR/GUNW/.../coherenceMagnitude` | Phase Coherence ($\gamma$) | Surface decorrelation & collapse scars | **Preserved** |
| `/science/LSAR/GUNW/.../incidenceAngle` | Radar Geometry | Radiometric terrain flattening ($\gamma^0$) | **Preserved** |
| `/science/LSAR/GUNW/.../layoverShadowMask` | Distortion Mask | Eliminates blind-spot false positives | **Preserved** |
| `/science/LSAR/RRSD/highRateTelemetry/*` | Bus Volatilities | Satellite internal diagnostics | *Discarded* |
| `.../listOfTxTRMs`, `attenuation`, `caltone` | SweepSAR Gain | Hardware engineering logs | *Discarded* |

---

## Multi-Factor Territorial Attention Index

The core risk evaluation evaluates each slope through a deterministic, transparent multi-factor index ($I \in [0, 100]$):

$$I = \min\left(100, \;\; 30 \cdot f_v + 25 \cdot f_p + 15 \cdot f_h + 15 \cdot f_s + 15 \cdot f_g\right)$$

Where each normalized component ($f \in [0, 1]$) represents:
1. **$f_v$ (Surface Displacement Rate):** Scaled from Line-of-Sight velocity $|\text{vel}| / 20\text{ mm/month}$.
2. **$f_p$ (Cumulative Precipitation):** Weighted combination of 24h, 72h, and 7-day rainfall relative to geotechnical saturation thresholds.
3. **$f_h$ (Estimated Soil Moisture):** Normalized volumetric soil moisture $(\theta_v - 0.15) / 0.25$.
4. **$f_s$ (Slope Topography):** Normalized terrain gradient $(\text{slope}^\circ - 15) / 30$.
5. **$f_g$ (Geological Susceptibility):** Empirical coefficient based on lithology (La Paz Fm. = $1.0$, Colluvium = $0.95$, Calvario till = $0.72$, Bedrock = $0.32$).

### Categorization & Operational Thresholds
* **Low ($I < 25$):** Routine monitoring on regular 12-day NISAR cycles.
* **Moderate ($25 \le I < 50$):** Close surveillance; monitor rain accumulation.
* **High ($50 \le I < 75$):** Technical engineering assessment within 1–2 weeks; check stormwater ditches.
* **Very High ($I \ge 75$):** Priority field inspection within 72 hours; neighborhood emergency coordination.

---

## Component Walkthrough

### Web Application (`website` / `website-example`)
* **Technology:** React 19, Vite, TypeScript, Tailwind CSS v4, MapLibre GL.
* **Live URL:** [https://challenge-dancing.vercel.app](https://challenge-dancing.vercel.app)
* **Features:** Responsive dark-mode aerospace HUD, interactive charts, persistent local storage for language, live ASF/CMR satellite queries, and dynamic printable technical reports.

### Rust Prediction & Streaming Backend (`backend`)
* **Technology:** Rust, Axum, Tokio, Serde, Tower-HTTP.
* **Role:** Serves territorial layers, slope risk evaluations (`GET /api/v1/zones`), scenario simulations (`POST /api/v1/simulate`), real-time WebSocket broadcast (`/ws/alerts`), and high-throughput raw TCP ingestion (`:8081`).
* **Design Pattern:** Clean/Hexagonal Architecture with domain ports, services, infrastructure adapters, and integration test coverage (`cargo test`).

### Citizen Mobile Application (`app-movile`)
* **Technology:** Android Native (Kotlin, Jetpack Compose, MVVM, Coroutines, OkHttp WebSocket).
* **Role:** Portable companion for citizens, drivers, and transit operators traversing steep Andean hillside routes. Provides a real-time risk traffic light and full-screen visual/audible alarms during acute emergencies.

### Data Science & ML Engine (`SLIDEGUARD_SOUP`)
* **Technology:** Python, Scikit-learn, HuggingFace Transformers, LoRA.
* **Role:** Subprocess prediction pipeline for empirical rainfall thresholds and multimodal landslide hazard classification. Automatically bridges into the Rust backend via `soup_adapter.rs`.

---

## Quickstart Guide

### 1. Web Platform (Frontend)
```bash
cd website
npm install
npm run dev
# Open http://localhost:5173 (or view live at https://challenge-dancing.vercel.app)
```

### 2. High-Performance Rust Backend
```bash
cd backend
cargo check
cargo test
cargo run
# Server listens on http://0.0.0.0:8080 (WS: /ws/alerts, TCP Ingest: :8081)
```

### 3. Native Android Application
```bash
cd app-movile
./gradlew assembleDebug
# Generated APK: app-movile/app/build/outputs/apk/debug/app-debug.apk
```

### 4. Ingesting Processed InSAR Data into Web GeoJSON
```bash
python3 website-example/scripts/nisar_a_geojson.py \
    --velocity path/to/geo_velocity.h5 \
    --coherence path/to/geo_temporalCoherence.h5 \
    --salida website/public/data/insar_lapaz.geojson
```

---

## Data Sources & Open Standards

* **NASA-ISRO Synthetic Aperture Radar (NISAR):** L-band and S-band radar telemetry (GUNW interferograms, SME2 soil moisture products).
* **NASA Global Precipitation Measurement (GPM IMERG):** Satellite precipitation estimates (24h, 72h, 7-day mobile accumulations).
* **Alaska Satellite Facility (ASF DAAC):** Direct API integration for orbital passes, footprints, and metadata.
* **NASA Earthdata CMR (Common Metadata Repository):** Fallback catalog search for spaceborne radar acquisitions.
* **NASA Global Landslide Catalog (COOLR):** Historical landslide inventory and spatial validation.
* **Open-Meteo API:** High-resolution meteorological backfill and 72-hour forecast.
* **OpenStreetMap & OpenFreeMap:** 3D urban footprints and street grid context.

---

## Team Members

Developed with passion for the **2026 NASA Space Apps Challenge**:

| Member | Discipline / Role | Profile |
| :--- | :--- | :--- |
| **Samuel Andrés Castañeta Argollo** | Computer Science | Architecture, Data Engineering & Algorithm Design |
| **Juan Gabriel Tantani Patti** | Computer Science | Web Platform, MapLibre 3D Visualizations & API Integration |
| **Carla Torrez Mamani** | Electronic Engineering | SAR Signal Telemetry, Radar Polarimetry & Sensor Analysis |
| **Jhoselin Daniela Pinto Quintana** | Industrial Engineering | Geotechnical Risk Indicators, Operations & Quality Analysis |

---

## Acknowledgments & License

* Developed for the **2026 NASA Space Apps Challenge** under the challenge **Dancing with the SARs**.
* NASA Space Apps is funded by NASA's Science Mission Directorate through a contract with Booz Allen Hamilton, Mindgrub, and SecondMuse.
* **License:** Released under the [MIT License](LICENSE).
