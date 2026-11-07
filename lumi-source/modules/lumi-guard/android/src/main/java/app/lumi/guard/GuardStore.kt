package app.lumi.guard

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/** One app the user asked Lumi to help with. */
data class LimitRule(val pkg: String, val label: String, val minutes: Int, val pauseOnOpen: Boolean)

/** A phone-free time. Days use JavaScript numbering: 0 = Sunday ... 6 = Saturday. */
data class WindowRule(val label: String, val days: Set<Int>, val start: Int, val end: Int)

data class BedtimeRule(val enabled: Boolean, val start: Int, val end: Int, val grayscale: Boolean)

/** Everything the JavaScript app sends to the native guard (see src/services/guardSync.ts). */
data class GuardConfig(
  val limits: List<LimitRule>,
  val watched: Set<String>,
  val frictionMinutes: Int,
  val windows: List<WindowRule>,
  val bedtime: BedtimeRule,
  val focusUntil: Long,
  val strings: Map<String, String>,
  val suggestions: List<String>,
) {
  fun limitFor(pkg: String): LimitRule? = limits.firstOrNull { it.pkg == pkg }

  fun string(key: String, fallback: String): String = strings[key]?.takeIf { it.isNotBlank() } ?: fallback

  /** The phone-free window that is active right now, if any (handles windows that cross midnight). */
  fun activeWindow(now: Long = System.currentTimeMillis()): WindowRule? {
    val c = Calendar.getInstance().apply { timeInMillis = now }
    val minutes = c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE)
    val today = c.get(Calendar.DAY_OF_WEEK) - 1 // Calendar: 1 = Sunday
    val yesterday = (today + 6) % 7
    return windows.firstOrNull { w ->
      when {
        w.start == w.end -> false
        w.start < w.end -> today in w.days && minutes >= w.start && minutes < w.end
        else -> (today in w.days && minutes >= w.start) || (yesterday in w.days && minutes < w.end)
      }
    }
  }

  fun bedtimeActive(now: Long = System.currentTimeMillis()): Boolean {
    if (!bedtime.enabled || bedtime.start == bedtime.end) return false
    val c = Calendar.getInstance().apply { timeInMillis = now }
    val minutes = c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE)
    return if (bedtime.start < bedtime.end) minutes >= bedtime.start && minutes < bedtime.end
    else minutes >= bedtime.start || minutes < bedtime.end
  }

  companion object {
    val EMPTY = GuardConfig(emptyList(), emptySet(), 20, emptyList(), BedtimeRule(false, 0, 0, false), 0L, emptyMap(), emptyList())

    fun parse(json: String?): GuardConfig {
      if (json.isNullOrBlank()) return EMPTY
      return try {
        val o = JSONObject(json)
        val limits = o.optJSONArray("limits").objects().map {
          LimitRule(it.optString("pkg"), it.optString("label"), it.optInt("minutes", 0), it.optBoolean("pauseOnOpen", false))
        }.filter { it.pkg.isNotBlank() }
        val windows = o.optJSONArray("windows").objects().map {
          WindowRule(it.optString("label"), it.optJSONArray("days").ints().toSet(), it.optInt("start"), it.optInt("end"))
        }
        val bed = o.optJSONObject("bedtime")
        val stringsObj = o.optJSONObject("strings")
        val strings = HashMap<String, String>()
        stringsObj?.keys()?.forEach { key -> strings[key] = stringsObj.optString(key) }
        GuardConfig(
          limits = limits,
          watched = o.optJSONArray("watched").strings().toSet(),
          frictionMinutes = o.optInt("frictionMinutes", 20).coerceAtLeast(1),
          windows = windows,
          bedtime = BedtimeRule(
            bed?.optBoolean("enabled", false) ?: false,
            bed?.optInt("start", 0) ?: 0,
            bed?.optInt("end", 0) ?: 0,
            bed?.optBoolean("grayscale", false) ?: false,
          ),
          focusUntil = o.optLong("focusUntil", 0L),
          strings = strings,
          suggestions = o.optJSONArray("suggestions").strings(),
        )
      } catch (error: Exception) {
        EMPTY
      }
    }

    private fun JSONArray?.objects(): List<JSONObject> =
      if (this == null) emptyList() else (0 until length()).mapNotNull { optJSONObject(it) }

    private fun JSONArray?.strings(): List<String> =
      if (this == null) emptyList() else (0 until length()).map { optString(it) }.filter { it.isNotBlank() }

    private fun JSONArray?.ints(): List<Int> =
      if (this == null) emptyList() else (0 until length()).map { optInt(it) }
  }
}

