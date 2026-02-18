import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { startLogcatStream, logBuffer } from "../logcat/stream.js";
import { getParsedAppsflyerFilters } from "../logcat/parse.js";
import { descriptions } from "../constants/descriptions.js";

export function verifyAppsFlyerSdk(server: McpServer): void {
  server.registerTool(
    "verifyAppsFlyerSdk",
    {
      title: "Verify AppsFlyer SDK",
      description: descriptions.verifyAppsFlyerSdk,
      inputSchema: {
        deviceId: z.string().optional(),
        devKey: z
          .string()
          .optional()
          .describe("AppsFlyer Dev Key (used if DEV_KEY env is missing)"),
        appId: z
          .string()
          .optional()
          .describe("Android app ID (used if APP_ID env is missing)"),
      },
    },
    async ({ deviceId, devKey: devKeyArg, appId: appIdArg }) => {
      const devKey = devKeyArg?.trim() || process.env.DEV_KEY?.trim();
      const appId = appIdArg?.trim() || process.env.APP_ID?.trim();
      if (!devKey || !appId) {
        const missing: string[] = [];
        if (!devKey) missing.push("DEV_KEY");
        if (!appId) missing.push("APP_ID");

        return {
          content: [
            {
              type: "text",
              text:
                `❌ Missing required value(s): ${missing.join(", ")}.\n` +
                `Please add DEV_KEY and APP_ID in your mcp.json env.\n` +
                `If you prefer, provide the missing value(s) directly as tool input.`,
            },
          ],
        };
      }

      try {
        await startLogcatStream("AppsFlyer_", deviceId);
        let waited = 0;
        while (logBuffer.length === 0 && waited < 2000) {
          await new Promise((res) => setTimeout(res, 200));
          waited += 200;
        }
      } catch (err: any) {
        return {
          content: [
            { type: "text", text: `❌ Error fetching logs: ${err.message}` },
          ],
        };
      }

      const conversionLogs = getParsedAppsflyerFilters("CONVERSION-");
      const launchLogs = getParsedAppsflyerFilters("LAUNCH-");
      const sinceMs = Date.now() - 5 * 60 * 1000;
      const recentConversionLogs = conversionLogs.filter(
        (log) => log.timestampMs && log.timestampMs >= sinceMs
      );
      const recentLaunchLogs = launchLogs.filter(
        (log) => log.timestampMs && log.timestampMs >= sinceMs
      );

      const relevantLog =
        recentConversionLogs[recentConversionLogs.length - 1] ||
        recentLaunchLogs[recentLaunchLogs.length - 1];

      if (!relevantLog) {
        return {
          content: [
            {
              type: "text",
              text: `❌ No CONVERSION- or LAUNCH- logs from the last 5 minutes were found.`,
            },
          ],
        };
      }

      const uid = relevantLog.json["uid"] || relevantLog.json["device_id"];
      const timestamp = relevantLog.timestamp;

      if (!uid) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Log found but missing uid or device_id.`,
            },
          ],
        };
      }

      const url = `https://gcdsdk.appsflyer.com/install_data/v4.0/${appId}?devkey=${devKey}&device_id=${uid}`;
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: { accept: "application/json" },
        });
        const json = (await res.json()) as any;

        const afStatus = json.af_status || "Unknown";
        const installTime = json.install_time || "N/A";

        return {
          content: [
            {
              type: "text",
              text:
                `✅ The AppsFlyer SDK verification succeeded.\n` +
                `SDK is active and responding.\n\n` +
                `🔹 App ID: ${appId}\n` +
                `🔹 UID: ${uid}\n` +
                `🔹 Timestamp: ${timestamp}\n` +
                `🔹 Status: ${afStatus} install (af_status: "${afStatus}")\n` +
                `🔹 Install time: ${installTime}\n\n` +
                `If you need more details or want to check specific events or logs, let me know!`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Error fetching SDK data: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
