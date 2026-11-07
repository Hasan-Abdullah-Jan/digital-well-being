package app.lumi.guard

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews
import java.util.Calendar

/** Home-screen widget with a daily quote matched to the user's goals (quotes come from the app). */
class QuoteWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    for (id in appWidgetIds) appWidgetManager.updateAppWidget(id, buildViews(context))
  }

  companion object {
    fun setQuotes(context: Context, json: String) {
      GuardStore.get(context).setWidgetQuotes(json)
      refreshAll(context)
    }

    fun refreshAll(context: Context) {
      try {
        val manager = AppWidgetManager.getInstance(context) ?: return
        val ids = manager.getAppWidgetIds(ComponentName(context, QuoteWidgetProvider::class.java))
        for (id in ids) manager.updateAppWidget(id, buildViews(context))
      } catch (error: Exception) {
        // No widgets placed, or widgets unsupported on this device.
      }
    }

    private fun todaysQuote(context: Context): String {
      val quotes = GuardStore.get(context).widgetQuotes()
      if (quotes.isEmpty()) return context.getString(R.string.lumi_widget_placeholder)
      val day = Calendar.getInstance().get(Calendar.DAY_OF_YEAR)
      return quotes[day % quotes.size]
    }

    private fun buildViews(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.lumi_quote_widget)
      views.setTextViewText(R.id.lumi_widget_quote, todaysQuote(context))
      views.setOnClickPendingIntent(R.id.lumi_widget_root, GuardNotifications.openAppIntent(context, null, 3))
      return views
    }
  }
}
