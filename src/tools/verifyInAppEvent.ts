import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { startLogcatStream } from "../logcat/stream.js";
import { getParsedAppsflyerFilters } from "../logcat/parse.js";
import { descriptions } from "../constants/descriptions.js";

const APPSFLYER_PREFIX = "AppsFlyer_";
const INAPP_KEYWORD = "INAPP-";

export function verifyInAppEvent(server: McpServer) {
  server.registerTool(
    "verifyInAppEvent",
    {
      title: "Verify In App Event",
      description: descriptions.verifyInAppEvent,
      inputSchema: {
        eventName: z.string(),
        deviceId: z.string().optional(),
      },
    },
    async ({ eventName, deviceId }) => {
      try {
        await startLogcatStream(APPSFLYER_PREFIX, deviceId);

        // Wait up to 2 seconds for logs
        let waited = 0;
        while (
          waited < 2000 &&
          getParsedAppsflyerFilters(INAPP_KEYWORD).length === 0
        ) {
          await new Promise((res) => setTimeout(res, 200));
          waited += 200;
        }

        const logs = getParsedAppsflyerFilters(INAPP_KEYWORD);

        if (!logs.length) {
          return {
            content: [
              {
                type: "text",
                text: `❌ No in-app event logs found.`,
              },
            ],
          };
        }

        const latestLog = logs[logs.length - 1];

        const eventInLog = latestLog.json?.eventName === eventName;

        if (eventInLog) {
          return {
            content: [
              {
                type: "text",
                text: `✅ Event "${eventName}" was successfully triggered.\n\n${JSON.stringify(
                  latestLog,
                  null,
                  2
                )}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `❌ Event "${eventName}" not found in the latest in-app event log.\n\nLatest log:\n${JSON.stringify(
                  latestLog,
                  null,
                  2
                )}`,
              },
            ],
          };
        }
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `[Error verifying in-app event "${eventName}"]: ${err.message || err}`,
            },
          ],
        };
      }
    }
  );
}
