package com.truckast

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import android.widget.RemoteViewsService

class WidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return WidgetListFactory(applicationContext)
    }
}

class WidgetListFactory(private val context: Context) : RemoteViewsService.RemoteViewsFactory {

    private data class KpiItem(
        val label: String,
        val value: Int,
        val color: String
    )

    private var items = listOf<KpiItem>()

    override fun onCreate() {
        loadData()
    }

    override fun onDataSetChanged() {
        loadData()
    }

    private fun loadData() {
        val prefs = context.getSharedPreferences(
            TodayOverviewWidget.PREFS_NAME,
            Context.MODE_PRIVATE
        )

        items = listOf(
            KpiItem("Normal", prefs.getInt(TodayOverviewWidget.KEY_NORMAL, 0), "#10B981"),
            KpiItem("Will Call", prefs.getInt(TodayOverviewWidget.KEY_WILL_CALL, 0), "#F59E0B"),
            KpiItem("Hold", prefs.getInt(TodayOverviewWidget.KEY_HOLD, 0), "#EF4444"),
            KpiItem("Cancelled", prefs.getInt(TodayOverviewWidget.KEY_CANCELLED, 0), "#DC2626"),
            KpiItem("In Progress", prefs.getInt(TodayOverviewWidget.KEY_IN_PROGRESS, 0), "#3B82F6"),
            KpiItem("Completed", prefs.getInt(TodayOverviewWidget.KEY_COMPLETED, 0), "#6BB130")
        )
    }

    override fun onDestroy() {
        items = emptyList()
    }

    override fun getCount(): Int = items.size

    override fun getViewAt(position: Int): RemoteViews {
        val item = items[position]
        return RemoteViews(context.packageName, R.layout.widget_list_item).apply {
            setTextViewText(R.id.item_value, item.value.toString())
            setTextViewText(R.id.item_label, item.label)
            setTextColor(R.id.item_value, Color.parseColor(item.color))
        }
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = true
}
