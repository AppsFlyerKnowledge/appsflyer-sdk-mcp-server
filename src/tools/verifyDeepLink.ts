import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { startLogcatStream } from "../logcat/stream.js";
import { getParsedAppsflyerFilters } from "../logcat/parse.js";
import { descriptions } from "../constants/descriptions.js";
import { getLatestDeepLinkExpectedData } from "../state/deepLinkState.js";

const APPSFLYER_PREFIX = "AppsFlyer_";
const DEEPLINK_KEYWORD = "deepLink";
const STATUS_KEY = "status";

type DeepLinkEvaluationType = "deferred" | "direct";

type DeepLinkFieldSpec = Readonly<{
  key: string;
  aliases?: readonly string[];
  requiredFor?: readonly DeepLinkEvaluationType[];
  compareFor?: readonly DeepLinkEvaluationType[];
}>;

const DEEP_LINK_FIELDS: readonly DeepLinkFieldSpec[] = [
  { key: "status", requiredFor: ["deferred", "direct"] },
  { key: "is_deferred", requiredFor: ["deferred", "direct"], compareFor: ["deferred", "direct"] },
  { key: "deep_link_value", requiredFor: ["deferred", "direct"], compareFor: ["deferred", "direct"] },
  { key: "deep_link_sub1", requiredFor: ["deferred", "direct"], compareFor: ["deferred", "direct"] },

  { key: "af_sub1", requiredFor: ["deferred"], compareFor: ["deferred"] },
  { key: "af_sub2", requiredFor: ["deferred"], compareFor: ["deferred"] },
  { key: "af_sub3", requiredFor: ["deferred"], compareFor: ["deferred"] },
  { key: "af_sub4", requiredFor: ["deferred"], compareFor: ["deferred"] },
  { key: "af_sub5", requiredFor: ["deferred"], compareFor: ["deferred"] },

  { key: "pid", aliases: ["media_source"], requiredFor: ["direct"], compareFor: ["direct"] },
  { key: "c", aliases: ["campaign"], requiredFor: ["direct"], compareFor: ["direct"] },
] as const;

function isMissingRequiredValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

function getValueForSpec(
  spec: DeepLinkFieldSpec,
  payload: Record<string, unknown> | undefined,
  status: string | undefined
): unknown {
  if (spec.key === "status") return status;
  const directValue = getFieldFromSources(spec.key, payload);
  if (directValue !== undefined) return directValue;
  for (const alias of spec.aliases ?? []) {
    const aliasValue = getFieldFromSources(alias, payload);
    if (aliasValue !== undefined) return aliasValue;
  }
  return undefined;
}

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
        const isDeferred =
          getBooleanField(foundLog.json, "is_deferred") ??
          getBooleanField(deepLinkPayload, "is_deferred");
        const expectedDataState = getLatestDeepLinkExpectedData();
        const expectedPayload = expectedDataState?.payload;
        const receivedPayload: Record<string, unknown> = {
          ...deepLinkPayload,
          ...(foundLog.json ?? {}),
        };

        const evaluationType: DeepLinkEvaluationType =
          isDeferred === false ? "direct" : "deferred";
        const deepLinkTypeLabel = isDeferred === undefined ? "unknown" : evaluationType;

        const fieldEvals = DEEP_LINK_FIELDS.map((spec) => {
          const expectedRaw = getValueForSpec(spec, expectedPayload, undefined);
          const receivedRaw = getValueForSpec(spec, receivedPayload, status);

          const expectedNorm = normalizeToComparable(expectedRaw);
          const receivedNorm = normalizeToComparable(receivedRaw);

          const expectedPresent = !isMissingRequiredValue(expectedRaw);

          return {
            spec,
            expectedRaw,
            expectedNorm,
            expectedPresent,
            receivedRaw,
            receivedNorm,
          };
        });

        // We validate against what the OneLink payload actually contained.
        // If a field isn't present in the expected OneLink data, we shouldn't
        // mark it as "missing" in the received deep link callback.
        const alwaysRequiredKeys = new Set(["status", "is_deferred"]);
        const requiredFieldEvals = fieldEvals.filter((ev) => {
          if (alwaysRequiredKeys.has(ev.spec.key)) return true;

          // If we have expected OneLink data, only require fields that were
          // actually present there for this deep link type.
          if (expectedPayload) {
            return (
              (ev.spec.compareFor?.includes(evaluationType) ?? false) &&
              ev.expectedPresent
            );
          }

          // Without expected data, fall back to type-specific required list.
          return ev.spec.requiredFor?.includes(evaluationType) ?? false;
        });

        const compareFieldEvals = fieldEvals.filter(
          (ev) =>
            (ev.spec.compareFor?.includes(evaluationType) ?? false) && ev.expectedPresent
        );

        const missingRequired = requiredFieldEvals
          .filter((ev) => isMissingRequiredValue(ev.receivedRaw))
          .map((ev) => ({
            key: ev.spec.key,
            received: ev.receivedNorm,
          }));

        const summaryFields = requiredFieldEvals.filter(
          (ev) => ev.spec.key !== "status"
        );
        const summary: Record<string, unknown> = {
          status: status ?? "UNKNOWN",
          ...Object.fromEntries(
            summaryFields.map((ev) => [
              ev.spec.key,
              ev.receivedNorm,
            ])
          ),
        };

        const comparisons = compareFieldEvals.map((ev) => {
          const matches = ev.expectedNorm === ev.receivedNorm;
          return {
            key: ev.spec.key,
            expected: ev.expectedNorm,
            received: ev.receivedNorm,
            included: true,
            matches,
          };
        });
        const mismatches = comparisons.filter((item) => !item.matches);
        const hasExpectedData = Boolean(expectedPayload);
        const deepLinkTypeNote = `\n\nDeep link type: ${deepLinkTypeLabel} (is_deferred: ${
          isDeferred === undefined ? "unknown" : String(isDeferred)
        }).`;
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
        const requiredInfo = missingRequired.length
          ? `❌ Missing required fields for ${evaluationType} deep link:\n${JSON.stringify(
              missingRequired,
              null,
              2
            )}`
          : `✅ Required fields present for ${evaluationType} deep link.`;
        const verificationPassed =
          status === "FOUND" &&
          missingRequired.length === 0 &&
          (hasExpectedData ? mismatches.length === 0 : true);
        const verificationPrefix = verificationPassed
          ? "✅ Deep link verification passed."
          : "❌ Deep link verification failed.";

        return {
          content: [
            {
              type: "text",
              text: `${verificationPrefix}\n\nStatus check: ${status === "FOUND" ? "✅ status=FOUND" : `❌ status=${status ?? "UNKNOWN"}`}\n${requiredInfo}\n${comparisonInfo}\n\n${expectedInfo}\n\nSummary:\n${JSON.stringify(
                summary,
                null,
                2
              )}${deepLinkTypeNote}\n\nFull log:\n${JSON.stringify(foundLog, null, 2)}`,
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
