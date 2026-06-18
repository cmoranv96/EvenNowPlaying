package com.example.evennowplaying

import android.app.Activity
import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var description: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
        }

        val title = TextView(this).apply {
            text = "Even Now Playing"
            textSize = 24f
            gravity = Gravity.CENTER
        }

        description = TextView(this).apply {
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 24)
        }

        val settingsButton = Button(this).apply {
            text = "Open notification access"
            setOnClickListener {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            }
        }

        val reconnectButton = Button(this).apply {
            text = "Reconnect bridge"
            setOnClickListener {
                NotificationListenerService.requestRebind(listenerComponentName())
                updateStatusText()
            }
        }

        root.addView(title)
        root.addView(description)
        root.addView(settingsButton)
        root.addView(reconnectButton)
        setContentView(root)
    }

    override fun onResume() {
        super.onResume()
        updateStatusText()
    }

    private fun updateStatusText() {
        description.text = if (isNotificationListenerEnabled()) {
            "Notification access is enabled. Open YouTube Music and keep this app installed; the local bridge runs at 127.0.0.1:8765."
        } else {
            "Enable notification access so the app can read and control YouTube Music."
        }
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val enabledListeners = Settings.Secure.getString(
            contentResolver,
            "enabled_notification_listeners",
        ).orEmpty()
        return enabledListeners.contains(packageName)
    }

    private fun listenerComponentName(): ComponentName {
        return ComponentName(this, NowPlayingListenerService::class.java)
    }
}
