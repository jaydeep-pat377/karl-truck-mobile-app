package com.truckast

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

object WidgetApiService {
    private const val TAG = "WidgetApiService"
    private const val DASHBOARD_ENDPOINT = "/dashboard"
    private const val TIMEOUT = 15000

    fun fetchAndUpdateWidget(context: Context) {
        thread {
            try {
                val prefs = context.getSharedPreferences(
                    TodayOverviewWidget.PREFS_NAME,
                    Context.MODE_PRIVATE
                )

                val accessToken = prefs.getString(TodayOverviewWidget.KEY_ACCESS_TOKEN, null)
                val apiBaseUrl = prefs.getString(TodayOverviewWidget.KEY_API_BASE_URL, null)

                if (accessToken.isNullOrEmpty() || apiBaseUrl.isNullOrEmpty()) {
                    Log.w(TAG, "No credentials stored, skipping API fetch")
                    return@thread
                }

                val url = URL("$apiBaseUrl$DASHBOARD_ENDPOINT")
                val connection = url.openConnection() as HttpURLConnection

                try {
                    connection.requestMethod = "GET"
                    connection.setRequestProperty("Authorization", "Bearer $accessToken")
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.connectTimeout = TIMEOUT
                    connection.readTimeout = TIMEOUT

                    val responseCode = connection.responseCode
                    Log.d(TAG, "API Response Code: $responseCode")

                    if (responseCode == HttpURLConnection.HTTP_OK) {
                        val reader = BufferedReader(InputStreamReader(connection.inputStream))
                        val response = StringBuilder()
                        var line: String?
                        while (reader.readLine().also { line = it } != null) {
                            response.append(line)
                        }
                        reader.close()

                        parseAndSaveData(context, response.toString())
                        TodayOverviewWidget.updateAllWidgets(context)
                        Log.d(TAG, "Widget updated with fresh API data")
                    } else if (responseCode == HttpURLConnection.HTTP_UNAUTHORIZED) {
                        Log.w(TAG, "Unauthorized - token may be expired")
                        // Mark as logged out if token is invalid
                        prefs.edit().putBoolean(TodayOverviewWidget.KEY_IS_LOGGED_IN, false).apply()
                        TodayOverviewWidget.updateAllWidgets(context)
                    } else {
                        Log.e(TAG, "API Error: $responseCode")
                    }
                } finally {
                    connection.disconnect()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching widget data: ${e.message}")
            }
        }
    }

    private fun parseAndSaveData(context: Context, jsonString: String) {
        try {
            val json = JSONObject(jsonString)

            if (!json.optBoolean("success", false)) {
                Log.w(TAG, "API returned success=false")
                return
            }

            val data = json.optJSONObject("data") ?: return
            val todayOverview = data.optJSONObject("today_overview") ?: return

            val totalOrders = todayOverview.optInt("total_orders", 0)
            val normal = todayOverview.optInt("normal", 0)
            val willCall = todayOverview.optInt("will_call", 0)
            val holdDelivery = todayOverview.optInt("hold_delivery", 0)
            val cancelled = todayOverview.optInt("cancelled", 0)
            val inProgress = todayOverview.optInt("in_progress", 0)
            val completed = todayOverview.optInt("completed", 0)

            val progress = if (totalOrders > 0) (completed * 100 / totalOrders) else 0

            val prefs = context.getSharedPreferences(
                TodayOverviewWidget.PREFS_NAME,
                Context.MODE_PRIVATE
            )

            prefs.edit().apply {
                putBoolean(TodayOverviewWidget.KEY_IS_LOGGED_IN, true)
                putInt(TodayOverviewWidget.KEY_TOTAL_ORDERS, totalOrders)
                putInt(TodayOverviewWidget.KEY_NORMAL, normal)
                putInt(TodayOverviewWidget.KEY_WILL_CALL, willCall)
                putInt(TodayOverviewWidget.KEY_HOLD, holdDelivery)
                putInt(TodayOverviewWidget.KEY_CANCELLED, cancelled)
                putInt(TodayOverviewWidget.KEY_IN_PROGRESS, inProgress)
                putInt(TodayOverviewWidget.KEY_COMPLETED, completed)
                putInt(TodayOverviewWidget.KEY_PROGRESS, progress)
                apply()
            }

            Log.d(TAG, "Data saved: total=$totalOrders, completed=$completed, progress=$progress%")
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing JSON: ${e.message}")
        }
    }
}
