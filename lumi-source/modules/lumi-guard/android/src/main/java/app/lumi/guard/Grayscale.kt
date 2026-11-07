package app.lumi.guard

import android.content.Context
import android.content.pm.PackageManager
import android.provider.Settings

/**
 * System-wide grayscale (Android's "colour correction: greyscale").
 * Only works if the user has granted WRITE_SECURE_SETTINGS once via adb:
 *   adb shell pm grant <package> android.permission.WRITE_SECURE_SETTINGS
 * Otherwise the app shows step-by-step instructions instead.
 */
object Grayscale {
  private const val ENABLED = "accessibility_display_daltonizer_enabled"
  private const val MODE = "accessibility_display_daltonizer"
  private const val MONOCHROMACY = 0

  fun canWrite(context: Context): Boolean =
    context.checkCallingOrSelfPermission("android.permission.WRITE_SECURE_SETTINGS") == PackageManager.PERMISSION_GRANTED

  fun isOn(context: Context): Boolean {
    val resolver = context.contentResolver
    return try {
      Settings.Secure.getInt(resolver, ENABLED, 0) == 1 && Settings.Secure.getInt(resolver, MODE, -1) == MONOCHROMACY
    } catch (error: Exception) {
      false
    }
  }

  fun set(context: Context, enabled: Boolean): Boolean {
    if (!canWrite(context)) return false
    return try {
      val resolver = context.contentResolver
      if (enabled) {
        Settings.Secure.putInt(resolver, MODE, MONOCHROMACY)
        Settings.Secure.putInt(resolver, ENABLED, 1)
      } else {
        Settings.Secure.putInt(resolver, ENABLED, 0)
      }
      true
    } catch (error: SecurityException) {
      false
    }
  }
}
