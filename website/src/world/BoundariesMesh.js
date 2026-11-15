/**
 * Delimitaciones Territoriales 3D estilo Google Maps:
 * - Límites municipales y metropolitanos (La Paz, El Alto, Palca, Mecapaca, Achocalla)
 * - Límites de cuencas y macrodistritos de riesgo geológico
 * - Red vial y autopistas estructurantes
 * Las líneas se proyectan adaptándose a la altimetría del terreno en 3D.
 */
import * as THREE from 'three';
import { makeProjector } from './geo.js';

export class BoundariesMesh {
  constructor({ baseLat, baseLon, terrain }) {
    this.project = makeProjector(baseLat, baseLon);
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.group.name = 'TerritorialBoundaries';

    this._buildMunicipalBoundaries();
    this._buildDistrictBoundaries();
    this._buildHighwayNetwork();
  }

  _buildMunicipalBoundaries() {
    // Polígono de delimitación metropolitana La Paz / El Alto
    const perimeterCoords = [
      [-16.46, -68.18],
      [-16.44, -68.14],
      [-16.45, -68.10],
      [-16.48, -68.08],
      [-16.51, -68.06],
      [-16.55, -68.05],
      [-16.58, -68.07],
      [-16.60, -68.10],
      [-16.58, -68.14],
      [-16.55, -68.18],
      [-16.51, -68.20],
      [-16.48, -68.21],
      [-16.46, -68.18],
    ];

    const points = [];
    perimeterCoords.forEach(([lat, lon]) => {
      const { x, z } = this.project(lat, lon);
      const y = this.terrain.heightAt(x, z) + 0.45;
      points.push(new THREE.Vector3(x, y, z));
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x0284c7, // Azul brillante Google Maps
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });

    const line = new THREE.Line(geometry, material);
    this.group.add(line);
  }

  _buildDistrictBoundaries() {
    // Delimitaciones de distritos de La Paz
    const districtSegments = [
      // Límite Cotahuma - Centro
      [
        [-16.495, -68.145],
        [-16.512, -68.138],
        [-16.530, -68.142],
      ],
      // Límite Centro - San Antonio
      [
        [-16.488, -68.125],
        [-16.505, -68.118],
        [-16.525, -68.112],
      ],
      // Límite San Jorge / Kantutani - Zona Sur
      [
        [-16.518, -68.122],
        [-16.538, -68.105],
        [-16.565, -68.085],
      ],
    ];

    const material = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 3,
      gapSize: 2,
      transparent: true,
      opacity: 0.65,
    });

    districtSegments.forEach((coords) => {
      const points = [];
      coords.forEach(([lat, lon]) => {
        const { x, z } = this.project(lat, lon);
        const y = this.terrain.heightAt(x, z) + 0.35;
        points.push(new THREE.Vector3(x, y, z));
      });
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      this.group.add(line);
    });
  }

  _buildHighwayNetwork() {
    // Red de carreteras principales
    const roads = [
      // Autopista La Paz - El Alto
      [
        [-16.48, -68.17],
        [-16.49, -68.15],
        [-16.50, -68.135],
      ],
      // Ruta hacia los Yungas (Unduavi / Coroico)
      [
        [-16.49, -68.11],
        [-16.45, -68.05],
        [-16.38, -67.92],
        [-16.32, -67.75],
      ],
    ];

    const roadMaterial = new THREE.LineBasicMaterial({
      color: 0xf59e0b, // Naranja vial
      linewidth: 2,
      transparent: true,
      opacity: 0.75,
    });

    roads.forEach((coords) => {
      const points = [];
      coords.forEach(([lat, lon]) => {
        const { x, z } = this.project(lat, lon);
        const y = this.terrain.heightAt(x, z) + 0.4;
        points.push(new THREE.Vector3(x, y, z));
      });
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, roadMaterial);
      this.group.add(line);
    });
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