/** Small persistent store shared by the module, the service and the pause screen. */
class GuardStore private constructor(context: Context) {
  private val prefs: SharedPreferences = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  @Volatile private var cachedConfig: GuardConfig? = null

  fun config(): GuardConfig = cachedConfig ?: GuardConfig.parse(prefs.getString(KEY_CONFIG, null)).also { cachedConfig = it }

  fun saveConfig(json: String) {
    prefs.edit().putString(KEY_CONFIG, json).apply()
    cachedConfig = GuardConfig.parse(json)
  }

  fun isEnabled(): Boolean = prefs.getBoolean(KEY_ENABLED, false)

  fun setEnabled(value: Boolean) {
    prefs.edit().putBoolean(KEY_ENABLED, value).apply()
  }

  /** "Open anyway" gives a short allowance so the pause screen doesn't keep reappearing. */
  fun allow(pkg: String, minutes: Int) {
    prefs.edit().putLong(KEY_ALLOW_PREFIX + pkg, System.currentTimeMillis() + minutes * 60_000L).apply()
  }

  fun hasAllowance(pkg: String, now: Long = System.currentTimeMillis()): Boolean =
    prefs.getLong(KEY_ALLOW_PREFIX + pkg, 0L) > now

  fun addEvent(pkg: String, label: String, reason: String, choice: String) {
    synchronized(lock) {
      val events = try {
        JSONArray(prefs.getString(KEY_EVENTS, "[]"))
      } catch (error: Exception) {
        JSONArray()
      }
      events.put(
        JSONObject()
          .put("at", System.currentTimeMillis())
          .put("packageName", pkg)
          .put("label", label)
          .put("reason", reason)
          .put("choice", choice),
      )
      // Keep the most recent 200 events only.
      val trimmed = JSONArray()
      val from = maxOf(0, events.length() - 200)
      for (i in from until events.length()) trimmed.put(events.get(i))
      prefs.edit().putString(KEY_EVENTS, trimmed.toString()).apply()
    }
  }

  /** Returns pause-screen outcomes recorded since the last call (for weekly insights) and clears them. */
  fun consumeEvents(): String {
    synchronized(lock) {
      val value = prefs.getString(KEY_EVENTS, "[]") ?: "[]"
      prefs.edit().putString(KEY_EVENTS, "[]").apply()
      return value
    }
  }

  var grayscaleSetByLumi: Boolean
    get() = prefs.getBoolean(KEY_GRAYSCALE_BY_LUMI, false)
    set(value) {
      prefs.edit().putBoolean(KEY_GRAYSCALE_BY_LUMI, value).apply()
    }

  fun widgetQuotes(): List<String> {
    return try {
      val array = JSONArray(prefs.getString(KEY_WIDGET_QUOTES, "[]"))
      (0 until array.length()).map { array.optString(it) }.filter { it.isNotBlank() }
    } catch (error: Exception) {
      emptyList()
    }
  }

  fun setWidgetQuotes(json: String) {
    prefs.edit().putString(KEY_WIDGET_QUOTES, json).apply()
  }

  companion object {
    private const val PREFS = "lumi_guard"
    private const val KEY_CONFIG = "config"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_EVENTS = "events"
    private const val KEY_ALLOW_PREFIX = "allow_"
    private const val KEY_GRAYSCALE_BY_LUMI = "grayscale_by_lumi"
    private const val KEY_WIDGET_QUOTES = "widget_quotes"
    private val lock = Any()

    @Volatile private var instance: GuardStore? = null

    fun get(context: Context): GuardStore =
      instance ?: synchronized(this) { instance ?: GuardStore(context).also { instance = it } }
  }
}
