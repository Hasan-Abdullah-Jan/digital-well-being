package app.lumi.guard

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings

/** Permission checks and the settings screens where the user can grant them. */
object Permissions {
  fun hasUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    }
    return if (mode == AppOpsManager.MODE_DEFAULT) {
      context.checkCallingOrSelfPermission("android.permission.PACKAGE_USAGE_STATS") == PackageManager.PERMISSION_GRANTED
    } else {
      mode == AppOpsManager.MODE_ALLOWED
    }
  }

  fun canDrawOverlays(context: Context): Boolean = Settings.canDrawOverlays(context)

  fun openUsageAccessSettings(context: Context) {
    open(context, Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
  }

  fun openOverlaySettings(context: Context) {
    val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
    if (!open(context, intent)) open(context, Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION))
  }

  fun openAccessibilitySettings(context: Context) {
    open(context, Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
  }

  /** Opens the phone's own digital wellbeing / bedtime settings if available. */
  fun openDigitalWellbeing(context: Context): Boolean {
    val candidates = listOf("com.google.android.apps.wellbeing", "com.samsung.android.forest")
    for (pkg in candidates) {
      val launch = context.packageManager.getLaunchIntentForPackage(pkg)
      if (launch != null && open(context, launch)) return true
    }
    open(context, Intent(Settings.ACTION_SETTINGS))
    return false
  }

  fun open(context: Context, intent: Intent): Boolean {
    return try {
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      true
    } catch (error: Exception) {
      false
    }
  }
}
