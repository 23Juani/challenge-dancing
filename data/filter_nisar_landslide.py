#!/usr/bin/env python3
"""
filter_nisar_landslide.py
=========================
Filtro optimizado en memoria y reestructurador HDF5 para productos SAR de la misión NASA-ISRO NISAR.
Especializado en la extracción de variables críticas para modelado y detección de DESLIZAMIENTOS DE TIERRA (Landslides).

Preserva de forma estricta la jerarquía interna estándar (/science/LSAR/...) y los metadatos/atributos del archivo original,
extrayendo selectivamente:
1. Datos sensibles a Humedad de Suelo y Vegetación:
   - Banda L (Frecuencia A) y Banda S (Frecuencia B)
   - Polarizaciones: HH y VV (constante dieléctrica / humedad) y HV (descontaminación de biomasa/vegetación)
2. Datos de Deformación, Fase y Estabilidad del Terreno:
   - unwrappedPhase (fase desenrollada InSAR), coherenceMagnitude (pérdida de coherencia / colapso)
   - matrices de covarianza / retrodispersión GCOV o señales complejas focalizadas RSLC
3. Topografía, Geometría y Metadatos Críticos:
   - identification (WKT boundingPolygon, tiempos Doppler, órbita, modo)
   - orbit y attitude (vectores de estado)
   - incidenceAngle, elevationAngle, layoverShadowMask, coordinateX, coordinateY, epsg
4. Soporte para Spatial Subsetting (líneas azimuto y muestras de rango) y compresión por bloques (gzip / lzf).

Autor: Ingeniero de Datos Geoespaciales & Especialista SAR NISAR
"""

import os
import sys
import time
import argparse
import h5py
import numpy as np


def log(msg, prefix="INFO"):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [{prefix}] {msg}", flush=True)


def copy_attributes(src_obj, dst_obj):
    """Copia todos los atributos y metadatos de un objeto HDF5 origen a uno destino."""
    for key, val in src_obj.attrs.items():
        try:
            dst_obj.attrs[key] = val
        except Exception as e:
            log(f"No se pudo copiar atributo {key}: {e}", prefix="WARN")


def copy_dataset_direct(src_dset, dst_group, name, slice_rows=None, slice_cols=None,
                        compression="gzip", compression_opts=4):
    """
    Copia un dataset HDF5 hacia el grupo destino. Si se especifican cortes (slice_rows o slice_cols),
    extrae únicamente la porción solicitada para mantener el consumo de memoria mínimo.
    """
    orig_shape = src_dset.shape
    dtype = src_dset.dtype

    # Datasets escalares
    if len(orig_shape) == 0:
        val = src_dset[()]
        dst_dset = dst_group.create_dataset(name, data=val)
        copy_attributes(src_dset, dst_dset)
        return dst_dset

    # Datasets unidimensionales
    if len(orig_shape) == 1:
        if slice_rows is not None and orig_shape[0] > (slice_rows[1] - slice_rows[0]):
            r_start = max(0, slice_rows[0])
            r_end = min(orig_shape[0], slice_rows[1])
            data = src_dset[r_start:r_end]
        else:
            data = src_dset[:]
            
        kwargs = {}
        if compression is not None and data.nbytes > 1024 * 64:
            kwargs["compression"] = compression
            if compression == "gzip":
                kwargs["compression_opts"] = compression_opts

        dst_dset = dst_group.create_dataset(name, data=data, **kwargs)
        copy_attributes(src_dset, dst_dset)
        return dst_dset

    # Datasets bidimensionales (matrices de swaths o grids)
    if len(orig_shape) == 2:
        if slice_rows is not None and slice_rows[0] < orig_shape[0]:
            r_start = max(0, slice_rows[0])
            r_end = min(orig_shape[0], slice_rows[1])
        else:
            r_start, r_end = 0, orig_shape[0]

        if slice_cols is not None and slice_cols[0] < orig_shape[1]:
            c_start = max(0, slice_cols[0])
            c_end = min(orig_shape[1], slice_cols[1])
        else:
            c_start, c_end = 0, orig_shape[1]

        target_shape = (r_end - r_start, c_end - c_start)
        log(f"Extrayendo matriz '{name}': forma original {orig_shape} -> recortada {target_shape}...")

        # Lectura directa en bloque
        data = src_dset[r_start:r_end, c_start:c_end]

        kwargs = {}
        if compression is not None:
            kwargs["compression"] = compression
            if compression == "gzip":
                kwargs["compression_opts"] = compression_opts

        dst_dset = dst_group.create_dataset(name, data=data, **kwargs)
        copy_attributes(src_dset, dst_dset)
        log(f"Dataset '{name}' guardado exitosamente ({data.nbytes / (1024**2):.2f} MB en RAM).")
        return dst_dset

    # Datasets de 3 o más dimensiones (ej. vectores de estado o chirps)
    if slice_rows is not None:
        r_start = max(0, slice_rows[0])
        r_end = min(orig_shape[0], slice_rows[1])
        data = src_dset[r_start:r_end]
    else:
        data = src_dset[:]

    kwargs = {}
    if compression is not None and data.nbytes > 1024 * 64:
        kwargs["compression"] = compression
        if compression == "gzip":
            kwargs["compression_opts"] = compression_opts

    dst_dset = dst_group.create_dataset(name, data=data, **kwargs)
    copy_attributes(src_dset, dst_dset)
    return dst_dset


