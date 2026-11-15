package com.slideguard.citizen.data.remote

import com.google.gson.Gson
import com.slideguard.citizen.data.remote.dto.AlertMessageDto
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener

/**
 * Cliente WebSocket hacia `/ws/alerts`. Emite cada `AlertMessageDto` recibido
 * (live_alert | heartbeat) como un Flow, reconectando automaticamente si la
 * conexion se cae (por ejemplo al cambiar de red durante la demo).
 */
class AlertsWebSocketClient(private val client: OkHttpClient) {

    private val gson = Gson()

    fun connect(wsUrl: String): Flow<AlertMessageDto> = callbackFlow {
        var socket: WebSocket? = null
        var closedByUs = false

        fun open() {
            val request = Request.Builder().url(wsUrl).build()
            socket = client.newWebSocket(
                request,
                object : WebSocketListener() {
                    override fun onMessage(webSocket: WebSocket, text: String) {
                        runCatching { gson.fromJson(text, AlertMessageDto::class.java) }
                            .onSuccess { trySend(it) }
                    }

                    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                        if (!closedByUs) {
                            // Reintento simple tras una pausa breve.
                            Thread.sleep(2000)
                            if (!closedByUs) open()
                        }
                    }
                },
            )
        }

        open()

        awaitClose {
            closedByUs = true
            socket?.close(1000, "cliente cerrado")
        }
    }
}
