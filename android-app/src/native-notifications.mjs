import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const CHANNEL_ID = 'planner-reminders';
const DAILY_ID = 1_590_000_001;
const ID_MIN = 1_600_000_000;
const ID_MAX = 1_999_999_999;
let queue = Promise.resolve();

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeOnDate(dateKey, time) {
  return new Date(`${dateKey}T${time || '09:00'}:00`);
}

function nextDailyTime(time) {
  const now = new Date();
  const next = timeOnDate(localDateKey(now), time);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

function notificationId(value, used) {
  let hash = 2_166_136_261;
  for (const char of String(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16_777_619);
  let id = ID_MIN + ((hash >>> 0) % (ID_MAX - ID_MIN));
  while (used.has(id)) id = id >= ID_MAX ? ID_MIN : id + 1;
  used.add(id);
  return id;
}

async function ensureChannel() {
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Напоминания планера',
      description: 'Задачи и планы на выбранное время',
      importance: 4,
    });
  } catch {
    // The channel already exists; Android does not recreate its settings.
  }
}

async function requestPermission() {
  if (!Capacitor.isNativePlatform()) return false;
  const current = await LocalNotifications.checkPermissions();
  const result = current.display === 'granted'
    ? current
    : await LocalNotifications.requestPermissions();
  if (result.display !== 'granted') return false;

  const exact = await LocalNotifications.checkExactNotificationSetting();
  if (exact.exact_alarm !== 'granted') {
    await LocalNotifications.changeExactNotificationSetting();
  }
  return true;
}

async function syncNow(reminders, plans) {
  if (!Capacitor.isNativePlatform()) return;
  const pending = await LocalNotifications.getPending();
  const owned = pending.notifications
    .filter(({ id }) => id === DAILY_ID || (id >= ID_MIN && id <= ID_MAX))
    .map(({ id }) => ({ id }));
  if (owned.length) await LocalNotifications.cancel({ notifications: owned });

  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') return;

  await ensureChannel();

  const now = Date.now();
  const notifications = [];
  const used = new Set([DAILY_ID]);

  if (reminders.daily) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const count = (plans[localDateKey(tomorrow)] || []).length;
    notifications.push({
      id: DAILY_ID,
      title: 'Твой план на завтра ♡',
      body: count
        ? `В списке ${count} маленьких дел. Загляни в планер ♡`
        : 'Загляни в планер и выбери доброе дело для себя ♡',
      channelId: CHANNEL_ID,
      schedule: { at: nextDailyTime(reminders.time), repeats: true, allowWhileIdle: true },
    });
  }

  for (const reminder of reminders.days || []) {
    if (reminder.sent) continue;
    const at = timeOnDate(reminder.date, reminder.time);
    if (at.getTime() <= now) continue;
    const count = (plans[reminder.date] || []).length;
    notifications.push({
      id: notificationId(`day:${reminder.id}`, used),
      title: 'План на выбранный день ♡',
      body: count ? `Сегодня в плане ${count} маленьких дел ♡` : 'Открой планер и выбери маленькое дело для себя ♡',
      channelId: CHANNEL_ID,
      schedule: { at, allowWhileIdle: true },
    });
  }

  for (const reminder of reminders.items || []) {
    if (reminder.sent) continue;
    const at = timeOnDate(reminder.date, reminder.time);
    if (at.getTime() <= now) continue;
    notifications.push({
      id: notificationId(`task:${reminder.id}`, used),
      title: 'Время для маленького шага ♡',
      body: reminder.name || 'Открой планер — тебя ждёт маленькое дело ♡',
      channelId: CHANNEL_ID,
      schedule: { at, allowWhileIdle: true },
    });
  }

  notifications.sort((a, b) => a.schedule.at.getTime() - b.schedule.at.getTime());
  if (notifications.length) await LocalNotifications.schedule({ notifications: notifications.slice(0, 450) });
}

function sync(reminders, plans) {
  queue = queue.catch(() => {}).then(() => syncNow(reminders, plans));
  return queue;
}

window.PlannerAndroidNotifications = { requestPermission, sync };
