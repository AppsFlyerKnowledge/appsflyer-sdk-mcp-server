import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { descriptions } from "../constants/descriptions.js";
import { steps } from "../constants/steps.js";

export function guideDeepLinkTesting(server: McpServer) {
  server.registerTool(
    "guideDeepLinkTesting",
    {
      title: "Guide Deep Link Testing",
      description: descriptions.guideDeepLinkTesting,
      inputSchema: {
        testType: z.enum(["deferred", "direct"]),
        oneLinkUrl: z.string().url().optional(),
      },
    },
    async ({ testType, oneLinkUrl }) => {
      return {
        content: [
          {
            type: "text",
            text: steps.guideDeepLinkTesting(testType, oneLinkUrl).join("\n\n"),
          },
        ],
      };
    }
  );
}
