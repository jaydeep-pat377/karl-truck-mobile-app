package com.truckast

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews

class TodayOverviewWidget : AppWidgetProvider() {

    companion object {
        const val PREFS_NAME = "TodayOverviewWidgetPrefs"
        const val KEY_TOTAL_ORDERS = "total_orders"
        const val KEY_IN_PROGRESS = "in_progress"
        const val KEY_COMPLETED = "completed"
        const val KEY_PROGRESS = "progress"
        const val KEY_IS_LOGGED_IN = "is_logged_in"

        fun updateAllWidgets(context: Context) {
            val intent = Intent(context, TodayOverviewWidget::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(context, TodayOverviewWidget::class.java)
            )
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
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
        // First widget added
    }

    override fun onDisabled(context: Context) {
        // Last widget removed
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
            val inProgress = prefs.getInt(KEY_IN_PROGRESS, 0)
            val completed = prefs.getInt(KEY_COMPLETED, 0)
            val progress = prefs.getInt(KEY_PROGRESS, 0)

            // Show logged in content, hide logged out message
            views.setViewVisibility(R.id.widget_content, View.VISIBLE)
            views.setViewVisibility(R.id.widget_logged_out, View.GONE)

            // Set stats
            views.setTextViewText(R.id.widget_total_orders, totalOrders.toString())
            views.setTextViewText(R.id.widget_in_progress, inProgress.toString())
            views.setTextViewText(R.id.widget_completed, completed.toString())
            views.setTextViewText(R.id.widget_progress_percent, "$progress%")

            // Set progress bar
            views.setProgressBar(R.id.widget_progress_bar, 100, progress, false)
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
