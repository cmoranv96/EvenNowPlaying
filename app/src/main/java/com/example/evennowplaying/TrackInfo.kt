package com.example.evennowplaying

data class TrackInfo(
    val title: String,
    val artist: String,
    val album: String? = null,
    val isPlaying: Boolean = false,
    val durationMs: Long = 0L,
    val positionMs: Long = 0L,
    val positionUpdatedAtMs: Long = 0L,
) {
    fun displayText(): String {
        val state = if (isPlaying) "Playing" else "Paused"
        return "$state\n$title\n$artist"
    }
}
