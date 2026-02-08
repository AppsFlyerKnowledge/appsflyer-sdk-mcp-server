import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { startLogcatStream } from "../logcat/stream.js";
import { getParsedAppsflyerFilters } from "../logcat/parse.js";
import { descriptions } from "../constants/descriptions.js";

const APPSFLYER_PREFIX = "AppsFlyer_";
const DEEPLINK_KEYWORD = "deepLink";
const STATUS_KEY = "status";

function getStringField(
  json: Record<string, any> | undefined,
  key: string
): string | undefined {
  if (!json) return undefined;
  const value = json[key];
  return typeof value === "string" ? value : undefined;
}

function getBooleanField(
  json: Record<string, any> | undefined,
  key: string
): boolean | undefined {
  if (!json) return undefined;
  const value = json[key];
  if (typeof value === "boolean") {
    return value;
  }
  return undefined;
}

function parseDeepLinkJson(value: unknown): Record<string, any> | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, any>) : undefined;
  } catch {
    return undefined;
  }
}

export function verifyDeepLink(server: McpServer) {
  server.registerTool(
    "verifyDeepLink",
    {
      title: "Verify Deep Link",
      description: descriptions.verifyDeepLink,
      inputSchema: {
        deviceId: z.string().optional(),
      },
    },
    async ({ deviceId }) => {
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
        const allLogs = getParsedAppsflyerFilters();

        if (!logs.length) {
          if (!allLogs.length) {
            return {
              content: [
                {
                  type: "text",
                  text:
                    "❌ No AppsFlyer logs found. This usually means the SDK isn't initialized or the app hasn't been launched.\n\n" +
                    "If the SDK isn’t fully integrated yet, complete the SDK integration steps. " +
                    "Once the SDK integration is verified, set up OneLink deep linking (createDeepLink) and re-verify.",
                },
              ],
            };
          }
          return {
            content: [
              {
                type: "text",
                text:
                  "❌ No deep link logs found. AppsFlyer logs are present, so the SDK is running, but deep link integration might be missing or the test wasn't executed.\n\n" +
                  "Confirm deep link setup (createDeepLink), then ask me to verify again.",
              },
            ],
          };
        }

        const latestLog = logs[logs.length - 1];
        const foundLog = [...logs]
          .reverse()
          .find((log) => getStringField(log.json, STATUS_KEY) === "FOUND");

        if (!foundLog) {
          return {
            content: [
              {
                type: "text",
                text: `❌ No deep link logs with status=FOUND were found.\n\nLatest log:\n${JSON.stringify(
                  latestLog,
                  null,
                  2
                )}`,
              },
            ],
          };
        }

        const status = getStringField(foundLog.json, STATUS_KEY);
        const deepLinkPayload =
          parseDeepLinkJson(foundLog.json?.deepLink) ??
          parseDeepLinkJson(foundLog.json?.deeplink);
        const getDeepLinkString = (key: string) =>
          getStringField(foundLog.json, key) ??
          getStringField(deepLinkPayload, key);
        const isDeferred =
          getBooleanField(foundLog.json, "is_deferred") ??
          getBooleanField(deepLinkPayload, "is_deferred");
        const summary = {
          status: status ?? "UNKNOWN",
          is_deferred: isDeferred ?? "",
          deep_link_value:
            getDeepLinkString("deep_link_value") ?? "",
          af_sub1: getDeepLinkString("af_sub1") ?? "",
          af_sub2: getDeepLinkString("af_sub2") ?? "",
          af_sub3: getDeepLinkString("af_sub3") ?? "",
          af_sub4: getDeepLinkString("af_sub4") ?? "",
          af_sub5: getDeepLinkString("af_sub5") ?? "",
          deep_link_sub1: getDeepLinkString("deep_link_sub1") ?? "",
        };
        const deferredNote =
          isDeferred === false
            ? "\n\nDirect deep link detected (is_deferred: false)."
            : "";

        return {
          content: [
            {
              type: "text",
              text: `✅ Deep link was successfully received (status=FOUND).\n\nSummary:\n${JSON.stringify(
                summary,
                null,
                2
              )}${deferredNote}\n\nFull log:\n${JSON.stringify(foundLog, null, 2)}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `[Error verifying deep link]: ${err.message || err}`,
            },
          ],
        };
      }
    }
  );
}
