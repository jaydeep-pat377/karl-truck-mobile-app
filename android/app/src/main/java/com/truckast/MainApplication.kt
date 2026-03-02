package com.truckast

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          add(TodayOverviewWidgetPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // Create notification channel BEFORE React Native loads
    // This ensures heads-up notifications work from the start
    createNotificationChannel()
    loadReactNative(this)
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channelId = "truckast_heads_up"
      val channelName = "TruckAst Alerts"
      val channelDescription = "Important alerts that appear on screen"
      val importance = NotificationManager.IMPORTANCE_HIGH

      val channel = NotificationChannel(channelId, channelName, importance).apply {
        description = channelDescription
        enableVibration(true)
        enableLights(true)
        setShowBadge(true)
        // This is crucial for heads-up notifications
        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
      }

      val notificationManager = getSystemService(NotificationManager::class.java)
      notificationManager?.createNotificationChannel(channel)
    }
  }
}
