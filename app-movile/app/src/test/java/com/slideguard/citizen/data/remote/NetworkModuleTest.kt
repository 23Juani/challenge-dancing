package com.slideguard.citizen.data.remote

import org.junit.Assert.assertEquals
import org.junit.Test

class NetworkModuleTest {

    @Test
    fun testParseServerAddress_emulatorMapping() {
        val result = NetworkModule.parseServerAddress("http://127.0.0.1:8080/", forceEmulator = true)
        assertEquals("10.0.2.2", result.host)
        assertEquals(8080, result.port)
    }

    @Test
    fun testParseServerAddress_physicalDeviceMapping() {
        val result = NetworkModule.parseServerAddress("http://10.0.2.2:8080/", forceEmulator = false)
        assertEquals("127.0.0.1", result.host)
        assertEquals(8080, result.port)
    }

    @Test
    fun testParseServerAddress_withLocalhostInEmulator() {
        val result = NetworkModule.parseServerAddress("localhost", 8080, forceEmulator = true)
        assertEquals("10.0.2.2", result.host)
        assertEquals(8080, result.port)
    }

    @Test
    fun testParseServerAddress_with10022InEmulator() {
        val result = NetworkModule.parseServerAddress("10.0.2.2", 8080, forceEmulator = true)
        assertEquals("10.0.2.2", result.host)
        assertEquals(8080, result.port)
    }

    @Test
    fun testParseServerAddress_withCustomIpAndPort() {
        val result = NetworkModule.parseServerAddress("http://192.168.1.50:9090/api", 8080, forceEmulator = false)
        assertEquals("192.168.1.50", result.host)
        assertEquals(9090, result.port)
    }

    @Test
    fun testHttpBaseUrl_endsClassicallyWithSlash() {
        val url = NetworkModule.httpBaseUrl("http://127.0.0.1:8080/", 8080)
        assertEquals("http://127.0.0.1:8080/", url)
    }

    @Test
    fun testWsAlertsUrl() {
        val url = NetworkModule.wsAlertsUrl("http://127.0.0.1:8080/", 8080)
        assertEquals("ws://127.0.0.1:8080/ws/alerts", url)
    }
}
