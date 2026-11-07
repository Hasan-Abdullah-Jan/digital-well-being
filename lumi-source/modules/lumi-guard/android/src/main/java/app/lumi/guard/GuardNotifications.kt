package app.lumi.guard

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build

/** Notifications for the guard service. Uses only the Android framework (no extra libraries). */
object GuardNotifications {
  const val CHANNEL_SERVICE = "lumi_guard_service"
  const val CHANNEL_NUDGE = "lumi_guard_nudge"
  const val ID_SERVICE = 4101
  const val ID_NUDGE = 4102
  const val ID_BLOCKED = 4103

  fun ensureChannels(context: Context, config: GuardConfig) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val service = NotificationChannel(CHANNEL_SERVICE, config.string("channelName", "Pause screens"), NotificationManager.IMPORTANCE_MIN)
    service.setShowBadge(false)
    val nudge = NotificationChannel(CHANNEL_NUDGE, config.string("nudgeChannelName", "Gentle nudges"), NotificationManager.IMPORTANCE_DEFAULT)
    nudge.setShowBadge(false)
    nudge.lockscreenVisibility = Notification.VISIBILITY_PRIVATE
    manager.createNotificationChannel(service)
    manager.createNotificationChannel(nudge)
  }

  fun builder(context: Context, channel: String): Notification.Builder {
    val b = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, channel)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context)
    }
    return b.setSmallIcon(R.drawable.lumi_ic_stat).setColor(0xFF2A6B66.toInt())
  }

  /** Opens Lumi itself (optionally at a deep link like lumi://mind/after-scroll). */
  fun openAppIntent(context: Context, deepLink: String? = null, requestCode: Int = 0): PendingIntent {
    val intent = if (deepLink != null) {
      Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).setPackage(context.packageName)
    } else {
      context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent()
    }
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  fun serviceNotification(context: Context, config: GuardConfig): Notification {
    ensureChannels(context, config)
    return builder(context, CHANNEL_SERVICE)
      .setContentTitle(config.string("serviceTitle", "Lumi is looking out for you"))
      .setContentText(config.string("serviceBody", "Pause screens are on for the apps you chose."))
      .setContentIntent(openAppIntent(context, "lumi://habits/limits", 1))
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setCategory(Notification.CATEGORY_SERVICE)
      .build()
  }

  fun notify(context: Context, id: Int, notification: Notification) {
    try {
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.notify(id, notification)
    } catch (error: SecurityException) {
      // Notifications not allowed (Android 13+ permission). The nudge is simply skipped.
    }
  }
}
