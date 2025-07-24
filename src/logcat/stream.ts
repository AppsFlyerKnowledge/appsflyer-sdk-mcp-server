import { spawn } from "child_process";
import { getAdbPath, validateAdb, getConnectedDevices } from "./adb.js";

const MAX_LOG_LINES = 700;
export let logBuffer: string[] = [];
let currentDeviceId: string | null = null;

export async function startLogcatStream(
  filterTag = "AppsFlyer_",
  deviceIdParam?: string
): Promise<void> {
  logBuffer = [];

  const adbPath = getAdbPath();
  validateAdb(adbPath);
  const devices = getConnectedDevices(adbPath);

  let deviceId = deviceIdParam;
  if (!deviceId) {
    if (devices.length === 0) throw new Error("[Logcat] No devices connected.");
    if (devices.length > 1) {
      throw new Error(
        "[Logcat] Multiple devices found. Specify deviceId. Connected devices:\n" +
          devices.map((id) => `- ${id}`).join("\n")
      );
    }
    deviceId = devices[0];
  }

  if (!devices.includes(deviceId)) {
    throw new Error(`[Logcat] Device not connected: ${deviceId}`);
  }

  currentDeviceId = deviceId;

  return new Promise<void>((resolve, reject) => {
    const proc = spawn(adbPath, ["-s", deviceId, "logcat", "-d"]);
    let rawOutput = "";

    proc.stdout.on("data", (chunk) => {
      rawOutput += chunk.toString("utf8");
    });

    proc.stderr.on("data", (err) => {
      console.error("[Logcat stderr]", err.toString());
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(`[Logcat] logcat process exited with code ${code}`)
        );
      }

      const filteredLines = rawOutput
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.includes(filterTag));

      logBuffer = filteredLines.slice(-MAX_LOG_LINES);
      resolve();
    });

    proc.on("error", (err) => {
      reject(new Error(`[Logcat] Failed to dump logcat: ${err.message}`));
    });
  });
}

export function stopLogcatStream(): void {
  // No streaming, so just reset
  currentDeviceId = null;
  logBuffer = [];
}

export function extractParam(logs: string, key: string): string | undefined {
  const lines = logs.split("\n");
  for (const line of lines) {
    try {
      const jsonMatch = line.match(/{.*}/);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]);
        if (json[key]) return json[key];
      }
    } catch (_) {}
  }
  const regex = new RegExp(`[?&\\s"']${key}["=:\\s]*["']?([\\w\\-.]+)["']?`);
  const match = logs.match(regex);
  return match?.[1];
}
