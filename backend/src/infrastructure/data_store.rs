//! Repositorio de datos territoriales.
//!
//! IMPORTANTE (transparencia de datos): el dataset NISAR filtrado disponible en `./data`
//! es una senal radar L0B cruda (RRSD), sin geocodificar ni procesar a InSAR, y cubre la
//! frontera amazonica Peru/Bolivia (~lon -71.1 a -68.1, lat -13.8 a -9.6), no la ciudad de
//! La Paz. No existen en el workspace mapas de deformacion, DEM, lluvia ni edificios ya
//! procesados para La Paz. Por lo tanto este repositorio genera capas **sinteticas pero
//! geometricamente coherentes** centradas en La Paz/El Alto (la zona de la demo), a partir
//! de un generador determinista (semilla fija) para que la demo sea reproducible.
//!
//! El backend sigue siendo la unica fuente de verdad: ni el website ni la app movil generan
//! estos valores, solo los consumen via API. Cuando existan capas reales derivadas del
//! pipeline NISAR (ver `SLIDEGUARD_SOUP` y `data/nisar_landslide_pipeline.ipynb`), basta con
//! sustituir la implementacion de este modulo sin tocar el resto de la arquitectura.

use std::collections::HashMap;
use std::sync::RwLock;

use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};

use crate::domain::models::{GeoPoint, Layer, LayerFeature, LayerKind, Zone};
use crate::domain::ports::DataRepository;

const BASE_LAT: f64 = -16.5204;
const BASE_LON: f64 = -68.1297;
const SEED: u64 = 20261114;

pub struct InMemoryDataRepository {
    layers: HashMap<LayerKind, Layer>,
    zones: RwLock<HashMap<String, Zone>>,
    zone_order: Vec<String>,
}

impl InMemoryDataRepository {
    pub fn bootstrap() -> Self {
        let mut rng = StdRng::seed_from_u64(SEED);
        let zones = build_zones(&mut rng);
        let zone_order: Vec<String> = zones.iter().map(|z| z.id.clone()).collect();
        let layers = build_layers(&mut rng, &zones);

        let mut zone_map = HashMap::new();
        for z in zones {
            zone_map.insert(z.id.clone(), z);
        }

        Self {
            layers,
            zones: RwLock::new(zone_map),
            zone_order,
        }
    }
}

impl DataRepository for InMemoryDataRepository {
    fn layer(&self, kind: LayerKind) -> Layer {
        self.layers
            .get(&kind)
            .cloned()
            .unwrap_or_else(|| Layer {
                kind,
                label: kind.label_es().to_string(),
                color: kind.color_hex().to_string(),
                source: "sintetico".to_string(),
                features: vec![],
            })
    }

    fn all_layers(&self) -> Vec<Layer> {
        LayerKind::all()
            .into_iter()
            .map(|k| self.layer(k))
            .collect()
    }

    fn zone(&self, id: &str) -> Option<Zone> {
        self.zones.read().unwrap().get(id).cloned()
    }

    fn all_zones(&self) -> Vec<Zone> {
        let guard = self.zones.read().unwrap();
        self.zone_order
            .iter()
            .filter_map(|id| guard.get(id).cloned())
            .collect()
    }

    fn nearest_zone(&self, lat: f64, lon: f64) -> Zone {
        let guard = self.zones.read().unwrap();
        let mut best: Option<(&Zone, f64)> = None;
        for z in guard.values() {
            let d = haversine_km(lat, lon, z.center.lat, z.center.lon);
            match &best {
                Some((_, bd)) if *bd <= d => {}
                _ => best = Some((z, d)),
            }
        }
        best.map(|(z, _)| z.clone()).unwrap_or_else(|| guard.values().next().cloned().unwrap())
    }
}

