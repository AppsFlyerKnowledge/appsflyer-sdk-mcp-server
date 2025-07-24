import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { startLogcatStream, logBuffer } from "../logcat/stream.js";
import { extractJsonFromLine } from "../logcat/parse.js";
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
      },
    },
    async ({ deviceId }) => {
      const devKey = process.env.DEV_KEY;
      if (!devKey) {
        return {
          content: [
            {
              type: "text",
              text: `❌ DevKey environment variable (DEV_KEY) not set.`,
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

      const relevantLog =
        conversionLogs[conversionLogs.length - 1] ||
        launchLogs[launchLogs.length - 1];

      if (!relevantLog) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to find any CONVERSION- or LAUNCH- log with uid.`,
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

      let appId: string | undefined;
      for (const line of logBuffer.slice().reverse()) {
        const json = extractJsonFromLine(line);
        if (json?.app_id || json?.appId) {
          appId = json.app_id || json.appId;
          break;
        }

        const match = line.match(/app_id=([a-zA-Z0-9._]+)/);
        if (match) {
          appId = match[1];
          break;
        }
      }

      if (!appId) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Could not find app_id in logs.`,
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
