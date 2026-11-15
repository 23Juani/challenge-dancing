"""
BENNETT · Convierte la salida de MintPy (datos NISAR procesados) en el GeoJSON de puntos
que carga la web (public/data/... o el botón "Conectar tu dataset").

Uso típico (después de correr MintPy sobre tus pasadas NISAR de ASF):

    pip install h5py numpy
    python scripts/nisar_a_geojson.py \
        --velocity geo/geo_velocity.h5 \
        --coherence geo/geo_temporalCoherence.h5 \
        --velocity-anterior geo_2025/geo_velocity.h5 \
        --salida public/data/insar_lapaz.geojson

También acepta GeoTIFF (requiere rasterio): --velocity velocidad.tif

Propiedades de cada punto:
    v   = velocidad en línea de vista (mm/año, negativo = se aleja del satélite / baja)
    a   = aceleración: |v actual| / |v periodo anterior| (1 si no se da --velocity-anterior)
    coh = coherencia temporal (0-1)
"""
import argparse
import json

import numpy as np

# Recorte por defecto: valle de La Paz
BBOX = (-68.20, -16.58, -68.02, -16.45)  # lon_min, lat_min, lon_max, lat_max


def leer_raster(ruta, dataset=None):
    """Devuelve (array, lon0, lat0, dlon, dlat). Lee .h5 de MintPy geocodificado o GeoTIFF."""
    if ruta.endswith((".h5", ".he5")):
        import h5py

        with h5py.File(ruta, "r") as f:
            nombre = dataset or ("velocity" if "velocity" in f else list(f.keys())[0])
            datos = f[nombre][()]
            at = dict(f.attrs)
        if "X_FIRST" not in at:
            raise SystemExit(f"{ruta} no está geocodificado: corre 'geocode.py' de MintPy primero.")
        return (
            datos.astype("float64"),
            float(at["X_FIRST"]),
            float(at["Y_FIRST"]),
            float(at["X_STEP"]),
            float(at["Y_STEP"]),
        )
    import rasterio

    with rasterio.open(ruta) as src:
        datos = src.read(1).astype("float64")
        t = src.transform
        return datos, t.c, t.f, t.a, t.e


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--velocity", required=True)
    ap.add_argument("--coherence")
    ap.add_argument("--velocity-anterior", help="velocidad de un periodo anterior, para la aceleración")
    ap.add_argument("--unidad", choices=["m", "mm"], default="m", help="unidad de la velocidad de entrada (MintPy usa m/año)")
    ap.add_argument("--paso", type=int, default=3, help="tomar 1 de cada N píxeles (menos puntos = web más rápida)")
    ap.add_argument("--coh-min", type=float, default=0.3)
    ap.add_argument("--salida", default="public/data/insar_lapaz.geojson")
    args = ap.parse_args()

    v, lon0, lat0, dlon, dlat = leer_raster(args.velocity)
    escala = 1000.0 if args.unidad == "m" else 1.0
    v = v * escala

    coh = np.ones_like(v)
    if args.coherence:
        coh = leer_raster(args.coherence, "temporalCoherence")[0]

    acel = np.ones_like(v)
    if args.velocity_anterior:
        v0 = leer_raster(args.velocity_anterior)[0] * escala
        with np.errstate(divide="ignore", invalid="ignore"):
            acel = np.abs(v) / np.maximum(np.abs(v0), 2.0)

    filas, cols = v.shape
    feats = []
    for i in range(0, filas, args.paso):
        lat = lat0 + (i + 0.5) * dlat
        if not (BBOX[1] <= lat <= BBOX[3]):
            continue
        for j in range(0, cols, args.paso):
            lon = lon0 + (j + 0.5) * dlon
            if not (BBOX[0] <= lon <= BBOX[2]):
                continue
            vi, ci, ai = v[i, j], coh[i, j], acel[i, j]
            if not np.isfinite(vi) or vi == 0 or not np.isfinite(ci) or ci < args.coh_min:
                continue
            feats.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [round(lon, 6), round(lat, 6)]},
                    "properties": {
                        "v": round(float(vi), 1),
                        "a": round(float(ai) if np.isfinite(ai) else 1.0, 2),
                        "coh": round(float(ci), 2),
                    },
                }
            )

    with open(args.salida, "w") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f, separators=(",", ":"))
    print(f"{len(feats)} puntos guardados en {args.salida}")


if __name__ == "__main__":
    main()
