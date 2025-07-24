import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { startLogcatStream } from "../logcat/stream.js";
import { getParsedAppsflyerFilters } from "../logcat/parse.js";
import { descriptions } from "../constants/descriptions.js";

const APPSFLYER_PREFIX = "AppsFlyer_";
const DEEPLINK_KEYWORD = "deepLink";

export function verifyDeepLink(server: McpServer) {
  server.registerTool(
    "verifyDeepLink",
    {
      title: "Verify Deep Link",
      description: descriptions.verifyDeepLink,
      inputSchema: {
        url: z.string(),
        deviceId: z.string().optional(),
      },
    },
    async ({ url, deviceId }) => {
      try {
        await startLogcatStream(APPSFLYER_PREFIX, deviceId);

        // Wait up to 2 seconds for logs to arrive
        let waited = 0;
        while (
          waited < 2000 &&
          getParsedAppsflyerFilters(DEEPLINK_KEYWORD).length === 0
        ) {
          await new Promise((res) => setTimeout(res, 200));
          waited += 200;
        }

        const logs = getParsedAppsflyerFilters(DEEPLINK_KEYWORD);

        if (!logs.length) {
          return {
            content: [
              {
                type: "text",
                text: `❌ No deep link logs found.`,
              },
            ],
          };
        }

        const latestLog = logs[logs.length - 1];
        const urlFound = latestLog.json?.deepLinkValue?.includes(url);

        if (urlFound) {
          return {
            content: [
              {
                type: "text",
                text: `✅ Deep link "${url}" was successfully received.\n\n${JSON.stringify(
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
                text: `❌ Deep link "${url}" not found in the latest deep link log.\n\nLatest log:\n${JSON.stringify(
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
              text: `[Error verifying deep link "${url}"]: ${err.message || err}`,
            },
          ],
        };
      }
    }
  );
}
