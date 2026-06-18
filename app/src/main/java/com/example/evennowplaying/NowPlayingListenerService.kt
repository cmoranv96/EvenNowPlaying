package com.example.evennowplaying

import android.content.ComponentName
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.service.notification.NotificationListenerService
import android.util.Log

class NowPlayingListenerService : NotificationListenerService() {
    private val displayClient: EvenDisplayClient = LoggingEvenDisplayClient()
    private val bridgeServer = LocalMusicBridgeServer { youtubeMusicController }

    private var mediaSessionManager: MediaSessionManager? = null
    private var youtubeMusicController: YoutubeMusicController? = null

    private val sessionsChangedListener = MediaSessionManager.OnActiveSessionsChangedListener {
        bindYoutubeMusicController()
    }

    private val mediaCallback = object : MediaController.Callback() {
        override fun onMetadataChanged(metadata: MediaMetadata?) {
            publishCurrentTrack()
        }

        override fun onPlaybackStateChanged(state: PlaybackState?) {
            publishCurrentTrack()
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        mediaSessionManager = getSystemService(MediaSessionManager::class.java)
        displayClient.connect()
        bridgeServer.start()

        mediaSessionManager?.addOnActiveSessionsChangedListener(
            sessionsChangedListener,
            listenerComponentName(),
        )
        bindYoutubeMusicController()
    }

    override fun onListenerDisconnected() {
        youtubeMusicController?.unregisterCallback(mediaCallback)
        youtubeMusicController = null
        bridgeServer.stop()
        mediaSessionManager?.removeOnActiveSessionsChangedListener(sessionsChangedListener)
        super.onListenerDisconnected()
    }

    fun nextTrack() {
        youtubeMusicController?.next()
    }

    fun previousTrack() {
        youtubeMusicController?.previous()
    }

    fun playPause() {
        youtubeMusicController?.playPause()
    }

    private fun bindYoutubeMusicController() {
        val componentName = listenerComponentName()
        val activeController = mediaSessionManager
            ?.getActiveSessions(componentName)
            ?.firstOrNull { it.packageName == YOUTUBE_MUSIC_PACKAGE }

        val currentPackage = youtubeMusicController?.packageName
        if (activeController == null) {
            if (currentPackage != null) {
                youtubeMusicController?.unregisterCallback(mediaCallback)
                youtubeMusicController = null
                displayClient.clear()
            }
            return
        }

        if (currentPackage == activeController.packageName) {
            publishCurrentTrack()
            return
        }

        youtubeMusicController?.unregisterCallback(mediaCallback)
        youtubeMusicController = YoutubeMusicController(activeController).also {
            it.registerCallback(mediaCallback)
        }
        publishCurrentTrack()
    }

    private fun publishCurrentTrack() {
        val trackInfo = youtubeMusicController?.readTrackInfo() ?: return
        Log.d(TAG, "Now playing: $trackInfo")
        displayClient.showNowPlaying(trackInfo)
    }

    private fun listenerComponentName(): ComponentName {
        return ComponentName(this, NowPlayingListenerService::class.java)
    }

    private companion object {
        const val TAG = "NowPlaying"
        const val YOUTUBE_MUSIC_PACKAGE = "com.google.android.apps.youtube.music"
    }
}
