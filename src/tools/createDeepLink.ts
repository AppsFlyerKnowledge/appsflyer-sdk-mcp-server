import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { spawnSync } from "child_process";
import os from "os";
import { createHmac, randomUUID } from "crypto";
import { descriptions } from "../constants/descriptions.js";
import { steps } from "../constants/steps.js";
import { setLatestDeepLinkExpectedData } from "../state/deepLinkState.js";

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

type ParsedOneLinkIds = {
  oneLinkId: string;
  shortLinkId: string;
};

const ONELINK_API_VERSION = "v2";

function parseOneLinkIds(oneLinkUrl: string): ParsedOneLinkIds | null {
  const url = new URL(oneLinkUrl);
  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts.length < 2) {
    return null;
  }

  const [oneLinkId, shortLinkId] = pathParts;
  if (!oneLinkId || !shortLinkId) {
    return null;
  }

  return { oneLinkId, shortLinkId };
}

function concatDataForHmac(...values: string[]): string {
  // Use the INVISIBLE SEPARATOR (U+2063) as delimiter.
  return values.join("\u2063");
}

function hmacSha256(message: string, secretKey: string): string {
  return createHmac("sha256", secretKey).update(message).digest("hex").toLowerCase();
}

function generateOneLinkSignature(
  devKey: string,
  uuid: string,
  ...messageParts: string[]
): string {
  const list = [...messageParts];
  list.splice(1, 0, ONELINK_API_VERSION);
  const message = concatDataForHmac(...list);
  const secret = `${devKey}${uuid}${ONELINK_API_VERSION}`;
  return hmacSha256(message, secret);
}

async function fetchOneLinkDataSigned(args: {
  devKey: string;
  oneLinkId: string;
  shortLinkId: string;
}): Promise<{ data: unknown }> {
  const uuid = randomUUID();
  const httpMethod = "GET";
  const buildNumber = "6.12.5";
  const signature = generateOneLinkSignature(
    args.devKey,
    uuid,
    httpMethod,
    uuid,
    args.oneLinkId,
    args.shortLinkId,
    buildNumber,
  );
  const url = `https://onelink.appsflyersdk.com/shortlink-sdk/v2/${args.oneLinkId}?id=${args.shortLinkId}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Af-Signature": signature,
      "Af-UUID": uuid,
      "Af-Meta-Sdk-Ver": buildNumber,
    },
  });

  const rawBody = await res.text();
  if (!res.ok) {
    let parsedError: unknown = rawBody;
    try {
      parsedError = JSON.parse(rawBody);
    } catch {
      // Keep raw text if response is not JSON.
    }
    throw new Error(
      `Failed to fetch OneLink data. Status: ${res.status}. Response: ${typeof parsedError === "string" ? parsedError : JSON.stringify(parsedError)}`
    );
  }

  try {
    return { data: JSON.parse(rawBody) };
  } catch {
    throw new Error("OneLink API returned non-JSON response body.");
  }
}

export function createDeepLink(server: McpServer) {
  server.registerTool(
    "createDeepLink",
  {
    title: "AppsFlyer OneLink Deep Link Setup Prompt",
    description: descriptions.createDeepLink,
    inputSchema: {
      oneLinkUrl: z.string().url().optional(),
      devKey: z.string().optional(),
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
    const devKey = args.devKey ?? process.env.DEV_KEY;
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
    const parsedIds = parseOneLinkIds(args.oneLinkUrl);
    if (!parsedIds) {
      return {
        content: [
          {
            type: "text",
            text:
              "❌ Could not extract oneLinkId and shortLinkId from the OneLink URL.\n" +
              "Expected format: https://<domain>/<oneLinkId>/<shortLinkId>",
          },
        ],
      };
    }
    let oneLinkData: unknown;
    let oneLinkValidationNote = "";
    if (!devKey) {
      oneLinkValidationNote =
        "⚠️ OneLink validation skipped because AppsFlyer devKey was not provided.";
    } else {
      try {
        const result = await fetchOneLinkDataSigned({
          devKey,
          oneLinkId: parsedIds.oneLinkId,
          shortLinkId: parsedIds.shortLinkId,
        });
        oneLinkData = result.data;
        if (oneLinkData && typeof oneLinkData === "object") {
          setLatestDeepLinkExpectedData(
            args.oneLinkUrl,
            oneLinkData as Record<string, unknown>
          );
        }
      } catch (err: any) {
        oneLinkValidationNote =
          `⚠️ OneLink validation failed: ${err.message}\n` +
          "Continuing with deep link setup steps.";
      }
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
            oneLinkData
              ? `✅ OneLink data:\n${JSON.stringify(oneLinkData, null, 2)}`
              : oneLinkValidationNote,
            ...(oneLinkValidationNote && oneLinkData ? ["", oneLinkValidationNote] : []),
            "",
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
