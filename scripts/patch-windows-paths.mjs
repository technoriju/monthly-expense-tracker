import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

// This script fixes Windows MAX_PATH (260 char limit) issues during Android CMake builds
// for React Native New Architecture libraries (reanimated, gesture-handler, screens, etc.).
// It creates junctions so external source folders appear inside each library's android/ dir,
// avoiding deeply nested CMake object paths like CMakeFiles/.../D_/reactNative/.../foo.cpp.o.

if (process.platform !== 'win32') {
  process.exit(0);
}

const root = process.cwd();

function createJunction(linkPath, targetPath) {
  if (existsSync(linkPath)) return;
  if (!existsSync(targetPath)) return;
  try {
    execSync(`cmd /c "mklink /J \"${linkPath}\" \"${targetPath}\""`, { stdio: 'ignore' });
    console.log(`Created junction: ${linkPath} -> ${targetPath}`);
  } catch (err) {
    console.warn(`Could not create junction ${linkPath}:`, err.message);
  }
}

function replaceInFile(filePath, search, replacement) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  if (content.includes(replacement)) return;
  if (content.includes(search)) {
    writeFileSync(filePath, content.replace(search, replacement), 'utf8');
    console.log(`Patched ${filePath}`);
  }
}

function setOrReplaceObjectPathMax(filePath, max = 240) {
  if (!existsSync(filePath)) return;
  let content = readFileSync(filePath, 'utf8');
  content = content.replace(/\n*set\(CMAKE_OBJECT_PATH_MAX\s+\d+\)/g, '');
  if (content.includes('cmake_minimum_required')) {
    content = content.replace(/(cmake_minimum_required\([^\)]+\))/, `$1\nset(CMAKE_OBJECT_PATH_MAX ${max})`);
    writeFileSync(filePath, content, 'utf8');
    console.log(`Set CMAKE_OBJECT_PATH_MAX ${max} in ${filePath}`);
  }
}

// 1. Junctions
createJunction(
  join(root, 'node_modules', 'react-native-reanimated', 'android', 'Common'),
  join(root, 'node_modules', 'react-native-reanimated', 'Common')
);
createJunction(
  join(root, 'node_modules', 'react-native-worklets', 'android', 'Common'),
  join(root, 'node_modules', 'react-native-worklets', 'Common')
);
createJunction(
  join(root, 'node_modules', 'react-native-gesture-handler', 'android', 'shared'),
  join(root, 'node_modules', 'react-native-gesture-handler', 'shared')
);
createJunction(
  join(root, 'node_modules', 'react-native-screens', 'android', 'common'),
  join(root, 'node_modules', 'react-native-screens', 'common')
);
createJunction(
  join(root, 'node_modules', 'react-native-safe-area-context', 'android', 'common'),
  join(root, 'node_modules', 'react-native-safe-area-context', 'common')
);
createJunction(
  join(root, 'node_modules', 'react-native-svg', 'android', 'common'),
  join(root, 'node_modules', 'react-native-svg', 'common')
);

// 2. Set CMAKE_OBJECT_PATH_MAX to 240
// 240 leaves enough room for CMake's 160-170 char build directories while remaining below Windows 260 limit.
// If set too low (e.g. 150), CMake gives up hashing for directories > 150 chars, causing ninja Stat() 260 errors.
const cmakeFilesToSetMax = [
  join(root, 'node_modules', 'react-native', 'ReactAndroid', 'cmake-utils', 'ReactNative-application.cmake'),
  join(root, 'node_modules', 'react-native-reanimated', 'android', 'CMakeLists.txt'),
  join(root, 'node_modules', 'react-native-gesture-handler', 'android', 'CMakeLists.txt'),
  join(root, 'node_modules', 'react-native-screens', 'android', 'src', 'main', 'jni', 'CMakeLists.txt'),
  join(root, 'node_modules', 'react-native-safe-area-context', 'android', 'src', 'main', 'jni', 'CMakeLists.txt'),
  join(root, 'node_modules', 'react-native-svg', 'android', 'src', 'main', 'jni', 'CMakeLists.txt'),
  join(root, 'node_modules', 'react-native-worklets', 'android', 'CMakeLists.txt'),
];

for (const file of cmakeFilesToSetMax) {
  setOrReplaceObjectPathMax(file, 240);
}

// 3. Patches to source directories in CMakeLists
replaceInFile(
  join(root, 'node_modules', 'react-native-reanimated', 'android', 'CMakeLists.txt'),
  'set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/../Common/cpp")',
  'set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/Common/cpp")'
);
replaceInFile(
  join(root, 'node_modules', 'react-native-reanimated', 'android', 'CMakeLists.txt'),
  'set(NATIVEVIEW_DIR "${CMAKE_SOURCE_DIR}/../Common/NativeView")',
  'set(NATIVEVIEW_DIR "${CMAKE_SOURCE_DIR}/Common/NativeView")'
);

replaceInFile(
  join(root, 'node_modules', 'react-native-worklets', 'android', 'CMakeLists.txt'),
  'set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/../Common/cpp")',
  'set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/Common/cpp")'
);

replaceInFile(
  join(root, 'node_modules', 'react-native-gesture-handler', 'android', 'CMakeLists.txt'),
  '../shared/shadowNodes',
  'shared/shadowNodes'
);

replaceInFile(
  join(root, 'node_modules', 'react-native-screens', 'android', 'src', 'main', 'jni', 'CMakeLists.txt'),
  'set(LIB_COMMON_DIR ${LIB_ANDROID_DIR}/../common/cpp)',
  'set(LIB_COMMON_DIR ${LIB_ANDROID_DIR}/common/cpp)'
);

replaceInFile(
  join(root, 'node_modules', 'react-native-safe-area-context', 'android', 'src', 'main', 'jni', 'CMakeLists.txt'),
  'set(LIB_COMMON_DIR ${LIB_ANDROID_DIR}/../common/cpp)',
  'set(LIB_COMMON_DIR ${LIB_ANDROID_DIR}/common/cpp)'
);

replaceInFile(
  join(root, 'node_modules', 'react-native-svg', 'android', 'src', 'main', 'jni', 'CMakeLists.txt'),
  'set(RNSVG_COMMON_DIR ${RNSVG_ANDROID_DIR}/../common/cpp)',
  'set(RNSVG_COMMON_DIR ${RNSVG_ANDROID_DIR}/common/cpp)'
);
