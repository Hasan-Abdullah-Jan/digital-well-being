package app.lumi.guard

import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.PowerManager
import android.util.Log

/**
 * A small foreground service that runs only while the user has pause screens switched on.
 * Every couple of seconds (only while the screen is on) it checks which app is in front.
 * If it's an app the user chose to limit, it shows the calm PauseActivity. It never reads
 * what happens inside other apps and never sends anything off the phone.
 */
class GuardService : Service() {
  private lateinit var thread: HandlerThread
  private lateinit var handler: Handler
  private lateinit var store: GuardStore
  private lateinit var usm: UsageStatsManager

  private var current: String? = null
  private val sessionStarts = HashMap<String, Long>()
  private val lastSeen = HashMap<String, Long>()
  private val blockable = HashMap<String, Boolean>()
  private var exempt: Set<String>? = null
  private var screenOnSince = 0L
  private var lastEyeAt = 0L
  private var nudgedThisSession = false
  private var lastEventQuery = 0L
  private var lastLaunchAt = 0L
  private var lastStayCheck = 0L
  private var lastGrayscaleCheck = 0L
  private val lastPauseAt = HashMap<String, Long>()
  private val usageCache = HashMap<String, Pair<Long, Long>>() // pkg -> (computedAt, ms)

  private val tick = object : Runnable {
    override fun run() {
      var delay = TICK_MS
      try {
        delay = check()
      } catch (error: Throwable) {
        Log.w(TAG, "Guard check failed", error)
      }
      handler.postDelayed(this, delay)
    }
  }

  override fun onCreate() {
    super.onCreate()
    store = GuardStore.get(this)
    usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    goForeground()
    isRunning = true
    thread = HandlerThread("LumiGuard").also { it.start() }
    handler = Handler(thread.looper)
    lastEventQuery = System.currentTimeMillis() - 10 * 60 * 1000L
    handler.post(tick)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    goForeground()
    return START_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    isRunning = false
    if (::handler.isInitialized) handler.removeCallbacksAndMessages(null)
    if (::thread.isInitialized) thread.quitSafely()
    super.onDestroy()
  }

  private fun goForeground() {
    val notification = GuardNotifications.serviceNotification(this, GuardStore.get(this).config())
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(GuardNotifications.ID_SERVICE, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(GuardNotifications.ID_SERVICE, notification)
    }
  }

  /** Returns how long to wait before the next check. */
  private fun check(): Long {
    if (!store.isEnabled() || !Permissions.hasUsageAccess(this)) {
      stopSelf()
      return IDLE_MS
    }
    val config = store.config()
    val now = System.currentTimeMillis()
    handleBedtimeGrayscale(config, now)

    val power = getSystemService(Context.POWER_SERVICE) as PowerManager
    if (!power.isInteractive) {
      current = null
      screenOnSince = 0L
      return IDLE_MS
    }
    handleEyeRest(config, now)

    val foreground = updateForeground(now) ?: return TICK_MS
    if (foreground == packageName) {
      current = foreground
      return TICK_MS
    }

    if (foreground != current) {
      current = foreground
      // Coming back to the same app within a few minutes continues the same session.
      val seen = lastSeen[foreground] ?: 0L
      if (now - seen > SESSION_GAP_MS) sessionStarts[foreground] = now
      nudgedThisSession = false
      lastSeen[foreground] = now
      onAppOpened(foreground, config, now)
    } else {
      lastSeen[foreground] = now
      if (now - lastStayCheck >= STAY_CHECK_MS) {
        lastStayCheck = now
        onAppStillOpen(foreground, config, now)
      }
    }
    return TICK_MS
  }

  private fun sessionStart(pkg: String, now: Long): Long = sessionStarts[pkg] ?: now

