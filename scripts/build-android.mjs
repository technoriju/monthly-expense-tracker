import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = process.cwd();
const type = (process.argv[2] || 'apk').toLowerCase();
const isAab = type === 'aab' || type === 'bundle';
const gradleTask = isAab ? 'bundleRelease' : 'assembleRelease';

// If android directory does not exist, run expo prebuild
if (!existsSync(join(root, 'android'))) {
  console.log('Running expo prebuild for android...');
  const prebuild = spawnSync('npx', ['expo', 'prebuild', '--platform', 'android'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (prebuild.status !== 0) {
    process.exit(prebuild.status ?? 1);
  }
}

// Ensure Windows CMake paths are patched
if (process.platform === 'win32') {
  const patchScript = join(root, 'scripts', 'patch-windows-paths.mjs');
  if (existsSync(patchScript)) {
    spawnSync('node', [patchScript], { cwd: root, stdio: 'inherit' });
  }
}

const isWin = process.platform === 'win32';
const gradlew = resolve(root, 'android', isWin ? 'gradlew.bat' : 'gradlew');

console.log(`\nBuilding Android ${isAab ? 'AAB (.aab)' : 'APK (.apk)'} with task: ${gradleTask}...\n`);
// APK = one file with every ABI. x86/x86_64 run only on emulators (~55 MB of the APK),
// so sideload APKs ship ARM only. AAB keeps all ABIs; Play delivers per-device splits.
const archArgs = isAab ? [] : ['-PreactNativeArchitectures=armeabi-v7a,arm64-v8a'];
const result = spawnSync(gradlew, [gradleTask, ...archArgs, '-x', 'lint', '-x', 'test'], {
  cwd: resolve(root, 'android'),
  stdio: 'inherit',
  shell: true,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const outputDir = isAab
  ? join('android', 'app', 'build', 'outputs', 'bundle', 'release')
  : join('android', 'app', 'build', 'outputs', 'apk', 'release');

console.log(`\nBuild completed successfully!`);
console.log(`Output directory: ${outputDir}`);
