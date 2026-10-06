import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const androidRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../android');
const command = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const result = spawnSync(command, ['assembleDebug'], { cwd: androidRoot, stdio: 'inherit', shell: process.platform === 'win32' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
console.log(resolve(androidRoot, 'app/build/outputs/apk/debug/app-debug.apk'));
