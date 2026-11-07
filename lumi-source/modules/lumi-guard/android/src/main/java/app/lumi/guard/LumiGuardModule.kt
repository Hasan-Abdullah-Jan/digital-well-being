package app.lumi.guard

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The bridge between Lumi's JavaScript code (src/native/guard.ts) and Android.
 * Everything here runs on the phone; nothing is uploaded.
 */
class LumiGuardModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "Lumi: Android context is not available" }

  override fun definition() = ModuleDefinition {
    Name("LumiGuard")

    // Permissions
    Function("hasUsageAccess") { Permissions.hasUsageAccess(context) }
    Function("openUsageAccessSettings") { Permissions.openUsageAccessSettings(context) }
    Function("canDrawOverlays") { Permissions.canDrawOverlays(context) }
    Function("openOverlaySettings") { Permissions.openOverlaySettings(context) }
    Function("openAccessibilitySettings") { Permissions.openAccessibilitySettings(context) }
    Function("openDigitalWellbeingSettings") { Permissions.openDigitalWellbeing(context) }

    // Grayscale
    Function("canWriteSecureSettings") { Grayscale.canWrite(context) }
    Function("isGrayscaleOn") { Grayscale.isOn(context) }
    Function("setGrayscale") { enabled: Boolean -> Grayscale.set(context, enabled) }

    // Screen-time data
    AsyncFunction("getUsageForRange") { startMs: Double, endMs: Double ->
      if (!Permissions.hasUsageAccess(context)) {
        mapOf("totalMs" to 0.0, "pickups" to -1, "apps" to emptyList<Map<String, Any>>())
      } else {
        UsageReader(context).usageFor(startMs.toLong(), endMs.toLong()).toMap(context)
      }
    }
    AsyncFunction("getDailyTotals") { days: Int ->
      if (!Permissions.hasUsageAccess(context)) emptyList<Map<String, Any>>() else UsageReader(context).dailyTotals(days)
    }
    AsyncFunction("getLaunchableApps") { AppCatalog.launchableApps(context) }
    AsyncFunction("getAppIcon") { packageName: String, size: Int -> AppCatalog.iconBase64(context, packageName, size) }

    // Pause screens
    Function("setGuardConfig") { json: String -> GuardStore.get(context).saveConfig(json) }
    Function("startGuard") { GuardService.start(context) }
    Function("stopGuard") { GuardService.stop(context) }
    Function("isGuardRunning") { GuardService.isRunning }
    Function("consumeGuardEvents") { GuardStore.get(context).consumeEvents() }

    // Home-screen widget
    Function("setWidgetQuotes") { json: String -> QuoteWidgetProvider.setQuotes(context, json) }
  }
}
