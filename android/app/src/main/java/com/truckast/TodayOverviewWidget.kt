package com.truckast

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.TypedValue
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

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle?
    ) {
        // Widget was resized, update it
        updateAppWidget(context, appWidgetManager, appWidgetId)
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val isLoggedIn = prefs.getBoolean(KEY_IS_LOGGED_IN, false)

            val views = RemoteViews(context.packageName, R.layout.widget_today_overview)

            if (isLoggedIn) {
                val totalOrders = prefs.getInt(KEY_TOTAL_ORDERS, 0)
                val normal = prefs.getInt(KEY_NORMAL, 0)
                val willCall = prefs.getInt(KEY_WILL_CALL, 0)
                val hold = prefs.getInt(KEY_HOLD, 0)
                val cancelled = prefs.getInt(KEY_CANCELLED, 0)
                val inProgress = prefs.getInt(KEY_IN_PROGRESS, 0)
                val completed = prefs.getInt(KEY_COMPLETED, 0)
                val progress = if (totalOrders > 0) (completed * 100 / totalOrders) else 0

                // Show logged in content, hide logged out message
                views.setViewVisibility(R.id.widget_content, View.VISIBLE)
                views.setViewVisibility(R.id.widget_logged_out, View.GONE)

                // Set progress percentage
                views.setTextViewText(R.id.widget_progress_percent, "$progress%")

                // Get widget width from options
                val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
                val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 300)

                // Update progress bar segments
                try {
                    updateProgressBar(views, context, totalOrders, willCall, hold, cancelled, normal, inProgress, completed, minWidth)
                } catch (e: Exception) {
                    android.util.Log.e("TodayOverviewWidget", "Error updating progress bar: ${e.message}")
                    // Hide progress bar on error
                    views.setViewVisibility(R.id.widget_progress_container, View.GONE)
                }

                // Update stats row
                try {
                    updateStatsRow(views, completed, inProgress)
                } catch (e: Exception) {
                    android.util.Log.e("TodayOverviewWidget", "Error updating stats row: ${e.message}")
                    views.setViewVisibility(R.id.widget_stats_row, View.GONE)
                }

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
                views.setViewVisibility(R.id.widget_progress_container, View.GONE)
                views.setViewVisibility(R.id.widget_stats_row, View.GONE)
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
        } catch (e: Exception) {
            android.util.Log.e("TodayOverviewWidget", "Error updating widget: ${e.message}", e)
        }
    }

    private fun updateProgressBar(
        views: RemoteViews,
        context: Context,
        totalOrders: Int,
        willCall: Int,
        hold: Int,
        cancelled: Int,
        normal: Int,
        inProgress: Int,
        completed: Int,
        widgetWidthDp: Int
    ) {
        if (totalOrders == 0) {
            views.setViewVisibility(R.id.widget_progress_container, View.GONE)
            return
        }

        views.setViewVisibility(R.id.widget_progress_container, View.VISIBLE)

        // Calculate segment data
        val segments = listOf(
            Pair(R.id.widget_segment_will_call, willCall),
            Pair(R.id.widget_segment_hold, hold),
            Pair(R.id.widget_segment_cancelled, cancelled),
            Pair(R.id.widget_segment_normal, normal),
            Pair(R.id.widget_segment_in_progress, inProgress),
            Pair(R.id.widget_segment_completed, completed)
        )

        // For API 31+, we can set exact widths
        // For older APIs, we just show/hide segments (they'll share space equally)
        val canSetWidth = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S

        if (canSetWidth) {
            // Get widget width in pixels
            val displayMetrics = context.resources.displayMetrics
            val widgetWidthPx = TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                widgetWidthDp.toFloat(),
                displayMetrics
            ).toInt()

            // Padding (6dp on each side = 12dp total)
            val paddingPx = TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                12f,
                displayMetrics
            ).toInt()

            val availableWidth = widgetWidthPx - paddingPx

            // Update each segment with proportional width
            for ((viewId, count) in segments) {
                if (count > 0) {
                    views.setViewVisibility(viewId, View.VISIBLE)
                    val percentage = count.toFloat() / totalOrders.toFloat()
                    val segmentWidth = (availableWidth * percentage).toInt().coerceAtLeast(4) // Minimum 4px
                    views.setViewLayoutWidth(viewId, segmentWidth.toFloat(), TypedValue.COMPLEX_UNIT_PX)
                } else {
                    views.setViewVisibility(viewId, View.GONE)
                }
            }
        } else {
            // For older APIs, just show/hide segments - they will share space equally
            for ((viewId, count) in segments) {
                views.setViewVisibility(viewId, if (count > 0) View.VISIBLE else View.GONE)
            }
        }
    }

    private fun updateStatsRow(views: RemoteViews, completed: Int, inProgress: Int) {
        views.setViewVisibility(R.id.widget_stats_row, View.VISIBLE)
        views.setTextViewText(R.id.widget_stats_completed, "$completed completed")
        views.setTextViewText(R.id.widget_stats_in_progress, "$inProgress in progress")
    }
}
