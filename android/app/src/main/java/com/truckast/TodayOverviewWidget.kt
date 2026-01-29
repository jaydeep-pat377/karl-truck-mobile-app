package com.truckast

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews

class TodayOverviewWidget : AppWidgetProvider() {

    companion object {
        const val PREFS_NAME = "TodayOverviewWidgetPrefs"
        const val KEY_TOTAL_ORDERS = "total_orders"
        const val KEY_NORMAL = "normal"
        const val KEY_WILL_CALL = "will_call"
        const val KEY_HOLD = "hold"
        const val KEY_CANCELLED = "cancelled"
        const val KEY_IN_PROGRESS = "in_progress"
        const val KEY_COMPLETED = "completed"
        const val KEY_PROGRESS = "progress"
        const val KEY_IS_LOGGED_IN = "is_logged_in"
        const val KEY_ACCESS_TOKEN = "access_token"
        const val KEY_API_BASE_URL = "api_base_url"

        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(context, TodayOverviewWidget::class.java)
            )

            // Notify that data changed for ListView
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, R.id.widget_list)

            // Send update broadcast
            val intent = Intent(context, TodayOverviewWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
            }
            context.sendBroadcast(intent)
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // First widget added - start periodic updates
        WidgetUpdateReceiver.startPeriodicUpdates(context)
    }

    override fun onDisabled(context: Context) {
        // Last widget removed - stop periodic updates
        WidgetUpdateReceiver.stopPeriodicUpdates(context)
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val isLoggedIn = prefs.getBoolean(KEY_IS_LOGGED_IN, false)

        val views = RemoteViews(context.packageName, R.layout.widget_today_overview)

        if (isLoggedIn) {
            val totalOrders = prefs.getInt(KEY_TOTAL_ORDERS, 0)
            val completed = prefs.getInt(KEY_COMPLETED, 0)
            val progress = if (totalOrders > 0) (completed * 100 / totalOrders) else 0

            // Show logged in content, hide logged out message
            views.setViewVisibility(R.id.widget_content, View.VISIBLE)
            views.setViewVisibility(R.id.widget_logged_out, View.GONE)

            // Set progress
            views.setTextViewText(R.id.widget_progress_percent, "$progress%")

            // Set up ListView adapter
            val serviceIntent = Intent(context, WidgetService::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
            }
            views.setRemoteAdapter(R.id.widget_list, serviceIntent)

        } else {
            // Show logged out message, hide content
            views.setViewVisibility(R.id.widget_content, View.GONE)
            views.setViewVisibility(R.id.widget_logged_out, View.VISIBLE)
        }

        // Set click intent to open app
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
