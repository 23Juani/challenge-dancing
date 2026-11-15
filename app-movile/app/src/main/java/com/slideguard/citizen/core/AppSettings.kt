package com.slideguard.citizen.core

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.slideguard.citizen.BuildConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "slideguard_settings")

/**
 * Configuracion persistida localmente: host/puerto del backend (editable desde la UI
 * para facilitar pruebas en red local o emulador `10.0.2.2` durante la demo) y el modo
 * de uso (Peaton/Conductor). `SOLUTION_NAME` NO se persiste aqui: viene de
 * `BuildConfig.SOLUTION_NAME`, la unica fuente de verdad de esa variable de marca.
 */
class AppSettings(private val context: Context) {

    private object Keys {
        val HOST = stringPreferencesKey("server_host")
        val PORT = intPreferencesKey("server_port")
        val DRIVER_MODE = booleanPreferencesKey("driver_mode")
    }

    val solutionName: String get() = BuildConfig.SOLUTION_NAME

    val serverHost: Flow<String> =
        context.dataStore.data.map { it[Keys.HOST] ?: BuildConfig.DEFAULT_SERVER_HOST }

    val serverPort: Flow<Int> =
        context.dataStore.data.map { it[Keys.PORT] ?: BuildConfig.DEFAULT_SERVER_PORT }

    val driverMode: Flow<Boolean> =
        context.dataStore.data.map { it[Keys.DRIVER_MODE] ?: false }

    suspend fun setServer(host: String, port: Int) {
        context.dataStore.edit {
            it[Keys.HOST] = host
            it[Keys.PORT] = port
        }
    }

    suspend fun setDriverMode(enabled: Boolean) {
        context.dataStore.edit { it[Keys.DRIVER_MODE] = enabled }
    }
}
