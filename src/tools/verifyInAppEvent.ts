import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { logBuffer, startLogcatStream } from "../logcat/stream.js";
import { extractJsonFromLine, getParsedAppsflyerFilters } from "../logcat/parse.js";
import { descriptions } from "../constants/descriptions.js";

const APPSFLYER_PREFIX = "AppsFlyer_";
const INAPP_KEYWORD = "INAPP-";
const RECENT_WINDOW_MS = 5 * 60 * 1000;
const TASK_REGEX = /(INAPP-\d+)/i;

interface PreparedEvent {
  taskId: string;
  payload: Record<string, unknown>;
  eventName?: string;
}

interface CorrelatedPreparedEvent extends PreparedEvent {
  sent: boolean;
  status: "prepared" | "sent";
  evidence: string[];
}

function extractTaskId(
  line: string,
  json: Record<string, unknown> | null
): string | undefined {
  const jsonTaskId = json?.task_id ?? json?.taskId;
  if (typeof jsonTaskId === "string" && jsonTaskId.trim()) {
    return jsonTaskId.trim();
  }
  const taskMatch = line.match(TASK_REGEX);
  return taskMatch?.[1];
}

function getEventName(payload: Record<string, unknown>): string | undefined {
  const direct = payload.eventName;
  if (typeof direct === "string" && direct.trim()) return direct;
  const snake = payload.event_name;
  if (typeof snake === "string" && snake.trim()) return snake;
  return undefined;
}

function getPreparedEventsByTask(): CorrelatedPreparedEvent[] {
  const preparedEventsByTask = new Map<string, PreparedEvent>();
  const executionSuccessByTask = new Set<string>();
  let lastSeenTaskId: string | undefined;

  for (let i = 0; i < logBuffer.length; i += 1) {
    const line = logBuffer[i];
    if (!line.includes("AppsFlyer") || !line.includes(INAPP_KEYWORD)) continue;

    const lowerLine = line.toLowerCase();
    const json = extractJsonFromLine(line) as Record<string, unknown> | null;
    const explicitTaskId = extractTaskId(line, json);

    if (explicitTaskId) {
      lastSeenTaskId = explicitTaskId;
    }

    const effectiveTaskId = explicitTaskId ?? lastSeenTaskId;
    if (!effectiveTaskId) continue;

    if (lowerLine.includes("preparing data")) {
      if (!json) continue;
      const preparedEvent: PreparedEvent = {
        taskId: effectiveTaskId,
        payload: json,
        eventName: getEventName(json),
      };
      preparedEventsByTask.set(effectiveTaskId, preparedEvent);
      continue;
    }

    if (
      lowerLine.includes("execution finished") &&
      lowerLine.includes("result: success")
    ) {
      executionSuccessByTask.add(effectiveTaskId);
    }
  }

  const allPreparedEvents = Array.from(preparedEventsByTask.values());
  const correlated = allPreparedEvents.map((event) => {
    const sentByExecution = executionSuccessByTask.has(event.taskId);
    const sent = sentByExecution;
    const status: CorrelatedPreparedEvent["status"] = sent ? "sent" : "prepared";

    const evidence: string[] = [];
    if (sentByExecution) evidence.push("execution finished with result: SUCCESS");

    return {
      ...event,
      sent,
      status,
      evidence,
    };
  });

  return correlated;
}

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
        const nowMs = Date.now();
        const recentLogs = logs.filter(
          (log) => log.timestampMs && log.timestampMs >= nowMs - RECENT_WINDOW_MS
        );
        const preparedEvents = getPreparedEventsByTask();

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

        if (!recentLogs.length) {
          return {
            content: [
              {
                type: "text",
                text: `❌ No in-app event logs from the last 5 minutes were found.`,
              },
            ],
          };
        }

        const recentTaskIds = new Set<string>();
        for (const log of recentLogs) {
          const taskId = extractTaskId("", log.json as Record<string, unknown>);
          if (taskId) recentTaskIds.add(taskId);
        }

        const scopedPreparedEvents =
          recentTaskIds.size > 0
            ? preparedEvents.filter((event) => recentTaskIds.has(event.taskId))
            : preparedEvents;

        const eventPrepared = scopedPreparedEvents
          .filter((event) => event.eventName === eventName);
        const latestPreparedForEvent = eventPrepared[eventPrepared.length - 1];
        const latestSentForEvent = [...eventPrepared].reverse().find(
          (event) => event.sent
        );

        if (latestSentForEvent) {
          return {
            content: [
              {
                type: "text",
                text: `✅ Event "${eventName}" was successfully sent.\n\n${JSON.stringify(
                  {
                    task_id: latestSentForEvent.taskId,
                    status: latestSentForEvent.status,
                    evidence: latestSentForEvent.evidence,
                    payload_snapshot: latestSentForEvent.payload,
                  },
                  null,
                  2
                )}`,
              },
            ],
          };
        }

        if (latestPreparedForEvent) {
          return {
            content: [
              {
                type: "text",
                text: `❌ Event "${eventName}" was prepared but no send success marker was found for the same task.\n\n${JSON.stringify(
                  {
                    task_id: latestPreparedForEvent.taskId,
                    status: latestPreparedForEvent.status,
                    evidence: latestPreparedForEvent.evidence,
                    payload_snapshot: latestPreparedForEvent.payload,
                  },
                  null,
                  2
                )}`,
              },
            ],
          };
        }

        const latestLog = recentLogs[recentLogs.length - 1];
        return {
          content: [
            {
              type: "text",
              text: `❌ Event "${eventName}" was not found in recent INAPP preparing-data payloads.\n\nLatest INAPP log:\n${JSON.stringify(
                latestLog,
                null,
                2
              )}`,
            },
          ],
        };
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
