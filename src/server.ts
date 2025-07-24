#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { integrateAppsFlyerSdk } from "./tools/integrateAppsFlyerSdk.js";
import { verifyAppsFlyerSdk } from "./tools/verifyAppsFlyerSdk.js";
import { fetchAppsflyerLogs } from "./tools/fetchAppsFlyerLogs.js";
import { getConversionLogs } from "./tools/getLogsByKeyword.js";
import { getInAppLogs } from "./tools/getLogsByKeyword.js";
import { getLaunchLogs } from "./tools/getLogsByKeyword.js";
import { getDeepLinkLogs } from "./tools/getLogsByKeyword.js";
import { getAppsflyerErrors } from "./tools/getAppsFlyerErrors.js";
import { createAppsFlyerLogEvent } from "./tools/createAppsFlyerLogEvent.js";
import { verifyInAppEvent } from "./tools/verifyInAppEvent.js";
import { createDeepLink } from "./tools/createDeepLink.js";
import { verifyDeepLink } from "./tools/verifyDeepLink.js";

const server = new McpServer({
  name: "appsflyer-logcat-mcp-server",
  version: "1.0.0",
});

// Register all tools
integrateAppsFlyerSdk(server);
verifyAppsFlyerSdk(server);
fetchAppsflyerLogs(server);
getConversionLogs(server);
getInAppLogs(server);
getLaunchLogs(server);
getDeepLinkLogs(server);
getAppsflyerErrors(server);
createAppsFlyerLogEvent(server);
verifyInAppEvent(server);
createDeepLink(server);
verifyDeepLink(server);


async function startServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP server running with stdio transport...");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
