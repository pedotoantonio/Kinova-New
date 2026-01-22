/**
 * Detox Configuration
 * E2E testing configuration for iOS and Android
 */

module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.js",
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath:
        "ios/build/Build/Products/Debug-iphonesimulator/KinovaNewStile.app",
      build:
        "xcodebuild -workspace ios/KinovaNewStile.xcworkspace -scheme KinovaNewStile -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
    },
    "ios.release": {
      type: "ios.app",
      binaryPath:
        "ios/build/Build/Products/Release-iphonesimulator/KinovaNewStile.app",
      build:
        "xcodebuild -workspace ios/KinovaNewStile.xcworkspace -scheme KinovaNewStile -configuration Release -sdk iphonesimulator -derivedDataPath ios/build",
    },
    "android.debug": {
      type: "android.apk",
      binaryPath: "android/app/build/outputs/apk/debug/app-debug.apk",
      build:
        "cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug",
      reversePorts: [8081],
    },
    "android.release": {
      type: "android.apk",
      binaryPath: "android/app/build/outputs/apk/release/app-release.apk",
      build:
        "cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: { type: "iPhone 15" },
    },
    "simulator.ipad": {
      type: "ios.simulator",
      device: { type: "iPad Pro (12.9-inch) (6th generation)" },
    },
    emulator: {
      type: "android.emulator",
      device: { avdName: "Pixel_5_API_33" },
    },
    "attached.android": {
      type: "android.attached",
      device: { adbName: ".*" },
    },
  },
  configurations: {
    "ios.sim.debug": {
      device: "simulator",
      app: "ios.debug",
    },
    "ios.sim.release": {
      device: "simulator",
      app: "ios.release",
    },
    "ios.ipad.debug": {
      device: "simulator.ipad",
      app: "ios.debug",
    },
    "android.emu.debug": {
      device: "emulator",
      app: "android.debug",
    },
    "android.emu.release": {
      device: "emulator",
      app: "android.release",
    },
    "android.att.debug": {
      device: "attached.android",
      app: "android.debug",
    },
  },
};
