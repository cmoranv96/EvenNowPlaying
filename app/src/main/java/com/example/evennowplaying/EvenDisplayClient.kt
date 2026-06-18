package com.example.evennowplaying

interface EvenDisplayClient {
    fun connect()
    fun showNowPlaying(trackInfo: TrackInfo)
    fun clear()
}
