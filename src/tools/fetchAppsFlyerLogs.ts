import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { startLogcatStream, logBuffer } from "../logcat/stream.js";
import { descriptions } from "../constants/descriptions.js";

export function fetchAppsflyerLogs(server: McpServer): void {
  server.registerTool(
    "fetchAppsflyerLogs",
    {
      title: "Fetch AppsFlyer Logs",
      description: descriptions.fetchAppsflyerLogs,
      inputSchema: {
        deviceId: z.string().optional(),
      },
    },
    async ({ deviceId }) => {
      try {
        await startLogcatStream("AppsFlyer_", deviceId);
        let waited = 0;
        while (logBuffer.length === 0 && waited < 2000) {
          await new Promise((res) => setTimeout(res, 200));
          waited += 200;
        }
        const logs = logBuffer.join("\n");
        return {
          content: [
            {
              type: "text",
              text:
                logs || "[No AppsFlyer logs found in the last few seconds.]",
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `[Error fetching logs] ${err.message || err}`,
            },
          ],
        };
      }
    }
  );
}
