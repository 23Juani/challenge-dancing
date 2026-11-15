package com.slideguard.citizen.data.remote

import org.junit.Assert.assertEquals
import org.junit.Test

class NetworkModuleTest {

    @Test
    fun testParseServerAddress_withFullHttpUrl() {
        val result = NetworkModule.parseServerAddress("http://127.0.0.1:8080/")
        assertEquals("10.0.2.2", result.host)
        assertEquals(8080, result.port)
    }

    @Test
    fun testParseServerAddress_withLocalhost() {
        val result = NetworkModule.parseServerAddress("localhost", 8080)
        assertEquals("10.0.2.2", result.host)
        assertEquals(8080, result.port)
    }

    @Test
    fun testParseServerAddress_with10022() {
        val result = NetworkModule.parseServerAddress("10.0.2.2", 8080)
        assertEquals("10.0.2.2", result.host)
        assertEquals(8080, result.port)
    }

    @Test
    fun testParseServerAddress_withCustomIpAndPort() {
        val result = NetworkModule.parseServerAddress("http://192.168.1.50:9090/api", 8080)
        assertEquals("192.168.1.50", result.host)
        assertEquals(9090, result.port)
    }

    @Test
    fun testHttpBaseUrl_endsClassicallyWithSlash() {
        val url = NetworkModule.httpBaseUrl("http://127.0.0.1:8080/", 8080)
        assertEquals("http://10.0.2.2:8080/", url)
    }

    @Test
    fun testWsAlertsUrl() {
        val url = NetworkModule.wsAlertsUrl("http://127.0.0.1:8080/", 8080)
        assertEquals("ws://10.0.2.2:8080/ws/alerts", url)
    }
}
