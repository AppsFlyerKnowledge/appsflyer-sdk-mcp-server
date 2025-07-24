import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { startLogcatStream } from "../logcat/stream.js";
import { getParsedAppsflyerFilters } from "../logcat/parse.js";
import { descriptions } from "../constants/descriptions.js";

const APPSFLYER_PREFIX = "AppsFlyer_";

export function createLogTool(
  server: McpServer,
  toolName: keyof typeof descriptions,
  keyword: string
): void {
  server.registerTool(
    toolName,
    {
      title: toolName
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (s) => s.toUpperCase())
        .trim(),
      description: descriptions[toolName],
      inputSchema: {
        deviceId: z.string().optional(),
      },
    },
    async ({ deviceId }) => {
      try {
        await startLogcatStream(APPSFLYER_PREFIX, deviceId);

        // Wait max 2 seconds for logs to populate
        let waited = 0;
        while (waited < 2000 && getParsedAppsflyerFilters(keyword).length === 0) {
          await new Promise((res) => setTimeout(res, 200));
          waited += 200;
        }

        const logs = getParsedAppsflyerFilters(keyword);

        if (keyword === "CONVERSION-" || keyword === "LAUNCH-") {
          if (!logs.length) {
            return {
              content: [
                {
                  type: "text",
                  text: "No logs entry found.",
                },
              ],
            };
          }

          const latestLog = logs[logs.length - 1];
          const desiredKeys = [
            "af_timestamp",
            "uid",
            "installDate",
            "firstLaunchDate",
            "advertiserId",
            "advertiserIdEnabled",
            "onelink_id",
          ];

          const filtered = Object.fromEntries(
            desiredKeys
              .filter((key) => key in latestLog.json)
              .map((key) => [key, latestLog.json[key]])
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(filtered, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: logs.length
                ? JSON.stringify(logs, null, 2)
                : `No log entries found for keyword: ${keyword}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `[Error fetching logs for keyword ${keyword}] ${err.message || err}`,
            },
          ],
        };
      }
    }
  );
}
