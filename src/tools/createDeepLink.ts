import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { spawnSync } from "child_process";
import os from "os";
import { descriptions } from "../constants/descriptions.js";
import { steps } from "../constants/steps.js";

function expandHomeDir(path: string): string {
  if (path.startsWith("~/")) {
    return `${os.homedir()}/${path.slice(2)}`;
  }
  return path;
}

function extractSha256(output: string): string | undefined {
  const match = output.match(/SHA256:\s*([A-F0-9:]+)/i);
  return match?.[1];
}

export function createDeepLink(server: McpServer) {
  server.registerTool(
    "createDeepLink",
  {
    title: "AppsFlyer OneLink Deep Link Setup Prompt",
    description: descriptions.createDeepLink,
    inputSchema: {
      oneLinkUrl: z.string().url().optional(),
      includeUriScheme: z.boolean().optional(),
      hasSha256: z.enum(["yes", "no"]).optional(),
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
    if (args.hasSha256 === undefined) {
      return {
        content: [
          {
            type: "text",
            text: "Do you already have the SHA256? (yes/no)",
          },
        ],
      };
    }
    let shaMessage =
      args.hasSha256 === "yes"
        ? "✅ Great. Send the SHA256 to the marketer before testing direct deep links."
        : "I will generate the SHA256 for you.";
    if (args.hasSha256 === "no") {
      const keystorePath = expandHomeDir("~/.android/debug.keystore");
      const result = spawnSync(
        "keytool",
        ["-list", "-v", "-keystore", keystorePath, "-storepass", "android"],
        { encoding: "utf8" }
      );
      if (result.error) {
        return {
          content: [
            {
              type: "text",
              text:
                `❌ Failed to run keytool: ${result.error.message}\n\n` +
                "If you'd rather generate the SHA256 yourself, ask me for the instructions.",
            },
          ],
        };
      }
      if (result.status !== 0) {
        return {
          content: [
            {
              type: "text",
              text:
                `❌ keytool failed with exit code ${result.status}.\n\n` +
                "Use the SHA256 instructions below to generate it manually.",
            },
          ],
        };
      }
      const sha256 = extractSha256(result.stdout || "");
      if (!sha256) {
        return {
          content: [
            {
              type: "text",
              text:
                "❌ Could not find a SHA256 fingerprint in the keytool output.\n\n" +
                "Use the SHA256 instructions below to generate it manually.",
            },
          ],
        };
      }
      shaMessage =
        `✅ SHA256: ${sha256}\n` +
        "Send this to the marketer before testing direct deep links.";
    }
    return {
      content: [
        {
          type: "text",
          text: [
            shaMessage,
            "",
            (
              steps.createDeepLink(
                new URL(args.oneLinkUrl).hostname,
                args.includeUriScheme
              ) ?? []
            ).join("\n\n"),
          ].join("\n"),
        },
      ],
    };
    }
  );
}
