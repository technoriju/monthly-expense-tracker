// Writes src/features/settings/licenses.json: name, version and license of every direct
// runtime dependency, read from node_modules. Re-run after adding or updating a dependency:
//   npm run licenses
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function licenseOf(meta) {
  if (typeof meta.license === 'string') return meta.license;
  if (meta.license && typeof meta.license.type === 'string') return meta.license.type;
  if (Array.isArray(meta.licenses)) {
    return meta.licenses.map((l) => (typeof l === 'string' ? l : l.type)).join(' OR ');
  }
  return null;
}

const entries = Object.keys(pkg.dependencies ?? {})
  .sort()
  .map((name) => {
    const meta = JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8'));
    return { name, version: meta.version, license: licenseOf(meta) };
  });

const out = join(root, 'src', 'features', 'settings', 'licenses.json');
writeFileSync(out, `${JSON.stringify(entries, null, 2)}\n`);
console.log(`Wrote ${entries.length} entries to ${out}`);
