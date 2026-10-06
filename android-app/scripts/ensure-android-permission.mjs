import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(scriptDir, '../android/app/src/main/AndroidManifest.xml');
let manifest = await readFile(manifestPath, 'utf8');
const permission = '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />';
if (!manifest.includes(permission)) {
  manifest = manifest.replace(/(<manifest[^>]*>)/, `$1\n    ${permission}`);
  await writeFile(manifestPath, manifest, 'utf8');
}
console.log('Android exact-alarm permission is present.');
