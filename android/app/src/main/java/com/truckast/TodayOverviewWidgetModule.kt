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
                putInt(TodayOverviewWidget.KEY_IN_PROGRESS, inProgress)
                putInt(TodayOverviewWidget.KEY_COMPLETED, completed)
                putInt(TodayOverviewWidget.KEY_PROGRESS, progress)
                apply()
            }

            // Trigger widget update
            TodayOverviewWidget.updateAllWidgets(reactApplicationContext)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun refreshWidget(promise: Promise) {
        try {
            TodayOverviewWidget.updateAllWidgets(reactApplicationContext)
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
                putInt(TodayOverviewWidget.KEY_IN_PROGRESS, 0)
                putInt(TodayOverviewWidget.KEY_COMPLETED, 0)
                putInt(TodayOverviewWidget.KEY_PROGRESS, 0)
                apply()
            }

            // Trigger widget update to show logged out state
            TodayOverviewWidget.updateAllWidgets(reactApplicationContext)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
