package app.lumi.guard

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Build
import android.util.Base64
import java.io.ByteArrayOutputStream

/** App names, categories and icons for apps the user can see on their home screen. */
object AppCatalog {
  private val labelCache = HashMap<String, String>()

  fun label(context: Context, packageName: String): String {
    labelCache[packageName]?.let { return it }
    val label = try {
      val info = appInfo(context, packageName)
      context.packageManager.getApplicationLabel(info).toString()
    } catch (error: Exception) {
      packageName
    }
    labelCache[packageName] = label
    return label
  }

  fun category(context: Context, packageName: String): String {
    return try {
      val info = appInfo(context, packageName)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        when (info.category) {
          ApplicationInfo.CATEGORY_GAME -> "game"
          ApplicationInfo.CATEGORY_AUDIO -> "audio"
          ApplicationInfo.CATEGORY_VIDEO -> "video"
          ApplicationInfo.CATEGORY_IMAGE -> "image"
          ApplicationInfo.CATEGORY_SOCIAL -> "social"
          ApplicationInfo.CATEGORY_NEWS -> "news"
          ApplicationInfo.CATEGORY_MAPS -> "maps"
          ApplicationInfo.CATEGORY_PRODUCTIVITY -> "productivity"
          else -> "other"
        }
      } else {
        @Suppress("DEPRECATION")
        if (info.flags and ApplicationInfo.FLAG_IS_GAME != 0) "game" else "other"
      }
    } catch (error: Exception) {
      "other"
    }
  }

  fun launchableApps(context: Context): List<Map<String, String>> {
    val pm = context.packageManager
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    val activities = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0L))
    } else {
      @Suppress("DEPRECATION")
      pm.queryIntentActivities(intent, 0)
    }
    return activities
      .mapNotNull { it.activityInfo?.packageName }
      .distinct()
      .filter { it != context.packageName }
      .map { pkg -> mapOf("packageName" to pkg, "label" to label(context, pkg), "category" to category(context, pkg)) }
      .sortedBy { it["label"]?.lowercase() ?: "" }
  }

  fun iconBase64(context: Context, packageName: String, size: Int): String? {
    return try {
      val drawable = context.packageManager.getApplicationIcon(packageName)
      val px = size.coerceIn(24, 256)
      val bitmap = Bitmap.createBitmap(px, px, Bitmap.Config.ARGB_8888)
      val canvas = Canvas(bitmap)
      drawable.setBounds(0, 0, px, px)
      drawable.draw(canvas)
      val out = ByteArrayOutputStream()
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
      bitmap.recycle()
      Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    } catch (error: Exception) {
      null
    }
  }

  /** Home-screen launchers and system UI should never count as "screen time in an app". */
  fun ignoredPackages(context: Context): Set<String> {
    val ignored = mutableSetOf(context.packageName, "android", "com.android.systemui")
    try {
      val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
      val homes = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        context.packageManager.queryIntentActivities(home, PackageManager.ResolveInfoFlags.of(0L))
      } else {
        @Suppress("DEPRECATION")
        context.packageManager.queryIntentActivities(home, 0)
      }
      homes.mapNotNull { it.activityInfo?.packageName }.forEach { ignored.add(it) }
    } catch (error: Exception) {
      // Keep the defaults.
    }
    return ignored
  }

  private fun appInfo(context: Context, packageName: String): ApplicationInfo {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.packageManager.getApplicationInfo(packageName, PackageManager.ApplicationInfoFlags.of(0L))
    } else {
      @Suppress("DEPRECATION")
      context.packageManager.getApplicationInfo(packageName, 0)
    }
  }
}
