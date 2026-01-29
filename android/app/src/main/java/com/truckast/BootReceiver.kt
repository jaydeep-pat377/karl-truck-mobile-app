package com.truckast

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            // Check if widget exists
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(context, TodayOverviewWidget::class.java)
            )

            if (appWidgetIds.isNotEmpty()) {
                // Restart periodic updates
                WidgetUpdateReceiver.startPeriodicUpdates(context)

                // Update widget immediately
                TodayOverviewWidget.updateAllWidgets(context)
            }
        }
    }
}
