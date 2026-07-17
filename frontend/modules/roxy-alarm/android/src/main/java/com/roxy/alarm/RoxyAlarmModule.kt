package com.roxy.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class RoxyAlarmModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RoxyAlarm")

    AsyncFunction("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        true
      } else {
        alarmManager().canScheduleExactAlarms()
      }
    }

    AsyncFunction("requestExactAlarmPermission") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
        !alarmManager().canScheduleExactAlarms()
      ) {
        val intent = Intent(
          Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
          Uri.parse("package:${context().packageName}")
        ).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context().startActivity(intent)
      }
    }

    AsyncFunction("scheduleTestAlarm") { triggerAtMillis: Double ->
      val triggerAt = triggerAtMillis.toLong()
      require(triggerAt > System.currentTimeMillis()) {
        "triggerAtMillis must be in the future"
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
        !alarmManager().canScheduleExactAlarms()
      ) {
        throw IllegalStateException("Exact alarm permission is not granted")
      }

      alarmManager().setExactAndAllowWhileIdle(
        AlarmManager.RTC_WAKEUP,
        triggerAt,
        requireNotNull(testAlarmPendingIntent(PendingIntent.FLAG_UPDATE_CURRENT))
      )
    }

    AsyncFunction("cancelTestAlarm") {
      val pendingIntent = testAlarmPendingIntent(PendingIntent.FLAG_NO_CREATE)
      if (pendingIntent != null) {
        alarmManager().cancel(pendingIntent)
        pendingIntent.cancel()
      }
    }
  }

  private fun context(): Context =
    requireNotNull(appContext.reactContext) { "React context is unavailable" }

  private fun alarmManager(): AlarmManager =
    context().getSystemService(Context.ALARM_SERVICE) as AlarmManager

  private fun testAlarmPendingIntent(extraFlag: Int): PendingIntent? {
    val intent = Intent(context(), RoxyTestAlarmReceiver::class.java).apply {
      action = RoxyTestAlarmReceiver.ACTION_TEST_ALARM
    }

    return PendingIntent.getBroadcast(
      context(),
      TEST_ALARM_REQUEST_CODE,
      intent,
      extraFlag or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private companion object {
    const val TEST_ALARM_REQUEST_CODE = 27001
  }
}
