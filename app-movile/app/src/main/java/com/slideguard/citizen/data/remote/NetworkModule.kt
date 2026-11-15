package com.slideguard.citizen.data.remote

import android.os.Build
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

data class ServerAddress(val host: String, val port: Int)

/**
 * Fabrica de clientes de red. Como el host/puerto del backend es configurable en
 * runtime (dialogo de servidor), Retrofit y el cliente WebSocket se reconstruyen
 * cada vez que el usuario cambia la direccion, en lugar de fijarse en un singleton.
 */
object NetworkModule {

    fun isEmulator(): Boolean {
        val fingerprint = runCatching { Build.FINGERPRINT }.getOrNull() ?: ""
        val model = runCatching { Build.MODEL }.getOrNull() ?: ""
        val manufacturer = runCatching { Build.MANUFACTURER }.getOrNull() ?: ""
        val brand = runCatching { Build.BRAND }.getOrNull() ?: ""
        val device = runCatching { Build.DEVICE }.getOrNull() ?: ""
        val product = runCatching { Build.PRODUCT }.getOrNull() ?: ""

        return (fingerprint.startsWith("generic")
                || fingerprint.startsWith("unknown")
                || model.contains("google_sdk")
                || model.contains("Emulator")
                || model.contains("Android SDK built for x86")
                || manufacturer.contains("Genymotion")
                || (brand.startsWith("generic") && device.startsWith("generic"))
                || "google_sdk" == product)
    }

    /**
     * Limpia y normaliza una direccion de servidor ingresada por el usuario o leida de ajustes.
     * Soporta entradas completas como "http://127.0.0.1:8080/", "localhost", "127.0.0.1", "10.0.2.2", etc.
     * En emuladores Android, 127.0.0.1 y localhost apuntan al propio emulador; 10.0.2.2 es el alias
     * para acceder al host anfitrion donde corre el backend en Rust (http://127.0.0.1:8080/).
     * En dispositivos fisicos, 10.0.2.2 o localhost se traducen a 127.0.0.1 para funcionar con `adb reverse tcp:8080 tcp:8080`.
     */
    fun parseServerAddress(rawHost: String, defaultPort: Int = 8080, forceEmulator: Boolean? = null): ServerAddress {
        var cleaned = rawHost.trim()
        if (cleaned.startsWith("http://", ignoreCase = true)) {
            cleaned = cleaned.substring(7)
        } else if (cleaned.startsWith("https://", ignoreCase = true)) {
            cleaned = cleaned.substring(8)
        }
        if (cleaned.endsWith("/")) {
            cleaned = cleaned.dropLast(1)
        }
        val slashIndex = cleaned.indexOf('/')
        if (slashIndex != -1) {
            cleaned = cleaned.substring(0, slashIndex)
        }

        var host = cleaned
        var port = defaultPort

        if (cleaned.contains(":")) {
            val parts = cleaned.split(":")
            host = parts[0]
            parts.getOrNull(1)?.toIntOrNull()?.let { extractedPort ->
                port = extractedPort
            }
        }

        val inEmulator = forceEmulator ?: isEmulator()

        if (inEmulator) {
            if (host == "127.0.0.1" || host.equals("localhost", ignoreCase = true) || host == "0.0.0.0") {
                host = "10.0.2.2"
            }
        } else {
            if (host == "10.0.2.2" || host.equals("localhost", ignoreCase = true) || host == "0.0.0.0") {
                host = "127.0.0.1"
            }
        }

        if (host.isEmpty()) {
            host = if (inEmulator) "10.0.2.2" else "127.0.0.1"
        }

        return ServerAddress(host, port)
    }

    fun httpBaseUrl(host: String, port: Int): String {
        val address = parseServerAddress(host, port)
        return "http://${address.host}:${address.port}/"
    }

    fun wsAlertsUrl(host: String, port: Int): String {
        val address = parseServerAddress(host, port)
        return "ws://${address.host}:${address.port}/ws/alerts"
    }

    fun buildOkHttpClient(): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        return OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(0, TimeUnit.SECONDS) // necesario para mantener el WebSocket abierto
            .build()
    }

    fun buildApiService(host: String, port: Int, client: OkHttpClient): ApiService {
        val retrofit = Retrofit.Builder()
            .baseUrl(httpBaseUrl(host, port))
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        return retrofit.create(ApiService::class.java)
    }
}
