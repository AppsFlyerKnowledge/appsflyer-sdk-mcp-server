import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { execFileSync } from "child_process";

/**
 * Returns absolute path to adb binary based on OS platform
 */
export function getAdbPath(): string {
  const platform = os.platform();
  const home = os.homedir();

  let adbPath;
  if (platform === "win32") {
    adbPath = path.join(
      home,
      "AppData",
      "Local",
      "Android",
      "Sdk",
      "platform-tools",
      "adb.exe"
    );
  } else if (platform === "darwin") {
    adbPath = path.join(
      home,
      "Library",
      "Android",
      "sdk",
      "platform-tools",
      "adb"
    );
  } else if (platform === "linux") {
    adbPath = path.join(home, "Android", "Sdk", "platform-tools", "adb");
  } else {
    const msg = `[ADB] Unsupported OS platform for ADB: ${platform}`;
    console.error(msg);
    throw new Error(msg);
  }
  return adbPath;
}

/**
 * Validates adb binary existence and execution permission
 */
export function validateAdb(adbPath: string): void {
  const resolvedPath = fs.realpathSync(adbPath);

  if (!fs.existsSync(resolvedPath)) {
    const msg = `[ADB] ADB binary not found at: ${resolvedPath}`;
    console.error(msg);
    throw new Error(msg);
  }
  try {
    fs.accessSync(resolvedPath, fs.constants.X_OK);
  } catch {
    const msg = `[ADB] ADB binary is not executable: ${resolvedPath}`;
    console.error(msg);
    throw new Error(msg);
  }
}

/**
 * Returns list of connected device IDs
 */
export function getConnectedDevices(adbPath: string): string[] {
  try {
    const output = execFileSync(adbPath, ["devices"], { encoding: "utf8" });
    const lines = output.split("\n").slice(1); // Skip the header line
    const devices = lines
      .map((line) => line.trim())
      .filter(
        (line) => line && line.includes("device") && !line.includes("offline")
      )
      .map((line) => line.split("\t")[0]);
    return devices;
  } catch (err: any) {
    const msg = `[ADB] Failed to retrieve connected devices: ${
      err.message || err
    }`;
    console.error(msg);
    throw new Error(msg);
  }
}
