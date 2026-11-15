//! Hub de broadcast para `/ws/alerts`. Cualquier cliente conectado (website o app-movile)
//! recibe el mismo flujo de `AlertMessage` en tiempo real.

use tokio::sync::broadcast;

use crate::domain::models::AlertMessage;

#[derive(Clone)]
pub struct AlertsHub {
    sender: broadcast::Sender<AlertMessage>,
}

impl AlertsHub {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(256);
        Self { sender }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<AlertMessage> {
        self.sender.subscribe()
    }

    pub fn broadcast(&self, message: AlertMessage) {
        // Ignoramos el error "no hay receptores": es normal si no hay clientes conectados.
        let _ = self.sender.send(message);
    }

    pub fn receiver_count(&self) -> usize {
        self.sender.receiver_count()
    }
}

impl Default for AlertsHub {
    fn default() -> Self {
        Self::new()
    }
}