def identify_product_level(src_file):
    """Detecta el tipo de producto NISAR inspeccionando /science/LSAR/identification."""
    try:
        ident = src_file["science/LSAR/identification"]
        prod_type = ident.get("productType", [b"UNKNOWN"])[()]
        if hasattr(prod_type, "decode"):
            prod_type = prod_type.decode("utf-8")
        prod_level = ident.get("productLevel", [b"UNKNOWN"])[()]
        if hasattr(prod_level, "decode"):
            prod_level = prod_level.decode("utf-8")
        return prod_type, prod_level
    except KeyError:
        return "UNKNOWN", "UNKNOWN"


def filter_nisar_hdf5(input_path, output_path, slice_lines=None, slice_samples=None,
                      compression="gzip", compression_opts=4):
    """
    Ejecuta el filtrado inteligente de variables críticas para deslizamientos de tierra.
    """
    start_time = time.time()
    in_size_mb = os.path.getsize(input_path) / (1024**2)
    log(f"Abriendo archivo NISAR: {input_path} ({in_size_mb / 1024:.2f} GB)")
    log(f"Destino optimizado: {output_path}")

    with h5py.File(input_path, "r") as src, h5py.File(output_path, "w") as dst:
        copy_attributes(src, dst)
        
        prod_type, prod_level = identify_product_level(src)
        log(f"Producto identificado: Nivel={prod_level} | Tipo={prod_type}")

        # 1. Asegurar grupo raíz estándar /science/LSAR
        if "science" not in src or "LSAR" not in src["science"]:
            raise ValueError("El archivo HDF5 no contiene la jerarquía canónica de NISAR '/science/LSAR'")
        
        sci_grp = dst.create_group("science")
        copy_attributes(src["science"], sci_grp)
        lsar_grp = sci_grp.create_group("LSAR")
        copy_attributes(src["science/LSAR"], lsar_grp)

        # 2. Copiar metadatos globales críticos: /science/LSAR/identification
        if "identification" in src["science/LSAR"]:
            log("Preservando metadatos críticos de identificación y huella geográfica WKT...")
            ident_dst = lsar_grp.create_group("identification")
            copy_attributes(src["science/LSAR/identification"], ident_dst)
            for k, dset in src["science/LSAR/identification"].items():
                if isinstance(dset, h5py.Dataset):
                    copy_dataset_direct(dset, ident_dst, k, compression=None)

        # 3. FILTRADO SEGÚN NIVEL DE PRODUCTO
        # A) PRODUCTOS NIVEL 0 (RRSD)
        if "RRSD" in src["science/LSAR"]:
            log("Procesando estructura de señal radar cruda L0 (RRSD)...")
            rrsd_dst = lsar_grp.create_group("RRSD")
            copy_attributes(src["science/LSAR/RRSD"], rrsd_dst)

            # Preservar órbitas y actitud (esenciales para cualquier algoritmo de geocodificación o focalización)
            if "lowRateTelemetry" in src["science/LSAR/RRSD"]:
                lrt_dst = rrsd_dst.create_group("lowRateTelemetry")
                copy_attributes(src["science/LSAR/RRSD/lowRateTelemetry"], lrt_dst)
                
                for tel_sub in ["orbit", "attitude"]:
                    if tel_sub in src["science/LSAR/RRSD/lowRateTelemetry"]:
                        tel_dst = lrt_dst.create_group(tel_sub)
                        src_tel = src[f"science/LSAR/RRSD/lowRateTelemetry/{tel_sub}"]
                        copy_attributes(src_tel, tel_dst)
                        for tk, tdset in src_tel.items():
                            if isinstance(tdset, h5py.Dataset):
                                copy_dataset_direct(tdset, tel_dst, tk, compression=None)

            # Preservar swaths de frecuencia A (Banda L) y B (Banda S), polarizaciones HH, VV, HV
            if "swaths" in src["science/LSAR/RRSD"]:
                swaths_dst = rrsd_dst.create_group("swaths")
                src_swaths = src["science/LSAR/RRSD/swaths"]
                copy_attributes(src_swaths, swaths_dst)

                for freq in ["frequencyA", "frequencyB"]:
                    if freq in src_swaths:
                        log(f"Preservando canal {freq} (Banda {'L (~24cm)' if freq=='frequencyA' else 'S (~12cm)'})...")
                        freq_dst = swaths_dst.create_group(freq)
                        src_freq = src_swaths[freq]
                        copy_attributes(src_freq, freq_dst)

                        # Copiar datasets directos de frecuencia si existen
                        for fk, fdset in src_freq.items():
                            if isinstance(fdset, h5py.Dataset):
                                copy_dataset_direct(fdset, freq_dst, fk, compression=None)

                        # Canales de transmisión (txH o txV)
                        for tx_name in ["txH", "txV"]:
                            if tx_name in src_freq:
                                tx_dst = freq_dst.create_group(tx_name)
                                src_tx = src_freq[tx_name]
                                copy_attributes(src_tx, tx_dst)

                                # Copiar parámetros de chirp y temporización
                                for txk in ["slantRange", "UTCtime", "centerFrequency", "nominalAcquisitionPRF",
                                           "sceneCenterAlongTrackSpacing", "sceneCenterGroundRangeSpacing"]:
                                    if txk in src_tx:
                                        txdset = src_tx[txk]
                                        sl_r = slice_samples if txk == "slantRange" else (slice_lines if txk == "UTCtime" else None)
                                        copy_dataset_direct(txdset, tx_dst, txk, slice_rows=sl_r, compression=compression, compression_opts=compression_opts)

                                # Canales de recepción: rxH (contiene HH, VH) y rxV (contiene HV, VV)
                                for rx_name in ["rxH", "rxV"]:
                                    if rx_name in src_tx:
                                        rx_dst = tx_dst.create_group(rx_name)
                                        src_rx = src_tx[rx_name]
                                        copy_attributes(src_rx, rx_dst)

                                        # Filtrar polarizaciones relevantes para deslizamientos: HH, VV, HV
                                        for pol in ["HH", "VV", "HV"]:
                                            if pol in src_rx:
                                                log(f"Extrayendo matriz de eco radar: {freq}/{tx_name}/{rx_name}/{pol}...")
                                                copy_dataset_direct(
                                                    src_rx[pol], rx_dst, pol,
                                                    slice_rows=slice_lines,
                                                    slice_cols=slice_samples,
                                                    compression=compression,
                                                    compression_opts=compression_opts
                                                )

        # B) PRODUCTOS NIVEL 2 INTERFEROMÉTRICOS (GUNW) O DE COVARIANZA (GCOV)
        for prod_key in ["GUNW", "GCOV", "RSLC", "RIFG"]:
            if prod_key in src["science/LSAR"]:
                log(f"Procesando capas de producto NISAR {prod_key}...")
                prod_dst = lsar_grp.create_group(prod_key)
                src_prod = src[f"science/LSAR/{prod_key}"]
                copy_attributes(src_prod, prod_dst)

                if "grids" in src_prod:
                    grids_dst = prod_dst.create_group("grids")
                    src_grids = src_prod["grids"]
                    copy_attributes(src_grids, grids_dst)

                    for freq in ["frequencyA", "frequencyB"]:
                        if freq in src_grids:
                            fgrid_dst = grids_dst.create_group(freq)
                            src_fgrid = src_grids[freq]
                            copy_attributes(src_fgrid, fgrid_dst)

                            landslide_vars = [
                                "unwrappedPhase",        # Deformación continua
                                "coherenceMagnitude",    # Estabilidad del suelo / pérdida por desprendimiento
                                "connectedComponents",   # Control de calidad del desenrollado
                                "HHHH", "VVVV", "HVHV",  # Retrodispersión de covarianza (humedad y vegetación)
                                "HH", "VV", "HV",        # Complejos focalizados
                                "incidenceAngle",        # Topografía y corrección de pendiente
                                "elevationAngle",        # Ángulo de mirada local
                                "layoverShadowMask",     # Máscara de zonas ciegas en relieve montañoso
                                "coordinateX",           # Coordenadas geográficas UTM / WGS84
                                "coordinateY",
                                "epsg"                   # Código de proyección espacial
                            ]

                            for var in landslide_vars:
                                if var in src_fgrid:
                                    log(f"Extrayendo variable crítica de ladera: {prod_key}/grids/{freq}/{var}")
                                    copy_dataset_direct(
                                        src_fgrid[var], fgrid_dst, var,
                                        slice_rows=slice_lines,
                                        slice_cols=slice_samples,
                                        compression=compression,
                                        compression_opts=compression_opts
                                    )

    out_size_mb = os.path.getsize(output_path) / (1024**2)
    elapsed = time.time() - start_time
    reduccion = (1.0 - (out_size_mb / in_size_mb)) * 100

    log("=" * 60)
    log(f"Filtrado completado exitosamente en {elapsed:.2f} segundos.")
    log(f"Tamaño original:  {in_size_mb:.2f} MB ({in_size_mb / 1024:.2f} GB)")
    log(f"Tamaño filtrado:  {out_size_mb:.2f} MB ({out_size_mb / 1024:.2f} GB)")
    log(f"Reducción lograda: {reduccion:.2f}% de espacio ahorrado")
    log("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Filtro HDF5 para extracción de variables críticas de deslizamientos en datos NISAR SAR."
    )
    parser.add_argument("--input", "-i", required=True, help="Ruta al archivo original NISAR .h5")
    parser.add_argument("--output", "-o", default=None, help="Ruta de salida (por defecto: <nombre>_landslide_filtered.h5)")
    parser.add_argument("--slice-lines", nargs=2, type=int, default=None,
                        metavar=("START", "END"), help="Rango de líneas azimutales para subsetting (ej. 10000 15000)")
    parser.add_argument("--slice-samples", nargs=2, type=int, default=None,
                        metavar=("START", "END"), help="Rango de muestras de rango para subsetting (ej. 10000 15000)")
    parser.add_argument("--compression", choices=["gzip", "lzf", "none"], default="gzip",
                        help="Algoritmo de compresión para datasets HDF5 (default: gzip)")
    parser.add_argument("--gzip-level", type=int, default=4, choices=range(1, 10),
                        help="Nivel de compresión gzip entre 1 y 9 (default: 4)")

    args = parser.parse_args()

    if not os.path.isfile(args.input):
        print(f"Error: El archivo de entrada '{args.input}' no existe.", file=sys.stderr)
        sys.exit(1)

    if args.output is None:
        base, ext = os.path.splitext(args.input)
        args.output = f"{base}_landslide_filtered{ext}"

    comp = None if args.compression == "none" else args.compression

    filter_nisar_hdf5(
        input_path=args.input,
        output_path=args.output,
        slice_lines=args.slice_lines,
        slice_samples=args.slice_samples,
        compression=comp,
        compression_opts=args.gzip_level
    )


if __name__ == "__main__":
    main()
