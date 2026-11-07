package app.lumi.guard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Turns pause screens back on after a restart or app update, but only if the user had them on. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    val store = GuardStore.get(context)
    if (store.isEnabled() && Permissions.hasUsageAccess(context)) {
      GuardService.start(context)
    }
    QuoteWidgetProvider.refreshAll(context)
  }
}
