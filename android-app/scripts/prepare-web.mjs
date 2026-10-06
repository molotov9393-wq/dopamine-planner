import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const androidRoot = resolve(scriptDir, '..');
const projectRoot = resolve(androidRoot, '..');
const webDir = resolve(androidRoot, 'www');
const entries = [
  'index.html',
  'app.js',
  'style.css',
  'illustrations.css',
  'farm3d.js',
  'flower.svg',
  'manifest.webmanifest',
  'sw.js',
  'assets',
  'vendor',
];

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });
for (const entry of entries) {
  await cp(resolve(projectRoot, entry), resolve(webDir, entry), { recursive: true });
}

const indexPath = resolve(webDir, 'index.html');
let html = await readFile(indexPath, 'utf8');
const appScript = /(<script src="\.\/app\.js(?:\?[^\"]*)?" defer><\/script>)/;
if (!appScript.test(html)) throw new Error('Could not find the planner app.js script tag in index.html');
html = html.replace(appScript, '<script src="./android-notifications.js" defer></script>$1');
await writeFile(indexPath, html, 'utf8');

console.log(`Prepared Android web bundle from ${projectRoot}`);
