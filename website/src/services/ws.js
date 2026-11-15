/**
 * Cliente WebSocket hacia /ws/alerts con reconexion automatica. Reenvia cada mensaje
 * (live_alert | heartbeat) a los listeners registrados via `onMessage`.
 */
import { WS_ALERTS_URL } from '../config.js';

export class AlertsSocket {
  constructor() {
    this.listeners = new Set();
    this.socket = null;
    this.reconnectDelayMs = 2000;
    this._connect();
  }

  onMessage(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _connect() {
    try {
      this.socket = new WebSocket(WS_ALERTS_URL);
    } catch (err) {
      console.warn('No se pudo abrir WebSocket de alertas, reintentando...', err);
      this._scheduleReconnect();
      return;
    }

    this.socket.addEventListener('open', () => {
      console.info('[alerts] conectado a', WS_ALERTS_URL);
    });

    this.socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach((fn) => fn(data));
      } catch (err) {
        console.warn('Mensaje de alertas invalido', err);
      }
    });

    this.socket.addEventListener('close', () => {
      this._scheduleReconnect();
    });

    this.socket.addEventListener('error', () => {
      this.socket?.close();
    });
  }

  _scheduleReconnect() {
    setTimeout(() => this._connect(), this.reconnectDelayMs);
  }
}
