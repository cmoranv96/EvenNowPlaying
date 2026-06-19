package com.example.evennowplaying

import android.util.Log
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.util.concurrent.atomic.AtomicBoolean

class LocalMusicBridgeServer(
    private val controllerProvider: () -> YoutubeMusicController?,
) {
    private val running = AtomicBoolean(false)
    private var serverThread: Thread? = null
    private var serverSocket: ServerSocket? = null

    fun start() {
        if (!running.compareAndSet(false, true)) return

        serverThread = Thread {
            try {
                ServerSocket(PORT, 16, InetAddress.getByName(HOST)).use { socket ->
                    serverSocket = socket
                    Log.d(TAG, "Listening on http://$HOST:$PORT")

                    while (running.get()) {
                        val client = socket.accept()
                        Thread { handleClient(client) }.start()
                    }
                }
            } catch (error: Exception) {
                if (running.get()) {
                    Log.e(TAG, "Bridge server stopped unexpectedly", error)
                }
            } finally {
                running.set(false)
                serverSocket = null
            }
        }.apply {
            name = "EvenNowPlayingBridge"
            isDaemon = true
            start()
        }
    }

    fun stop() {
        running.set(false)
        serverSocket?.close()
        serverSocket = null
        serverThread = null
    }

    private fun handleClient(client: Socket) {
        client.use { socket ->
            val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
            val requestLine = reader.readLine().orEmpty()
            if (requestLine.isBlank()) return

            val parts = requestLine.split(" ")
            val method = parts.getOrNull(0).orEmpty()
            val path = parts.getOrNull(1).orEmpty().substringBefore("?")

            while (!reader.readLine().isNullOrBlank()) {
                // Drain headers.
            }

            if (method == "OPTIONS") {
                writeResponse(socket, 204, "")
                return
            }

            when {
                method != "GET" && method != "POST" -> writeJson(socket, 405, error("Method not allowed"))
                path == "/health" -> writeJson(socket, 200, JSONObject(mapOf("ok" to true)))
                path == "/now-playing" -> writeJson(socket, 200, nowPlayingJson())
                path.startsWith("/command/") -> writeJson(socket, 200, runCommand(path))
                else -> writeJson(socket, 404, error("Not found"))
            }
        }
    }

    private fun nowPlayingJson(): JSONObject {
        val controller = controllerProvider()
        val track = controller?.readTrackInfo()

        return JSONObject()
            .put("ok", true)
            .put("connected", controller != null)
            .put("packageName", controller?.packageName ?: "")
            .put("track", track?.toJson() ?: JSONObject.NULL)
    }

    private fun runCommand(path: String): JSONObject {
        val command = URLDecoder.decode(path.removePrefix("/command/"), StandardCharsets.UTF_8.name())
        val controller = controllerProvider()

        if (controller == null) {
            return JSONObject()
                .put("ok", false)
                .put("error", "YouTube Music media session not found")
        }

        when (command) {
            "next" -> controller.next()
            "previous" -> controller.previous()
            "play-pause" -> controller.playPause()
            "play" -> controller.play()
            "pause" -> controller.pause()
            "seek-back-5" -> controller.seekBackFiveSeconds()
            "seek-forward-5" -> controller.seekForwardFiveSeconds()
            "like" -> controller.likeTrack()
            "shuffle" -> controller.toggleShuffle()
            else -> {
                return JSONObject()
                    .put("ok", false)
                    .put("error", "Unknown command: $command")
            }
        }

        return JSONObject()
            .put("ok", true)
            .put("command", command)
    }

    private fun writeJson(socket: Socket, status: Int, body: JSONObject) {
        writeResponse(socket, status, body.toString())
    }

    private fun writeResponse(socket: Socket, status: Int, body: String) {
        val bodyBytes = body.toByteArray(StandardCharsets.UTF_8)
        val reason = when (status) {
            200 -> "OK"
            204 -> "No Content"
            404 -> "Not Found"
            405 -> "Method Not Allowed"
            else -> "Error"
        }

        PrintWriter(socket.getOutputStream(), false).use { writer ->
            writer.print("HTTP/1.1 $status $reason\r\n")
            writer.print("Content-Type: application/json; charset=utf-8\r\n")
            writer.print("Content-Length: ${bodyBytes.size}\r\n")
            writer.print("Access-Control-Allow-Origin: *\r\n")
            writer.print("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n")
            writer.print("Access-Control-Allow-Headers: Content-Type\r\n")
            writer.print("Connection: close\r\n")
            writer.print("\r\n")
            writer.flush()
            socket.getOutputStream().write(bodyBytes)
        }
    }

    private fun error(message: String): JSONObject {
        return JSONObject()
            .put("ok", false)
            .put("error", message)
    }

    private fun TrackInfo.toJson(): JSONObject {
        return JSONObject()
            .put("title", title)
            .put("artist", artist)
            .put("album", album ?: "")
            .put("isPlaying", isPlaying)
            .put("durationMs", durationMs)
            .put("positionMs", positionMs)
            .put("positionUpdatedAtMs", positionUpdatedAtMs)
    }

    private companion object {
        const val TAG = "LocalMusicBridge"
        const val HOST = "127.0.0.1"
        const val PORT = 8765
    }
}
