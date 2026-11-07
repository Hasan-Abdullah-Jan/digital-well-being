package app.lumi.guard

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import java.util.Calendar
import java.util.Locale

/**
 * Computes screen time from Android's usage events (the same raw data Digital Wellbeing uses).
 * Everything is computed and kept on the device.
 */
class UsageReader(private val context: Context) {
  private val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager

  class AppUsage(val packageName: String) {
    var ms: Long = 0
    var opens: Int = 0
  }

  class Result(val totalMs: Long, val pickups: Int, val apps: List<AppUsage>) {
    fun toMap(context: Context): Map<String, Any> = mapOf(
      "totalMs" to totalMs.toDouble(),
      "pickups" to pickups,
      "apps" to apps.map {
        mapOf(
          "packageName" to it.packageName,
          "label" to AppCatalog.label(context, it.packageName),
          "ms" to it.ms.toDouble(),
          "opens" to it.opens,
          "category" to AppCatalog.category(context, it.packageName),
        )
      },
    )
  }

  fun usageFor(start: Long, end: Long): Result {
    val ignored = AppCatalog.ignoredPackages(context)
    val apps = HashMap<String, AppUsage>()
    val resumedAt = HashMap<String, Long>()
    var pickups = 0
    var lastForeground: String? = null

    fun add(pkg: String, from: Long, to: Long) {
      if (pkg in ignored) return
      val s = maxOf(from, start)
      val e = minOf(to, end)
      if (e > s) apps.getOrPut(pkg) { AppUsage(pkg) }.ms += e - s
    }

    fun closeAll(at: Long) {
      for ((pkg, since) in resumedAt) add(pkg, since, at)
      resumedAt.clear()
    }

    val events = usm.queryEvents(start - LOOKBACK_MS, end) ?: return Result(0, 0, emptyList())
    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val pkg = event.packageName ?: continue
      val time = event.timeStamp
      when (event.eventType) {
        ACTIVITY_RESUMED -> {
          if (!resumedAt.containsKey(pkg)) resumedAt[pkg] = time
          if (time >= start && pkg != lastForeground && pkg !in ignored) {
            apps.getOrPut(pkg) { AppUsage(pkg) }.opens += 1
          }
          lastForeground = pkg
        }
        ACTIVITY_PAUSED, ACTIVITY_STOPPED -> {
          resumedAt.remove(pkg)?.let { since -> add(pkg, since, time) }
        }
        SCREEN_NON_INTERACTIVE, KEYGUARD_SHOWN, DEVICE_SHUTDOWN -> {
          closeAll(time)
          lastForeground = null
        }
        KEYGUARD_HIDDEN -> if (time >= start) pickups += 1
      }
    }
    closeAll(end)

    val list = apps.values.filter { it.ms > 0 || it.opens > 0 }.sortedByDescending { it.ms }
    return Result(list.sumOf { it.ms }, pickups, list)
  }

  fun usageToday(): Result = usageFor(startOfToday(), System.currentTimeMillis())

  /** Total screen time for each of the last [days] days (oldest first). */
  fun dailyTotals(days: Int): List<Map<String, Any>> {
    val result = ArrayList<Map<String, Any>>()
    val now = System.currentTimeMillis()
    val calendar = Calendar.getInstance()
    calendar.timeInMillis = startOfToday()
    calendar.add(Calendar.DAY_OF_YEAR, -(days - 1))
    repeat(days.coerceIn(1, 31)) {
      val start = calendar.timeInMillis
      calendar.add(Calendar.DAY_OF_YEAR, 1)
      val end = minOf(calendar.timeInMillis, now)
      val usage = usageFor(start, end)
      val c = Calendar.getInstance().apply { timeInMillis = start }
      val key = String.format(Locale.US, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH))
      result.add(mapOf("date" to key, "totalMs" to usage.totalMs.toDouble(), "pickups" to usage.pickups))
    }
    return result
  }

  companion object {
    // Event type values (named constants were added in different Android versions).
    const val ACTIVITY_RESUMED = 1
    const val ACTIVITY_PAUSED = 2
    const val SCREEN_NON_INTERACTIVE = 16
    const val KEYGUARD_SHOWN = 17
    const val KEYGUARD_HIDDEN = 18
    const val ACTIVITY_STOPPED = 23
    const val DEVICE_SHUTDOWN = 26

    /** Look a little before the range so sessions that started earlier are counted. */
    private const val LOOKBACK_MS = 3L * 60 * 60 * 1000

    fun startOfToday(): Long {
      val c = Calendar.getInstance()
      c.set(Calendar.HOUR_OF_DAY, 0)
      c.set(Calendar.MINUTE, 0)
      c.set(Calendar.SECOND, 0)
      c.set(Calendar.MILLISECOND, 0)
      return c.timeInMillis
    }
  }
}
