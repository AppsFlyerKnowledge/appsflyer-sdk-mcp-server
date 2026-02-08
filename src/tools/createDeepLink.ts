import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { descriptions } from "../constants/descriptions.js";
import { steps } from "../constants/steps.js";

export function createDeepLink(server: McpServer) {
  server.registerTool(
    "createDeepLink",
  {
    title: "AppsFlyer OneLink Deep Link Setup Prompt",
    description: descriptions.createDeepLink,
    inputSchema: {
      oneLinkUrl: z.string().url().optional(),
      includeUriScheme: z.boolean().optional(),
    },
  },
  async (args) => {
    if (!args.oneLinkUrl) {
      return {
        content: [
          {
            type: "text",
            text: "What is your OneLink URL?",
          },
        ],
      };
    }
    if (args.includeUriScheme === undefined) {
      return {
        content: [
          {
            type: "text",
            text: "Do you want to include a custom uriScheme? (yes/no)",
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: (
            steps.createDeepLink(
              new URL(args.oneLinkUrl).hostname,
              args.includeUriScheme
            ) ?? []
          ).join('\n\n'),
        },
      ],
    };
    }
  );
}
