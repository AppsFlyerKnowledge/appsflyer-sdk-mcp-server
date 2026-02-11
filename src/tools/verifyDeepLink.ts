import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { startLogcatStream } from "../logcat/stream.js";
import { getParsedAppsflyerFilters } from "../logcat/parse.js";
import { descriptions } from "../constants/descriptions.js";
import { getLatestDeepLinkExpectedData } from "../state/deepLinkState.js";

const APPSFLYER_PREFIX = "AppsFlyer_";
const DEEPLINK_KEYWORD = "deepLink";
const STATUS_KEY = "status";
const COMPARABLE_KEYS = [
  "deep_link_value",
  "deep_link_sub1",
  "af_sub1",
  "af_sub2",
  "af_sub3",
  "af_sub4",
  "af_sub5",
  "campaign",
  "media_source",
  "is_deferred",
] as const;

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

function normalizeToComparable(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getFieldFromSources(
  key: string,
  ...sources: Array<Record<string, unknown> | undefined>
): unknown {
  for (const source of sources) {
    if (!source) continue;
    if (key in source) {
      return source[key];
    }
  }
  return undefined;
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
        const sinceMs = Date.now() - 5 * 60 * 1000;
        const recentLogs = logs.filter(
          (log) => log.timestampMs && log.timestampMs >= sinceMs
        );

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
                  "Confirm deep link setup, then ask me to verify again.",
              },
            ],
          };
        }

        if (!recentLogs.length) {
          return {
            content: [
              {
                type: "text",
                text:
                  "❌ No deep link logs from the last 5 minutes were found.\n\n" +
                  "Deep link verification only works after the full flow: integrate deep linking → run a deep link test → verify.\n" +
                  "If any step was skipped or done out of order, the verification can fail.",
              },
            ],
          };
        }

        const latestLog = recentLogs[recentLogs.length - 1];
        const foundLog = [...recentLogs]
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
          campaign: getDeepLinkString("campaign") ?? "",
          media_source: getDeepLinkString("media_source") ?? "",
        };
        const expectedDataState = getLatestDeepLinkExpectedData();
        const expectedPayload = expectedDataState?.payload;
        const receivedPayload: Record<string, unknown> = {
          ...deepLinkPayload,
          ...(foundLog.json ?? {}),
        };
        const comparisons = COMPARABLE_KEYS
          .map((key) => {
            const expected = normalizeToComparable(
              getFieldFromSources(key, expectedPayload)
            );
            const received = normalizeToComparable(
              getFieldFromSources(key, receivedPayload)
            );
            const included = expected !== "";
            const matches = included ? expected === received : true;
            return { key, expected, received, included, matches };
          })
          .filter((item) => item.included);
        const mismatches = comparisons.filter((item) => !item.matches);
        const hasExpectedData = Boolean(expectedPayload);
        const deferredNote =
          isDeferred === false
            ? "\n\nDirect deep link detected (is_deferred: false)."
            : "";
        const expectedInfo = hasExpectedData
          ? `Expected values source: ${expectedDataState?.oneLinkUrl ?? "latest createDeepLink payload"}`
          : "Expected values source: not available (run createDeepLink with a valid OneLink URL first).";
        const comparisonInfo = hasExpectedData
          ? comparisons.length
            ? mismatches.length
              ? `❌ Expected/received comparison failed.\nMismatches:\n${JSON.stringify(
                  mismatches,
                  null,
                  2
                )}`
              : `✅ Expected/received comparison passed for keys:\n${JSON.stringify(
                  comparisons.map((item) => item.key),
                  null,
                  2
                )}`
            : "⚠️ No comparable expected keys were found in stored OneLink data."
          : "⚠️ Skipping expected/received comparison because expected data is unavailable.";
        const verificationPassed = status === "FOUND" && (hasExpectedData ? mismatches.length === 0 : true);
        const verificationPrefix = verificationPassed
          ? "✅ Deep link verification passed."
          : "❌ Deep link verification failed.";

        return {
          content: [
            {
              type: "text",
              text: `${verificationPrefix}\n\nStatus check: ${status === "FOUND" ? "✅ status=FOUND" : `❌ status=${status ?? "UNKNOWN"}`}\n${comparisonInfo}\n\n${expectedInfo}\n\nSummary:\n${JSON.stringify(
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
