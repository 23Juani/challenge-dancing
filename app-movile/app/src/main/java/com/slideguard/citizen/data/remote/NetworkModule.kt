package com.slideguard.citizen.data.remote

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Fabrica de clientes de red. Como el host/puerto del backend es configurable en
 * runtime (dialogo de servidor), Retrofit y el cliente WebSocket se reconstruyen
 * cada vez que el usuario cambia la direccion, en lugar de fijarse en un singleton.
 */
object NetworkModule {

    fun httpBaseUrl(host: String, port: Int): String = "http://$host:$port"

    fun wsAlertsUrl(host: String, port: Int): String = "ws://$host:$port/ws/alerts"

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
