package com.example.evennowplaying

import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.PlaybackState

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

        if (title.isBlank() && artist.isBlank()) return null

        return TrackInfo(
            title = title.ifBlank { "Unknown title" },
            artist = artist.ifBlank { "Unknown artist" },
            album = album,
            isPlaying = state == PlaybackState.STATE_PLAYING,
            durationMs = metadata.getLong(MediaMetadata.METADATA_KEY_DURATION).coerceAtLeast(0L),
            positionMs = (playbackState?.position ?: 0L).coerceAtLeast(0L),
            positionUpdatedAtMs = (playbackState?.lastPositionUpdateTime ?: 0L).coerceAtLeast(0L),
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
        controller.transportControls.skipToPrevious()
    }

    fun registerCallback(callback: MediaController.Callback) {
        controller.registerCallback(callback)
    }

    fun unregisterCallback(callback: MediaController.Callback) {
        controller.unregisterCallback(callback)
    }
}