fn haversine_km(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let r = 6371.0;
    let d_lat = (lat2 - lat1).to_radians();
    let d_lon = (lon2 - lon1).to_radians();
    let a = (d_lat / 2.0).sin().powi(2)
        + lat1.to_radians().cos() * lat2.to_radians().cos() * (d_lon / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().asin();
    r * c
}

struct ZoneSpec {
    id: &'static str,
    name: &'static str,
    offset_lat: f64,
    offset_lon: f64,
    elevation_m: f64,
    slope_deg: f64,
    geology: &'static str,
    land_cover: &'static str,
}

fn zone_specs() -> Vec<ZoneSpec> {
    vec![
        ZoneSpec {
            id: "zona-piloto-cotahuma",
            name: "Zona de Monitoreo Piloto - Cotahuma",
            offset_lat: 0.012,
            offset_lon: -0.015,
            elevation_m: 3760.0,
            slope_deg: 32.5,
            geology: "Depositos coluviales",
            land_cover: "Urbano denso en ladera",
        },
        ZoneSpec {
            id: "zona-max-paredo",
            name: "Max Paredo / Periferica",
            offset_lat: 0.03,
            offset_lon: 0.01,
            elevation_m: 3920.0,
            slope_deg: 27.0,
            geology: "Lutitas y limos fracturados",
            land_cover: "Urbano disperso",
        },
        ZoneSpec {
            id: "zona-el-alto-sur",
            name: "El Alto Sur - Ceja",
            offset_lat: 0.09,
            offset_lon: -0.02,
            elevation_m: 4150.0,
            slope_deg: 14.0,
            geology: "Terrazas aluviales",
            land_cover: "Urbano / Infraestructura vial",
        },
        ZoneSpec {
            id: "zona-irpavi",
            name: "Irpavi - Achumani",
            offset_lat: -0.04,
            offset_lon: 0.03,
            elevation_m: 3440.0,
            slope_deg: 22.0,
            geology: "Conglomerados La Paz",
            land_cover: "Residencial / Vegetacion",
        },
        ZoneSpec {
            id: "zona-valle-de-la-luna",
            name: "Valle de la Luna - Mallasa",
            offset_lat: -0.08,
            offset_lon: 0.04,
            elevation_m: 3200.0,
            slope_deg: 38.0,
            geology: "Formaciones de erosion (badlands)",
            land_cover: "Suelo desnudo / Turistico",
        },
        ZoneSpec {
            id: "zona-illimani-base",
            name: "Base Illimani - Palca",
            offset_lat: -0.15,
            offset_lon: 0.18,
            elevation_m: 4600.0,
            slope_deg: 41.0,
            geology: "Roca metamorfica fracturada",
            land_cover: "Glaciar / Roca expuesta",
        },
    ]
}

fn build_zones(rng: &mut StdRng) -> Vec<Zone> {
    zone_specs()
        .into_iter()
        .map(|spec| {
            let center = GeoPoint {
                lat: BASE_LAT + spec.offset_lat,
                lon: BASE_LON + spec.offset_lon,
            };
            let polygon = polygon_around(center, 0.004 + rng.gen_range(0.0..0.003), rng);
            Zone {
                id: spec.id.to_string(),
                name: spec.name.to_string(),
                center,
                elevation_m: spec.elevation_m,
                slope_deg: spec.slope_deg,
                geology: spec.geology.to_string(),
                land_cover: spec.land_cover.to_string(),
                polygon,
            }
        })
        .collect()
}

fn polygon_around(center: GeoPoint, radius_deg: f64, rng: &mut StdRng) -> Vec<GeoPoint> {
    let sides = 8;
    (0..sides)
        .map(|i| {
            let angle = (i as f64) * (std::f64::consts::TAU / sides as f64);
            let jitter = 0.7 + rng.gen_range(0.0..0.6);
            GeoPoint {
                lat: center.lat + radius_deg * angle.cos() * jitter,
                lon: center.lon + radius_deg * 1.3 * angle.sin() * jitter,
            }
        })
        .collect()
}

fn build_layers(rng: &mut StdRng, zones: &[Zone]) -> HashMap<LayerKind, Layer> {
    let mut map = HashMap::new();

    // Terreno y Elevacion: puntos de malla con elevaciones de referencia (La Paz, El Alto, Illimani).
    let terrain_points = vec![
        ("Illimani", BASE_LAT - 0.15, BASE_LON + 0.18, 6462.0),
        ("El Alto", BASE_LAT + 0.09, BASE_LON - 0.02, 4150.0),
        ("La Paz Centro", BASE_LAT, BASE_LON, 3640.0),
        ("Irpavi", BASE_LAT - 0.04, BASE_LON + 0.03, 3440.0),
        ("Valle de la Luna", BASE_LAT - 0.08, BASE_LON + 0.04, 3200.0),
    ];
    map.insert(
        LayerKind::TerrenoElevacion,
        Layer {
            kind: LayerKind::TerrenoElevacion,
            label: LayerKind::TerrenoElevacion.label_es().to_string(),
            color: LayerKind::TerrenoElevacion.color_hex().to_string(),
            source: "DEM sintetico de referencia (relieve La Paz / El Alto / Illimani)".into(),
            features: terrain_points
                .iter()
                .map(|(name, lat, lon, elev)| LayerFeature {
                    id: format!("terrain-{}", name.to_lowercase().replace(' ', "-")),
                    name: name.to_string(),
                    position: GeoPoint { lat: *lat, lon: *lon },
                    elevation_m: *elev,
                    value: *elev,
                    unit: "m".into(),
                    polygon: None,
                })
                .collect(),
        },
    );

    // Imagen Satelital: metadata de la escena NISAR filtrada (referencia, no renderizable como tile real).
    map.insert(
        LayerKind::ImagenSatelital,
        Layer {
            kind: LayerKind::ImagenSatelital,
            label: LayerKind::ImagenSatelital.label_es().to_string(),
            color: LayerKind::ImagenSatelital.color_hex().to_string(),
            source: "NISAR L0B RRSD (./data) - orbita 6791, track 035, frame 118".into(),
            features: vec![LayerFeature {
                id: "sat-scene-nisar".into(),
                name: "Escena NISAR 2026-11-13T10:25:17Z".into(),
                position: GeoPoint { lat: BASE_LAT, lon: BASE_LON },
                elevation_m: 0.0,
                value: 1.0,
                unit: "escena".into(),
                polygon: None,
            }],
        },
    );

    // Deformacion InSAR: poligono pulsante naranja/rojo sobre la zona piloto.
    let insar_zone = &zones[0];
    map.insert(
        LayerKind::DeformacionInsar,
        Layer {
            kind: LayerKind::DeformacionInsar,
            label: LayerKind::DeformacionInsar.label_es().to_string(),
            color: LayerKind::DeformacionInsar.color_hex().to_string(),
            source: "Derivado sintetico (pendiente de pipeline InSAR real)".into(),
            features: zones
                .iter()
                .enumerate()
                .map(|(i, z)| {
                    let displacement = 4.0 + (i as f64 * 1.8) + rng.gen_range(0.0..3.0);
                    LayerFeature {
                        id: format!("insar-{}", z.id),
                        name: z.name.clone(),
                        position: z.center,
                        elevation_m: z.elevation_m,
                        value: displacement,
                        unit: "mm/mes".into(),
                        polygon: Some(z.polygon.clone()),
                    }
                })
                .collect(),
        },
    );
    let _ = insar_zone;

    // Monitoreo de Lluvias: estaciones pluviometricas sinteticas.
    map.insert(
        LayerKind::MonitoreoLluvias,
        Layer {
            kind: LayerKind::MonitoreoLluvias,
            label: LayerKind::MonitoreoLluvias.label_es().to_string(),
            color: LayerKind::MonitoreoLluvias.color_hex().to_string(),
            source: "Red pluviometrica sintetica".into(),
            features: zones
                .iter()
                .map(|z| LayerFeature {
                    id: format!("rain-{}", z.id),
                    name: format!("Pluviometro {}", z.name),
                    position: z.center,
                    elevation_m: z.elevation_m,
                    value: rng.gen_range(2.0..18.0),
                    unit: "mm/24h".into(),
                    polygon: None,
                })
                .collect(),
        },
    );

    // Estaciones de Monitoreo: nodos GNSS/sismicos.
    map.insert(
        LayerKind::EstacionesMonitoreo,
        Layer {
            kind: LayerKind::EstacionesMonitoreo,
            label: LayerKind::EstacionesMonitoreo.label_es().to_string(),
            color: LayerKind::EstacionesMonitoreo.color_hex().to_string(),
            source: "Red de estaciones GNSS/sismicas sintetica".into(),
            features: zones
                .iter()
                .enumerate()
                .map(|(i, z)| LayerFeature {
                    id: format!("station-{}", z.id),
                    name: format!("Estacion {}", i + 1),
                    position: GeoPoint {
                        lat: z.center.lat + 0.003,
                        lon: z.center.lon + 0.003,
                    },
                    elevation_m: z.elevation_m,
                    value: if rng.gen_bool(0.85) { 1.0 } else { 0.0 },
                    unit: "activa".into(),
                    polygon: None,
                })
                .collect(),
        },
    );

    // Susceptibilidad Geologica
    map.insert(
        LayerKind::SusceptibilidadGeologica,
        Layer {
            kind: LayerKind::SusceptibilidadGeologica,
            label: LayerKind::SusceptibilidadGeologica.label_es().to_string(),
            color: LayerKind::SusceptibilidadGeologica.color_hex().to_string(),
            source: "Mapa geologico de referencia (cualitativo)".into(),
            features: zones
                .iter()
                .map(|z| LayerFeature {
                    id: format!("geo-{}", z.id),
                    name: z.geology.clone(),
                    position: z.center,
                    elevation_m: z.elevation_m,
                    value: susceptibility_index(&z.geology, z.slope_deg),
                    unit: "indice 0-1".into(),
                    polygon: Some(z.polygon.clone()),
                })
                .collect(),
        },
    );

    // Infraestructura Urbana: vias principales (simplificadas) de La Paz/El Alto.
    map.insert(
        LayerKind::InfraestructuraUrbana,
        Layer {
            kind: LayerKind::InfraestructuraUrbana,
            label: LayerKind::InfraestructuraUrbana.label_es().to_string(),
            color: LayerKind::InfraestructuraUrbana.color_hex().to_string(),
            source: "Red vial de referencia simplificada".into(),
            features: vec![
                road_feature("Av. Periferica", BASE_LAT + 0.02, BASE_LON - 0.01),
                road_feature("Autopista La Paz - El Alto", BASE_LAT + 0.05, BASE_LON - 0.015),
                road_feature("Av. Costanera", BASE_LAT - 0.02, BASE_LON + 0.01),
            ],
        },
    );

    // Edificaciones Expuestas
    map.insert(
        LayerKind::EdificacionesExpuestas,
        Layer {
            kind: LayerKind::EdificacionesExpuestas,
            label: LayerKind::EdificacionesExpuestas.label_es().to_string(),
            color: LayerKind::EdificacionesExpuestas.color_hex().to_string(),
            source: "Estimacion sintetica de edificaciones en zonas de alta pendiente".into(),
            features: zones
                .iter()
                .map(|z| LayerFeature {
                    id: format!("buildings-{}", z.id),
                    name: format!("Edificaciones expuestas - {}", z.name),
                    position: z.center,
                    elevation_m: z.elevation_m,
                    value: (z.slope_deg * rng.gen_range(2.0..6.0)).round(),
                    unit: "edificaciones".into(),
                    polygon: None,
                })
                .collect(),
        },
    );

    // Escenarios de Riesgo: poligonos agregados por nivel.
    map.insert(
        LayerKind::EscenariosRiesgo,
        Layer {
            kind: LayerKind::EscenariosRiesgo,
            label: LayerKind::EscenariosRiesgo.label_es().to_string(),
            color: LayerKind::EscenariosRiesgo.color_hex().to_string(),
            source: "Escenarios agregados a partir de la evaluacion de riesgo por zona".into(),
            features: zones
                .iter()
                .map(|z| LayerFeature {
                    id: format!("scenario-{}", z.id),
                    name: z.name.clone(),
                    position: z.center,
                    elevation_m: z.elevation_m,
                    value: susceptibility_index(&z.geology, z.slope_deg),
                    unit: "indice 0-1".into(),
                    polygon: Some(z.polygon.clone()),
                })
                .collect(),
        },
    );

    map
}

fn road_feature(name: &str, lat: f64, lon: f64) -> LayerFeature {
    LayerFeature {
        id: format!("road-{}", name.to_lowercase().replace(' ', "-")),
        name: name.to_string(),
        position: GeoPoint { lat, lon },
        elevation_m: 3700.0,
        value: 1.0,
        unit: "via".into(),
        polygon: None,
    }
}

fn susceptibility_index(geology: &str, slope_deg: f64) -> f64 {
    let geology_factor = if geology.contains("coluvial") {
        0.9
    } else if geology.contains("erosion") {
        0.85
    } else if geology.contains("fractur") {
        0.75
    } else if geology.contains("Conglomerados") {
        0.5
    } else {
        0.4
    };
    let slope_factor = (slope_deg / 45.0).min(1.0);
    (0.5 * geology_factor + 0.5 * slope_factor).clamp(0.0, 1.0)
}
