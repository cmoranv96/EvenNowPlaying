package com.example.evennowplaying

import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.PlaybackState
import android.os.SystemClock

class YoutubeMusicController(
    private val controller: MediaController,
) {
    val packageName: String
        get() = controller.packageName

    fun readTrackInfo(): TrackInfo? {
        val metadata = controller.metadata ?: return null
        val title = metadata.getString(MediaMetadata.METADATA_KEY_TITLE).orEmpty()
        val artist = metadata.getString(MediaMetadata.METADATA_KEY_ARTIST).orEmpty()
        val album = metadata.getString(MediaMetadata.METADATA_KEY_ALBUM)
        val playbackState = controller.playbackState
        val state = playbackState?.state
        val durationMs = metadata.getLong(MediaMetadata.METADATA_KEY_DURATION).coerceAtLeast(0L)
        val positionMs = currentPositionMs(playbackState, durationMs)

        if (title.isBlank() && artist.isBlank()) return null

        return TrackInfo(
            title = title.ifBlank { "Unknown title" },
            artist = artist.ifBlank { "Unknown artist" },
            album = album,
            isPlaying = state == PlaybackState.STATE_PLAYING,
            durationMs = durationMs,
            positionMs = positionMs,
            positionUpdatedAtMs = System.currentTimeMillis(),
        )
    }

    fun playPause() {
        val state = controller.playbackState?.state
        if (state == PlaybackState.STATE_PLAYING) {
            pause()
        } else {
            play()
        }
    }

    fun play() {
        controller.transportControls.play()
    }

    fun pause() {
        controller.transportControls.pause()
    }

    fun next() {
        controller.transportControls.skipToNext()
    }

    fun previous() {
        val positionMs = currentPositionMs(
            playbackState = controller.playbackState,
            durationMs = controller.metadata?.getLong(MediaMetadata.METADATA_KEY_DURATION)?.coerceAtLeast(0L) ?: 0L,
        )

        if (positionMs > RESTART_TRACK_THRESHOLD_MS) {
            controller.transportControls.seekTo(0L)
        } else {
            controller.transportControls.skipToPrevious()
        }
    }

    private fun currentPositionMs(playbackState: PlaybackState?, durationMs: Long): Long {
        val state = playbackState?.state
        val basePositionMs = (playbackState?.position ?: 0L).coerceAtLeast(0L)
        val lastPositionUpdateTimeMs = (playbackState?.lastPositionUpdateTime ?: 0L).coerceAtLeast(0L)
        val playbackSpeed = playbackState?.playbackSpeed ?: 1f

        if (state != PlaybackState.STATE_PLAYING || lastPositionUpdateTimeMs <= 0L) {
            return basePositionMs
        }

        val elapsedMs = SystemClock.elapsedRealtime() - lastPositionUpdateTimeMs
        return (basePositionMs + (elapsedMs * playbackSpeed).toLong())
            .coerceIn(0L, durationMs.takeIf { it > 0L } ?: Long.MAX_VALUE)
    }

    fun registerCallback(callback: MediaController.Callback) {
        controller.registerCallback(callback)
    }

    fun unregisterCallback(callback: MediaController.Callback) {
        controller.unregisterCallback(callback)
    }

    private companion object {
        const val RESTART_TRACK_THRESHOLD_MS = 3_000L
    }
}
