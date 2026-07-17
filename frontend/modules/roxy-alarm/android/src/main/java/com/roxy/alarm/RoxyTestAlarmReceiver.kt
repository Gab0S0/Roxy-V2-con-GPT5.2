package com.roxy.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class RoxyTestAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_TEST_ALARM) {
      return
    }

    val notificationManager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    createNotificationChannel(notificationManager)

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context)
    }

    val notification = builder
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle("Roxy")
      .setContentText("Alarma de prueba activada")
      .setCategory(Notification.CATEGORY_ALARM)
      .setPriority(Notification.PRIORITY_MAX)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setAutoCancel(true)
      .build()

    notificationManager.notify(TEST_NOTIFICATION_ID, notification)
  }

  private fun createNotificationChannel(notificationManager: NotificationManager) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val channel = NotificationChannel(
      CHANNEL_ID,
      "Alarmas de Roxy",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Alarmas exactas programadas por Roxy"
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      enableVibration(true)
    }
    notificationManager.createNotificationChannel(channel)
  }

  companion object {
    const val ACTION_TEST_ALARM = "com.roxy.v3.action.TEST_ALARM"
    private const val CHANNEL_ID = "roxy_test_alarms_v1"
    private const val TEST_NOTIFICATION_ID = 27001
  }
}