  /** Tracks the app in front using usage events (the last "resumed" app wins). */
  private fun updateForeground(now: Long): String? {
    val events = usm.queryEvents(lastEventQuery, now) ?: return current
    val event = UsageEvents.Event()
    var latest = current
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      when (event.eventType) {
        UsageReader.ACTIVITY_RESUMED -> latest = event.packageName
        UsageReader.SCREEN_NON_INTERACTIVE, UsageReader.KEYGUARD_SHOWN -> latest = null
      }
    }
    // Overlap one second so events at the boundary are never missed.
    lastEventQuery = now - 1000
    return latest
  }

  /**
   * The rule for an app: its own limit, or, during deep focus, a plain "focus" rule for
   * every normal app the user didn't allow. Calls, messages, the launcher, settings and
   * Lumi itself are never blocked.
   */
  private fun ruleFor(pkg: String, config: GuardConfig, now: Long): LimitRule? {
    config.limitFor(pkg)?.let { return it }
    if (config.deepFocusActive(now) && pkg !in config.focusAllow && isBlockable(pkg)) {
      return LimitRule(pkg, "", 0, false)
    }
    return null
  }

  private fun isBlockable(pkg: String): Boolean {
    blockable[pkg]?.let { return it }
    val result = try {
      pkg !in exemptPackages() && packageManager.getLaunchIntentForPackage(pkg) != null
    } catch (error: Exception) {
      false
    }
    blockable[pkg] = result
    return result
  }

  private fun exemptPackages(): Set<String> {
    exempt?.let { return it }
    val set = HashSet<String>()
    set += packageName
    set += ALWAYS_ALLOWED
    try {
      val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
      @Suppress("DEPRECATION")
      packageManager.queryIntentActivities(home, 0).forEach { set += it.activityInfo.packageName }
    } catch (error: Exception) {
      // Ignore: the list just stays shorter.
    }
    try {
      val telecom = getSystemService(Context.TELECOM_SERVICE) as android.telecom.TelecomManager
      telecom.defaultDialerPackage?.let { set += it }
    } catch (error: Exception) {
      // No telephony on this device.
    }
    try {
      android.provider.Telephony.Sms.getDefaultSmsPackage(this)?.let { set += it }
    } catch (error: Exception) {
      // No SMS app on this device.
    }
    exempt = set
    return set
  }

  private fun onAppOpened(pkg: String, config: GuardConfig, now: Long) {
    val rule = ruleFor(pkg, config, now) ?: return
    val reason = blockingReason(rule, config, now)
    if (reason != null) {
      if (!canBypass(pkg, reason, config, now)) showPause(pkg, rule, reason, config, now)
      return
    }
    if (store.hasAllowance(pkg, now)) return
    if (rule.pauseOnOpen && now - (lastPauseAt[pkg] ?: 0L) > REPAUSE_MS) showPause(pkg, rule, "pause", config, now)
  }

  private fun onAppStillOpen(pkg: String, config: GuardConfig, now: Long) {
    val rule = ruleFor(pkg, config, now)
    if (rule != null) {
      val reason = blockingReason(rule, config, now)
      if (reason != null && !canBypass(pkg, reason, config, now)) {
        showPause(pkg, rule, reason, config, now)
        return
      }
    }
    // Gentle long-session nudge for watched apps.
    val started = sessionStart(pkg, now)
    if (pkg in config.watched && !nudgedThisSession && now - started >= config.frictionMinutes * 60_000L) {
      nudgedThisSession = true
      sendNudge(pkg, config, ((now - started) / 60_000L).toInt())
    }
  }

  /** "Open anyway" gives a short allowance, except for strict blocks. */
  private fun canBypass(pkg: String, reason: String, config: GuardConfig, now: Long): Boolean {
    if (isHardBlock(reason, config)) return false
    return store.hasAllowance(pkg, now)
  }

  /** Reasons that apply even after the first "pause and think" (limits and phone-free times). */
  private fun blockingReason(limit: LimitRule, config: GuardConfig, now: Long): String? {
    if (config.focusActive(now)) return "focus"
    if (config.activeWindow(now) != null) return "window"
    if (config.bedtimeActive(now)) return "bedtime"
    if (store.cooldownUntil(limit.pkg) > now) return "session"
    if (limit.minutes > 0 && usedTodayMs(limit.pkg, now) >= limit.minutes * 60_000L) return "limit"
    val cap = config.strict.sessionCap
    if (config.strict.enabled && cap > 0 && config.limitFor(limit.pkg) != null && now - sessionStart(limit.pkg, now) >= cap * 60_000L) {
      store.setCooldown(limit.pkg, now + config.strict.cooldown * 60_000L)
      sessionStarts.remove(limit.pkg)
      return "session"
    }
    return null
  }

  private fun usedTodayMs(pkg: String, now: Long): Long {
    val cached = usageCache[pkg]
    if (cached != null && now - cached.first < USAGE_CACHE_MS) return cached.second
    val ms = UsageReader(this).usageToday().apps.firstOrNull { it.packageName == pkg }?.ms ?: 0L
    usageCache[pkg] = Pair(now, ms)
    return ms
  }

  private fun showPause(pkg: String, limit: LimitRule, reason: String, config: GuardConfig, now: Long) {
    if (now - lastLaunchAt < RELAUNCH_GUARD_MS) return
    lastLaunchAt = now
    lastPauseAt[pkg] = now
    val intent = Intent(this, PauseActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      putExtra(PauseActivity.EXTRA_PACKAGE, pkg)
      putExtra(PauseActivity.EXTRA_LABEL, limit.label.ifBlank { AppCatalog.label(this@GuardService, pkg) })
      putExtra(PauseActivity.EXTRA_REASON, reason)
      putExtra(PauseActivity.EXTRA_USED_MS, usedTodayMs(pkg, now))
      putExtra(PauseActivity.EXTRA_LIMIT_MINUTES, limit.minutes)
      putExtra(PauseActivity.EXTRA_WINDOW, config.activeWindow(now)?.label ?: "")
      putExtra(PauseActivity.EXTRA_UNTIL, if (reason == "session") store.cooldownUntil(pkg) else if (reason == "focus") config.focusUntil else 0L)
      putExtra(PauseActivity.EXTRA_HARD, isHardBlock(reason, config))
    }
    val started = if (Permissions.canDrawOverlays(this)) {
      try {
        startActivity(intent)
        true
      } catch (error: Exception) {
        Log.w(TAG, "Could not show the pause screen", error)
        false
      }
    } else {
      false
    }
    if (!started) {
      // Without "display over other apps", offer the pause screen as a notification instead.
      val label = limit.label.ifBlank { pkg }
      val pending = android.app.PendingIntent.getActivity(
        this,
        pkg.hashCode(),
        intent,
        android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE,
      )
      val notification = GuardNotifications.builder(this, GuardNotifications.CHANNEL_NUDGE)
        .setContentTitle(config.string("blockedNoticeTitle", "Pause and think"))
        .setContentText(config.string("blockedNoticeBody", "Tap to see your pause screen for {{app}}.").replace("{{app}}", label))
        .setContentIntent(pending)
        .setAutoCancel(true)
        .build()
      GuardNotifications.ensureChannels(this, config)
      GuardNotifications.notify(this, GuardNotifications.ID_BLOCKED, notification)
    }
  }

  private fun sendNudge(pkg: String, config: GuardConfig, minutes: Int) {
    val label = config.limitFor(pkg)?.label?.ifBlank { null } ?: AppCatalog.label(this, pkg)
    val link = "lumi://mind/after-scroll?app=" + Uri.encode(label)
    val notification = GuardNotifications.builder(this, GuardNotifications.CHANNEL_NUDGE)
      .setContentTitle(config.string("nudgeTitle", "Still enjoying {{app}}?").replace("{{app}}", label))
      .setContentText(
        config.string("nudgeBody", "You've been on it for {{minutes}} minutes. Tap to check in with yourself.")
          .replace("{{minutes}}", minutes.toString())
          .replace("{{app}}", label),
      )
      .setContentIntent(GuardNotifications.openAppIntent(this, link, 2))
      .setAutoCancel(true)
      .build()
    GuardNotifications.ensureChannels(this, config)
    GuardNotifications.notify(this, GuardNotifications.ID_NUDGE, notification)
  }

  /** 20-20-20: after a stretch of continuous screen-on time, suggest a 20-second look into the distance. */
  private fun handleEyeRest(config: GuardConfig, now: Long) {
    if (screenOnSince == 0L) screenOnSince = now
    if (!config.eyeHoursActive(now)) return
    val every = config.eye.every * 60_000L
    if (now - screenOnSince < every || now - lastEyeAt < every) return
    lastEyeAt = now
    screenOnSince = now
    val notification = GuardNotifications.builder(this, GuardNotifications.CHANNEL_NUDGE)
      .setContentTitle(config.string("eyeTitle", "Eye break"))
      .setContentText(
        config.string("eyeBody", "{{minutes}} minutes of screen time. Look at something far away for 20 seconds.")
          .replace("{{minutes}}", config.eye.every.toString()),
      )
      .setContentIntent(GuardNotifications.openAppIntent(this, "lumi://body/eye-break", 3))
      .setAutoCancel(true)
      .also { if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) it.setTimeoutAfter(5 * 60_000L) }
      .build()
    GuardNotifications.ensureChannels(this, config)
    GuardNotifications.notify(this, GuardNotifications.ID_EYE, notification)
  }

  /** Switches grayscale on at bedtime and back off in the morning (only if Lumi turned it on). */
  private fun handleBedtimeGrayscale(config: GuardConfig, now: Long) {
    if (now - lastGrayscaleCheck < GRAYSCALE_CHECK_MS) return
    lastGrayscaleCheck = now
    if (!Grayscale.canWrite(this)) return
    val shouldBeOn = config.bedtime.grayscale && config.bedtimeActive(now)
    if (shouldBeOn && !Grayscale.isOn(this)) {
      if (Grayscale.set(this, true)) store.grayscaleSetByLumi = true
    } else if (!shouldBeOn && store.grayscaleSetByLumi) {
      Grayscale.set(this, false)
      store.grayscaleSetByLumi = false
    }
  }

  companion object {
    private const val TAG = "LumiGuard"
    private const val TICK_MS = 1500L
    private const val IDLE_MS = 5000L
    private const val STAY_CHECK_MS = 30_000L
    private const val USAGE_CACHE_MS = 60_000L
    private const val REPAUSE_MS = 60_000L
    private const val RELAUNCH_GUARD_MS = 3000L
    private const val GRAYSCALE_CHECK_MS = 60_000L
    private const val SESSION_GAP_MS = 3 * 60_000L

    /** Never blocked in deep focus: system UI, settings, phone, emergency and clocks. */
    private val ALWAYS_ALLOWED = setOf(
      "com.android.systemui",
      "com.android.settings",
      "com.android.phone",
      "com.android.server.telecom",
      "com.android.emergency",
      "com.google.android.dialer",
      "com.google.android.apps.messaging",
      "com.android.deskclock",
      "com.google.android.deskclock",
      "com.google.android.permissioncontroller",
      "com.android.permissioncontroller",
      "com.google.android.packageinstaller",
      "com.android.packageinstaller",
    )

    /** Strict blocks have no "Open anyway". Session-cap cooldowns are always strict. */
    fun isHardBlock(reason: String, config: GuardConfig): Boolean = when (reason) {
      "session" -> true
      "focus" -> config.focusStrict || config.strict.enabled
      "limit", "window", "bedtime" -> config.strict.enabled
      else -> false
    }

    @Volatile
    var isRunning = false
      private set

    fun start(context: Context): Boolean {
      if (!Permissions.hasUsageAccess(context)) return false
      GuardStore.get(context).setEnabled(true)
      val intent = Intent(context, GuardService::class.java)
      return try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
        true
      } catch (error: Exception) {
        Log.w(TAG, "Could not start the guard service", error)
        false
      }
    }

    fun stop(context: Context) {
      GuardStore.get(context).setEnabled(false)
      context.stopService(Intent(context, GuardService::class.java))
      isRunning = false
    }
  }
}
