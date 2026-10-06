# Android-сборка «Дофаминового планера»

Это отдельная Android-оболочка на Capacitor. Она собирает локальную копию веб-приложения, поэтому сайт и GitHub Pages продолжают работать независимо. Напоминания в Android планируются системным сервисом и могут приходить, когда приложение закрыто.

## Что установить на Windows

- Node.js 22 или новее;
- Android Studio с Android SDK Platform и Build Tools;
- Android SDK Platform Tools;
- Android Studio JDK (поставляется вместе с Android Studio).

## Первая подготовка

Открой папку `android-app` в терминале и выполни:

```powershell
npm install
npm run open:android
```

Если Android Studio или SDK установлены не в стандартное место, открой Android-проект, выбрав папку `android-app/android`, и укажи путь к SDK в настройках Android Studio.

Если платформы `android/` ещё нет (например, её удалили), добавь её один раз командой `npm run add:android`, затем снова выполни `npm run sync:android`.

## Запуск и APK

```powershell
npm run open:android
```

В Android Studio выбери телефон или эмулятор и нажми **Run**. Для отладочного APK:

```powershell
npm run build:debug
```

Файл появится в `android/app/build/outputs/apk/debug/app-debug.apk`. Для RuStore нужно будет собрать подписанный release APK/AAB с сохранённым keystore и повысить номер версии.

## Уведомления

Сначала открой в приложении раздел **Профиль → Напоминания** и разреши уведомления. Android может отдельно попросить разрешение на точные будильники; без него система оставит расписание, но время может быть приблизительным. Уведомления настраиваются локально, сервер для них не нужен.

Скрипт `prepare:web` каждый раз копирует свежие файлы сайта в `www`; редактируй основной веб-проект в корне репозитория, затем запускай `npm run sync:android` перед сборкой.
