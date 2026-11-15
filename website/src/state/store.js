/**
 * Store de estado global minimo (pub/sub). Mantiene capas, zonas, la zona
 * seleccionada, el ultimo mensaje de alerta en vivo y parametros de la escena
 * (exageracion de terreno, capas activas) para que los modulos UI y 3D se
 * mantengan sincronizados sin acoplarse directamente entre si.
 */
export class Store {
  constructor(initial = {}) {
    this.state = {
      config: null,
      layers: [],
      zones: [],
      selectedZone: null,
      selectedAssessment: null,
      activeLiveAlert: null,
      terrainExaggeration: 1.0,
      visibleLayerKinds: new Set(),
      observationHistoryIndex: 0,
      ...initial,
    };
    this.listeners = new Set();
  }

  get(key) {
    return this.state[key];
  }

  set(partial) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((fn) => fn(this.state, partial));
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const store = new Store();
