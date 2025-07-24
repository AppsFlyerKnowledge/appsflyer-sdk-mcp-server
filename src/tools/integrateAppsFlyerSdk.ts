import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { descriptions } from "../constants/descriptions.js";
import { steps } from "../constants/steps.js";
import { z } from "zod";

export function integrateAppsFlyerSdk(server: McpServer): void {
  server.registerTool(
    "integrateAppsFlyerSdk",
    {
      title: "Integrate AppsFlyer SDK",
      description: descriptions.integrateAppsFlyerSdk,
      inputSchema: {
        useResponseListener: z
          .boolean()
          .optional()
          .describe("Whether to use a response listener when starting the SDK"),
      },
    },
    async (args, extra) => {
      const { useResponseListener } = args;
      const devKey = process.env.DEV_KEY;
      if (!devKey) {
        return {
          content: [
            {
              type: "text",
              text: `❌ DevKey environment variable (DEV_KEY) not set.`,
            },
          ],
        };
      }

      if (useResponseListener === undefined) {
        return {
          content: [
            {
              type: "text",
              text: "❌ 'useResponseListener' parameter is required.",
            },
          ],
        };
      }

      let latestVersion = null;
      try {
        const res = await fetch(
          `https://search.maven.org/solrsearch/select?q=g:com.appsflyer+AND+a:af-android-sdk&core=gav&rows=1&wt=json`
        );
        const json = (await res.json()) as any;
        latestVersion = json.response?.docs?.[0]?.v;
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to fetch latest SDK version: ${err.message}`,
            },
          ],
        };
      }

      if (!latestVersion) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Could not extract latest SDK version from response.`,
            },
          ],
        };
      }

      const rawSteps = useResponseListener
        ? steps.integrateAppsFlyerSdk.withResponseListener
        : steps.integrateAppsFlyerSdk.regular;

      const stepsWithReplacements = rawSteps.map((step) => {
        let updated = step.replace(/<YOUR-DEV-KEY>/g, devKey);
        if (updated.includes(`implementation 'com.appsflyer:af-android-sdk'`)) {
          updated = updated.replace(
            `implementation 'com.appsflyer:af-android-sdk'`,
            `implementation 'com.appsflyer:af-android-sdk:${latestVersion}'`
          );
        }
        return updated;
      });

      return {
        content: [
          {
            type: "text",
            text: stepsWithReplacements.join("\n\n"),
          },
        ],
      };
    }
  );
}
