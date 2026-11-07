package app.lumi.guard

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.app.Activity
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.CountDownTimer
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.window.OnBackInvokedDispatcher

/**
 * The calm "pause and think" screen shown on top of an app the user chose to limit.
 * Built in code (no extra libraries) so it opens instantly, even on low-end phones.
 * Choosing "Close" goes to the home screen; "Open anyway" unlocks after a short wait.
 */
class PauseActivity : Activity() {
  private var timer: CountDownTimer? = null
  private var breathing: ObjectAnimator? = null
  private var decided = false

  private val dark: Boolean
    get() = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

  private val bg get() = if (dark) Color.parseColor("#0F141A") else Color.parseColor("#FAF6F0")
  private val surface get() = if (dark) Color.parseColor("#171E26") else Color.WHITE
  private val text get() = if (dark) Color.parseColor("#ECEFF3") else Color.parseColor("#1D2330")
  private val muted get() = if (dark) Color.parseColor("#A6B0BD") else Color.parseColor("#535D6C")
  private val primary get() = if (dark) Color.parseColor("#7FC8BF") else Color.parseColor("#2A6B66")
  private val onPrimary get() = if (dark) Color.parseColor("#0B2522") else Color.WHITE
  private val primarySoft get() = if (dark) Color.parseColor("#1C3634") else Color.parseColor("#DDEEEB")
  private val border get() = if (dark) Color.parseColor("#2B3542") else Color.parseColor("#E5DCCF")

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT) { closeTarget() }
    }
    render(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    render(intent)
  }

  @Deprecated("Kept for Android versions before 13")
  override fun onBackPressed() {
    closeTarget()
  }

  override fun onDestroy() {
    timer?.cancel()
    breathing?.cancel()
    super.onDestroy()
  }

  private fun dp(value: Int): Int =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

  private fun render(intent: Intent) {
    decided = false
    timer?.cancel()
    breathing?.cancel()

    val config = GuardStore.get(this).config()
    val pkg = intent.getStringExtra(EXTRA_PACKAGE) ?: ""
    val label = intent.getStringExtra(EXTRA_LABEL)?.ifBlank { null } ?: AppCatalog.label(this, pkg)
    val reason = intent.getStringExtra(EXTRA_REASON) ?: "pause"
    val usedMs = intent.getLongExtra(EXTRA_USED_MS, 0L)
    val limitMinutes = intent.getIntExtra(EXTRA_LIMIT_MINUTES, 0)
    val windowLabel = intent.getStringExtra(EXTRA_WINDOW) ?: ""

    fun fill(template: String): String = template
      .replace("{{app}}", label)
      .replace("{{used}}", formatMinutes(usedMs / 60_000L))
      .replace("{{limit}}", formatMinutes(limitMinutes.toLong()))
      .replace("{{window}}", windowLabel)

    val (titleKey, bodyKey, titleFallback, bodyFallback) = when (reason) {
      "limit" -> Quad("limitTitle", "limitBody", "You've reached your {{app}} limit", "You've used {{app}} for {{used}} today (your limit is {{limit}}).")
      "window" -> Quad("windowTitle", "windowBody", "It's {{window}}", "You asked Lumi to keep {{app}} quiet right now.")
      "bedtime" -> Quad("bedtimeTitle", "bedtimeBody", "Time to wind down", "It's past your bedtime. Your future self will thank you.")
      "focus" -> Quad("focusTitle", "focusBody", "You're in focus mode", "{{app}} will be here when your focus session ends.")
      else -> Quad("pauseTitle", "pauseBody", "Pause and think", "You're opening {{app}}. What do you want to do there?")
    }
    val waitSeconds = when (reason) {
      "pause" -> 5
      "limit" -> 10
      else -> 8
    }
    val allowanceMinutes = when (reason) {
      "pause" -> 15
      "limit" -> 5
      else -> 10
    }
    val suggestion = config.suggestions.takeIf { it.isNotEmpty() }?.random()

    window.decorView.setBackgroundColor(bg)

    val root = FrameLayout(this)
    root.setBackgroundColor(bg)
    val scroll = ScrollView(this)
    scroll.isFillViewport = true
    val column = LinearLayout(this)
    column.orientation = LinearLayout.VERTICAL
    column.gravity = Gravity.CENTER_HORIZONTAL
    column.setPadding(dp(24), dp(32), dp(24), dp(24))
    scroll.addView(column, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT))
    root.addView(scroll, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))

    column.addView(textView("Lumi", 14f, muted, bold = true).also { it.gravity = Gravity.CENTER })

    // Breathing circle
    val circle = View(this)
    circle.background = GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(primarySoft)
      setStroke(dp(3), primary)
    }
    circle.contentDescription = config.string("breathe", "Breathe slowly with the circle")
    column.addView(circle, LinearLayout.LayoutParams(dp(132), dp(132)).apply { topMargin = dp(28); bottomMargin = dp(24) })
    val animatorScale = try {
      Settings.Global.getFloat(contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
    } catch (error: Exception) {
      1f
    }
    if (animatorScale > 0f) {
      breathing = ObjectAnimator.ofFloat(circle, View.SCALE_X, 0.8f, 1.1f).apply {
        duration = 4000
        repeatMode = ValueAnimator.REVERSE
        repeatCount = ValueAnimator.INFINITE
        interpolator = AccelerateDecelerateInterpolator()
        addUpdateListener { circle.scaleY = circle.scaleX }
        start()
      }
    }

    val title = textView(fill(config.string(titleKey, titleFallback)), 26f, text, bold = true)
    title.gravity = Gravity.CENTER
    column.addView(title)
    val body = textView(fill(config.string(bodyKey, bodyFallback)), 17f, muted)
    body.gravity = Gravity.CENTER
    column.addView(body, marginTop(10))

    if (usedMs > 0) {
      val used = textView(fill(config.string("todayUsage", "Today: {{used}}")), 15f, muted, bold = true)
      used.gravity = Gravity.CENTER
      column.addView(used, marginTop(12))
    }

    if (suggestion != null) {
      val card = LinearLayout(this)
      card.orientation = LinearLayout.VERTICAL
      card.setPadding(dp(16), dp(14), dp(16), dp(14))
      card.background = GradientDrawable().apply {
        cornerRadius = dp(18).toFloat()
        setColor(surface)
        setStroke(dp(1), border)
      }
      card.addView(textView(config.string("tryInstead", "Try instead"), 13f, muted, bold = true))
      card.addView(textView(suggestion, 17f, text, bold = true), marginTop(4))
      column.addView(card, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(24) })
    }

    val close = button(fill(config.string("closeApp", "Close {{app}}")), filled = true)
    close.setOnClickListener { closeTarget() }
    column.addView(close, buttonParams(dp(28)))

    val openAnyway = button(config.string("openAnyway", "Open anyway"), filled = false)
    openAnyway.isEnabled = false
    openAnyway.alpha = 0.6f
    column.addView(openAnyway, buttonParams(dp(12)))
    val waitTemplate = config.string("openAnywayWait", "Open anyway ({{seconds}})")
    openAnyway.text = waitTemplate.replace("{{seconds}}", waitSeconds.toString())
    timer = object : CountDownTimer(waitSeconds * 1000L, 1000L) {
      override fun onTick(millisUntilFinished: Long) {
        val left = ((millisUntilFinished + 999) / 1000).toInt()
        openAnyway.text = waitTemplate.replace("{{seconds}}", left.toString())
      }

      override fun onFinish() {
        openAnyway.text = config.string("openAnyway", "Open anyway")
        openAnyway.isEnabled = true
        openAnyway.alpha = 1f
      }
    }.start()
    openAnyway.setOnClickListener {
      if (decided) return@setOnClickListener
      decided = true
      GuardStore.get(this).allow(pkg, allowanceMinutes)
      GuardStore.get(this).addEvent(pkg, label, reason, "continued")
      finish()
    }

    val footer = textView(config.string("footer", "You set this up in Lumi, and you're in charge."), 13f, muted)
    footer.gravity = Gravity.CENTER
    column.addView(footer, marginTop(20))

    applyInsets(root)
    setContentView(root)
    title.announceForAccessibility(title.text)
    closeTargetPackage = pkg
    closeTargetLabel = label
    closeTargetReason = reason
  }

  private var closeTargetPackage = ""
  private var closeTargetLabel = ""
  private var closeTargetReason = "pause"

  /** Leaves the limited app by going to the home screen. */
  private fun closeTarget() {
    if (!decided) {
      decided = true
      GuardStore.get(this).addEvent(closeTargetPackage, closeTargetLabel, closeTargetReason, "closed")
    }
    val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      startActivity(home)
    } catch (error: Exception) {
      // Nothing else to do; finishing still removes the pause screen.
    }
    finish()
  }

  private fun applyInsets(root: View) {
    root.setOnApplyWindowInsetsListener { view, insets ->
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val bars = insets.getInsets(WindowInsets.Type.systemBars())
        view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      } else {
        @Suppress("DEPRECATION")
        view.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop, insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
      }
      insets
    }
  }

  private fun textView(value: String, sizeSp: Float, color: Int, bold: Boolean = false): TextView {
    val view = TextView(this)
    view.text = value
    view.setTextColor(color)
    view.setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
    view.setLineSpacing(0f, 1.15f)
    if (bold) view.setTypeface(view.typeface, Typeface.BOLD)
    return view
  }

  private fun button(label: String, filled: Boolean): Button {
    val b = Button(this)
    b.text = label
    b.isAllCaps = false
    b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
    b.setTypeface(b.typeface, Typeface.BOLD)
    b.minHeight = dp(52)
    b.stateListAnimator = null
    b.setTextColor(if (filled) onPrimary else primary)
    b.background = GradientDrawable().apply {
      cornerRadius = dp(28).toFloat()
      if (filled) setColor(primary) else {
        setColor(Color.TRANSPARENT)
        setStroke(dp(2), primary)
      }
    }
    return b
  }

  private fun buttonParams(top: Int) =
    LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = top }

  private fun marginTop(top: Int) =
    LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(top) }

  private fun formatMinutes(total: Long): String {
    val h = total / 60
    val m = total % 60
    return when {
      h == 0L -> "$m min"
      m == 0L -> "$h h"
      else -> "$h h $m min"
    }
  }

  private data class Quad(val a: String, val b: String, val c: String, val d: String)

  companion object {
    const val EXTRA_PACKAGE = "lumi.package"
    const val EXTRA_LABEL = "lumi.label"
    const val EXTRA_REASON = "lumi.reason"
    const val EXTRA_USED_MS = "lumi.usedMs"
    const val EXTRA_LIMIT_MINUTES = "lumi.limitMinutes"
    const val EXTRA_WINDOW = "lumi.window"
  }
}
