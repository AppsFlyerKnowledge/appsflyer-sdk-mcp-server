import { logBuffer, startLogcatStream } from "./stream.js";

export interface ParsedLog {
  timestamp: string;
  timestampMs?: number;
  type: string;
  json: Record<string, any>;
}

function parseLogcatTimestamp(line: string): { text: string; ms?: number } {
  const fullMatch = line.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})/
  );
  if (fullMatch) {
    const [, y, mo, d, h, mi, s, ms] = fullMatch;
    const date = new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
      Number(ms)
    );
    return { text: fullMatch[0], ms: date.getTime() };
  }

  const shortMatch = line.match(
    /^(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})/
  );
  if (shortMatch) {
    const now = new Date();
    const [, mo, d, h, mi, s, ms] = shortMatch;
    let year = now.getFullYear();
    let date = new Date(
      year,
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
      Number(ms)
    );
    if (date.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
      year -= 1;
      date = new Date(
        year,
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        Number(s),
        Number(ms)
      );
    }
    return { text: shortMatch[0], ms: date.getTime() };
  }

  return { text: line.substring(0, 18) };
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
      if (!json) return null;
      const timestamp = parseLogcatTimestamp(line);
      return {
        timestamp: timestamp.text,
        timestampMs: timestamp.ms,
        type: keyword || "ALL",
        json,
      };
    })
    .filter(Boolean) as ParsedLog[];
}
