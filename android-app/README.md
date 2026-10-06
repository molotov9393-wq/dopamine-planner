# Android-сборка «Дофаминового планера»

Это отдельная Android-оболочка на Capacitor. Она собирает локальную копию веб-приложения, поэтому сайт и GitHub Pages продолжают работать независимо. Напоминания планируются локально на устройстве и могут приходить, когда приложение закрыто.

## Что установить на Windows

- Node.js 22 или новее;
- Android Studio;
- JDK 21 (Gradle в этом проекте не поддерживает более новую Java);
- Android SDK Platform 36, Build Tools 35 и Platform Tools.

## Первая подготовка

Открой папку `android-app` в терминале и выполни:

```powershell
npm install
npm run open:android
```

В Android Studio в настройках **Settings → Build Tools → Gradle → Gradle JDK** укажи JDK 21. Путь на компьютере автора: `E:\Android\JDK-21`. SDK можно хранить в `E:\Android\Sdk`; проект читает его путь из `android/local.properties`.

Если платформы `android/` ещё нет, добавь её один раз командой `npm run add:android`, затем снова выполни `npm run sync:android`.

## Запуск и APK

В Android Studio выбери телефон или эмулятор и нажми **Run**. Для отладочного APK выполни в `android-app`:

```powershell
npm run build:debug
```

Файл появится в `android/app/build/outputs/apk/debug/app-debug.apk`. Для RuStore собери подписанный release APK/AAB с сохранённым keystore и увеличь номер версии.

## Уведомления

Открой в приложении раздел **Профиль → Напоминания** и разреши уведомления. Android может отдельно попросить доступ к точным будильникам; если его не дать, время уведомления может быть приблизительным. Сервер для локальных уведомлений не нужен.

Скрипт `prepare:web` копирует свежие файлы сайта в `www`. После изменений веб-приложения запускай `npm run sync:android` перед сборкой.