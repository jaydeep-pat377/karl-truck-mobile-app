package com.truckast

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class TodayOverviewWidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TodayOverviewWidget"

    @ReactMethod
    fun updateWidgetData(
        totalOrders: Int,
        normal: Int,
        willCall: Int,
        hold: Int,
        cancelled: Int,
        inProgress: Int,
        completed: Int,
        progress: Int,
        promise: Promise
    ) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                TodayOverviewWidget.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            prefs.edit().apply {
                putBoolean(TodayOverviewWidget.KEY_IS_LOGGED_IN, true)
                putInt(TodayOverviewWidget.KEY_TOTAL_ORDERS, totalOrders)
                putInt(TodayOverviewWidget.KEY_NORMAL, normal)
                putInt(TodayOverviewWidget.KEY_WILL_CALL, willCall)
                putInt(TodayOverviewWidget.KEY_HOLD, hold)
                putInt(TodayOverviewWidget.KEY_CANCELLED, cancelled)
                putInt(TodayOverviewWidget.KEY_IN_PROGRESS, inProgress)
                putInt(TodayOverviewWidget.KEY_COMPLETED, completed)
                putInt(TodayOverviewWidget.KEY_PROGRESS, progress)
                apply()
            }

            // Trigger widget update
            TodayOverviewWidget.updateAllWidgets(reactApplicationContext)

            // Ensure periodic updates are running
            WidgetUpdateReceiver.startPeriodicUpdates(reactApplicationContext)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun setAuthCredentials(accessToken: String, apiBaseUrl: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                TodayOverviewWidget.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            prefs.edit().apply {
                putString(TodayOverviewWidget.KEY_ACCESS_TOKEN, accessToken)
                putString(TodayOverviewWidget.KEY_API_BASE_URL, apiBaseUrl)
                putBoolean(TodayOverviewWidget.KEY_IS_LOGGED_IN, true)
                apply()
            }

            // Start periodic updates with API fetching
            WidgetUpdateReceiver.startPeriodicUpdates(reactApplicationContext)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun refreshWidget(promise: Promise) {
        try {
            // Fetch fresh data from API
            WidgetApiService.fetchAndUpdateWidget(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun clearWidgetData(promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                TodayOverviewWidget.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            prefs.edit().apply {
                putBoolean(TodayOverviewWidget.KEY_IS_LOGGED_IN, false)
                putInt(TodayOverviewWidget.KEY_TOTAL_ORDERS, 0)
                putInt(TodayOverviewWidget.KEY_NORMAL, 0)
                putInt(TodayOverviewWidget.KEY_WILL_CALL, 0)
                putInt(TodayOverviewWidget.KEY_HOLD, 0)
                putInt(TodayOverviewWidget.KEY_CANCELLED, 0)
                putInt(TodayOverviewWidget.KEY_IN_PROGRESS, 0)
                putInt(TodayOverviewWidget.KEY_COMPLETED, 0)
                putInt(TodayOverviewWidget.KEY_PROGRESS, 0)
                remove(TodayOverviewWidget.KEY_ACCESS_TOKEN)
                remove(TodayOverviewWidget.KEY_API_BASE_URL)
                apply()
            }

            // Trigger widget update to show logged out state
            TodayOverviewWidget.updateAllWidgets(reactApplicationContext)

            // Stop periodic updates when logged out
            WidgetUpdateReceiver.stopPeriodicUpdates(reactApplicationContext)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
