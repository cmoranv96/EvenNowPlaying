package com.example.evennowplaying

import android.util.Log

class LoggingEvenDisplayClient : EvenDisplayClient {
    override fun connect() {
        Log.d(TAG, "Even display client connected")
    }

    override fun showNowPlaying(trackInfo: TrackInfo) {
        Log.d(TAG, "Display on glasses:\n${trackInfo.displayText()}")
    }

    override fun clear() {
        Log.d(TAG, "Clear glasses display")
    }

    private companion object {
        const val TAG = "EvenDisplay"
    }
}
