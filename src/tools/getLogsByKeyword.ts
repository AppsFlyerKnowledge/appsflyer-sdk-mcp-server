// tools/getConversionLogs.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createLogTool } from "./logToolFactory.js";

export function getConversionLogs(server: McpServer): void {
  createLogTool(server, "getConversionLogs", "CONVERSION-");
}

export function getInAppLogs(server: McpServer): void {
  createLogTool(server, "getInAppLogs", "INAPP-");
}

export function getLaunchLogs(server: McpServer): void {
  createLogTool(server, "getLaunchLogs", "LAUNCH-");
}

export function getDeepLinkLogs(server: McpServer): void {
  createLogTool(server, "getDeepLinkLogs", '{"deepLink":');
}
