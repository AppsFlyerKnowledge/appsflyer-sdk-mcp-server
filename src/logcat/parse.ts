import { logBuffer, startLogcatStream } from "./stream.js";

export interface ParsedLog {
  timestamp: string;
  type: string;
  json: Record<string, any>;
}

export function extractJsonFromLine(line: string): Record<string, any> | null {
  if (!line) return null;
  const match = line.match(/{.*}/s);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export function getParsedAppsflyerFilters(keyword?: string): ParsedLog[] {
  const lines = logBuffer.filter(
    (line) =>
      line.includes("AppsFlyer") && (keyword ? line.includes(keyword) : true)
  );

  const recent = lines.slice(-700);

  return recent
    .map((line) => {
      const json = extractJsonFromLine(line);
      return json
        ? {
            timestamp: line.substring(0, 18),
            type: keyword || "ALL",
            json,
          }
        : null;
    })
    .filter(Boolean) as ParsedLog[];
}
