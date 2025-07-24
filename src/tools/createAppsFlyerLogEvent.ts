import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import path from "path";
import { glob } from "glob";
import { descriptions } from "../constants/descriptions.js";

export function createAppsFlyerLogEvent(server: McpServer): void {
  server.registerTool(
    "createAppsFlyerLogEvent",
    {
      title: "Create AppsFlyer Log Event",
      description: descriptions.createAppsFlyerLogEvent,
      inputSchema: {
        inputChoice: z.string().optional().describe("User input choice: '1' for JSON, '2' for manual input"),
        useJsonInput: z.boolean().optional().describe("Whether to use JSON input for event definitions"),

        // JSON input method fields
        inputMethod: z.enum(["search", "paste", "filepath"]).optional(),
        projectPath: z.string().optional(),
        filePath: z.string().optional(),
        pastedJson: z.string().optional(),
        selectedEventIdentifiers: z.array(z.string()).optional(),
        selectedFileIndex: z.number().optional(),
        includeAllEvents: z.boolean().optional(),

        // Manual input fields
        hasListener: z.boolean().optional().describe("Whether to use a response listener"),
        eventName: z.string().optional().describe("The name of the event to log"),
        eventParams: z.array(z.string()).optional().describe(
          "List of parameter names to send with the event (values will be added manually later)"
        ),
      },
    },
    async (args, _extra) => {
      // Helper to prompt the user with text
      const ask = (text: string) =>
        ({ content: [{ type: "text", text, _meta: {} }], _meta: {} }) as any;

      // Step 0: Ask user for input choice if not specified
      if (args.useJsonInput === undefined && args.inputChoice === undefined) {
        return ask(
          `📋 How would you like to provide the AppsFlyer event information?\n\n` +
            `1️⃣ Use a JSON input (search, paste, or file path)\n` +
            `2️⃣ Manually enter the event name and its parameters\n\n` +
            `Please reply with \`1\` or \`2\`.`
        );
      }

      // Map inputChoice to useJsonInput boolean
      if (args.useJsonInput === undefined && args.inputChoice !== undefined) {
        if (args.inputChoice === "1") {
          args.useJsonInput = true;
        } else if (args.inputChoice === "2") {
          args.useJsonInput = false;
        } else {
          return ask(
            "❗ Invalid choice. Please reply with `1` for JSON input or `2` for manual input."
          );
        }
      }

      // === JSON INPUT FLOW ===
      if (args.useJsonInput === true) {
        // Ask for JSON input method if not provided
        if (!args.inputMethod) {
          return ask(
            "Choose JSON input method:\n1️⃣ `search` to find JSON files in your project\n2️⃣ `paste` to paste JSON text\n3️⃣ `filepath` to provide full path to a JSON file"
          );
        }

        let jsonContent = "";

        // Handle 'search' method: find JSON files in project
        if (args.inputMethod === "search") {
          const basePath = args.projectPath || process.cwd();
          const pattern = path.join(basePath, "**/*.json");
          const files = await glob(pattern);

          if (files.length === 0) {
            return ask(`No JSON files found in '${basePath}'.`) as any;
          }

          if (args.selectedFileIndex === undefined) {
            const list = files
              .map((file, idx) => `${idx + 1}. ${path.relative(basePath, file)}`)
              .join("\n");
            return ask(
              `Found ${files.length} JSON files:\n${list}\n\nPlease reply with the number of the file you want to use.`
            ) as any;
          }

          const chosenIndex = args.selectedFileIndex - 1;
          if (chosenIndex < 0 || chosenIndex >= files.length) {
            return ask("Invalid file number. Please try again.") as any;
          }

          const chosenFile = files[chosenIndex];
          const content = await fs.promises.readFile(chosenFile, "utf8");
          jsonContent = content;

          // Parse JSON & validate structure
          let parsed;
          try {
            parsed = JSON.parse(jsonContent);
          } catch (e: any) {
            return ask(`Invalid JSON in file '${chosenFile}': ${e.message}`) as any;
          }

          if (Array.isArray(parsed)) parsed = { events: parsed };
          if (!parsed.events || !Array.isArray(parsed.events)) {
            return ask("JSON must contain an 'events' array.") as any;
          }

          const events = parsed.events;

          // Ask user to select events or include all
          if (args.includeAllEvents === undefined && !args.selectedEventIdentifiers) {
            const eventList = events
              .map(
                (e: any, idx: number) =>
                  `${idx + 1}. ${e.eventIdentifier || e.eventName || "event_unknown"}`
              )
              .join("\n");
            return ask(
              `Events in chosen file:\n${eventList}\n\n` +
                "Type `all` to include all events, or reply with comma-separated event identifiers to select specific events."
            ) as any;
          }

          // Filter selected events if needed
          let finalEvents = events;
          if (args.includeAllEvents === false && args.selectedEventIdentifiers) {
            finalEvents = events.filter((e: any) =>
              args.selectedEventIdentifiers!.includes(e.eventIdentifier)
            );
            if (finalEvents.length === 0) {
              return ask("No matching events found for the selected identifiers.") as any;
            }
          }

          // --- NEW: Ask if user wants to include listener for all events ---
          if (args.hasListener === undefined) {
            return ask(
              "❓ Would you like to include AppsFlyerRequestListener for all events? (true/false) "
            );
          }

          // Generate Java code for each event based on listener choice
          const generateCode = (event: any, withListener: boolean) => {
            const eventName = event.eventIdentifier || event.eventName || "event_unknown";
            const params = event.parameters || [];
            const paramLines = params.map((p: any) => {
              const key = p.parameterIdentifier || p.parameterName || "param_unknown";
              return `eventValues.put("${key}", <<PLACEHOLDER_VALUE>>);`;
            });

            if (withListener) {
              return [
                `// Event: ${eventName}`,
                `Map<String, Object> eventValues = new HashMap<>();`,
                ...paramLines,
                `AppsFlyerLib.getInstance().logEvent(`,
                `    getApplicationContext(), "${eventName}", eventValues,`,
                `    new AppsFlyerRequestListener() {`,
                `        @Override`,
                `        public void onSuccess() {`,
                `            // YOUR CODE UPON SUCCESS`,
                `        }`,
                `        @Override`,
                `        public void onError(int i, String s) {`,
                `            // YOUR CODE FOR ERROR HANDLING`,
                `        }`,
                `    }`,
                `);`,
                ``,
              ].join("\n");
            } else {
              return [
                `// Event: ${eventName}`,
                `Map<String, Object> eventValues = new HashMap<>();`,
                ...paramLines,
                `AppsFlyerLib.getInstance().logEvent(getApplicationContext(), "${eventName}", eventValues);`,
                ``,
              ].join("\n");
            }
          };

          const javaCode = finalEvents
            .map((event: any) => generateCode(event, args.hasListener!))
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: [
                  `✅ Java code generated for ${finalEvents.length} event(s):`,
                  "",
                  "```java",
                  javaCode,
                  "```",
                  "",
                  "Imports you need:",
                  "- import com.appsflyer.AppsFlyerLib;",
                  "- import java.util.Map;",
                  "- import java.util.HashMap;",
                  args.hasListener ? "- import com.appsflyer.attribution.AppsFlyerRequestListener;" : "",
                ]
                  .filter(Boolean)
                  .join("\n"),
                _meta: {},
              },
            ],
            _meta: {},
          } as any;
        }

        // === Handle paste or filepath input methods similarly ===

        if (args.inputMethod === "paste") {
          if (!args.pastedJson) {
            return ask("Please paste your AppsFlyer JSON.") as any;
          }
          jsonContent = args.pastedJson;
        }

        if (args.inputMethod === "filepath") {
          if (!args.filePath) {
            return ask("Please provide the full file path.") as any;
          }
          try {
            jsonContent = await fs.promises.readFile(args.filePath, "utf8");
          } catch {
            return ask(`Cannot read file at ${args.filePath}`) as any;
          }
        }

        try {
          let parsed = JSON.parse(jsonContent);
          if (Array.isArray(parsed)) parsed = { events: parsed };
          if (!parsed.events || !Array.isArray(parsed.events)) {
            return ask("JSON must contain an 'events' array.") as any;
          }

          const events = parsed.events;

          // Ask about listener for paste/filepath too
          if (args.hasListener === undefined) {
            return ask(
              "❓Would you like to include AppsFlyerRequestListener for all events? (true/false)"
            );
          }

          const generateCode = (event: any, withListener: boolean) => {
            const eventName = event.eventIdentifier || event.eventName || "event_unknown";
            const params = event.parameters || [];
            const paramLines = params.map((p: any) => {
              const key = p.parameterIdentifier || p.parameterName || "param_unknown";
              return `eventValues.put("${key}", <<PLACEHOLDER_VALUE>>);`;
            });

            if (withListener) {
              return [
                `// Event: ${eventName}`,
                `Map<String, Object> eventValues = new HashMap<>();`,
                ...paramLines,
                `AppsFlyerLib.getInstance().logEvent(`,
                `    getApplicationContext(), "${eventName}", eventValues,`,
                `    new AppsFlyerRequestListener() {`,
                `        @Override`,
                `        public void onSuccess() {`,
                `            // YOUR CODE UPON SUCCESS`,
                `        }`,
                `        @Override`,
                `        public void onError(int i, String s) {`,
                `            // YOUR CODE FOR ERROR HANDLING`,
                `        }`,
                `    }`,
                `);`,
                ``,
              ].join("\n");
            } else {
              return [
                `// Event: ${eventName}`,
                `Map<String, Object> eventValues = new HashMap<>();`,
                ...paramLines,
                `AppsFlyerLib.getInstance().logEvent(getApplicationContext(), "${eventName}", eventValues);`,
                ``,
              ].join("\n");
            }
          };

          const javaCode = events
            .map((event: any) => generateCode(event, args.hasListener!))
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: [
                  `✅ Java code generated for ${events.length} event(s):`,
                  "",
                  "```java",
                  javaCode,
                  "```",
                  "",
                  "Imports you need:",
                  "- import com.appsflyer.AppsFlyerLib;",
                  "- import java.util.Map;",
                  "- import java.util.HashMap;",
                  args.hasListener ? "- import com.appsflyer.attribution.AppsFlyerRequestListener;" : "",
                ]
                  .filter(Boolean)
                  .join("\n"),
                _meta: {},
              },
            ],
            _meta: {},
          } as any;
        } catch (e: any) {
          return ask(`Invalid JSON: ${e.message}`) as any;
        }
      }

      // === MANUAL INPUT FLOW ===
      if (args.useJsonInput === false) {
        const hasListener = args.hasListener;
        const eventName = args.eventName?.trim();
        const eventParams = args.eventParams;

        if (hasListener === undefined) {
          return ask(
            "❗ Please specify whether to use a response listener (true/false)."
          );
        }

        if (!eventName) {
          return ask("❗ Please enter the name of the event (eventName).");
        }

        if (!Array.isArray(eventParams) || eventParams.length === 0) {
          return ask(
            "❗ Please provide at least one parameter name for the event (eventParams)."
          );
        }

        const paramLines = eventParams
          .map((key) => `eventValues.put("${key}", <<ENTER VALUE>>);`)
          .join("\n");

        const code = hasListener
          ? `
import com.appsflyer.AppsFlyerLib;
import com.appsflyer.AFInAppEventType;
import com.appsflyer.AFInAppEventParameterName;
import com.appsflyer.attribution.AppsFlyerRequestListener;

Map<String, Object> eventValues = new HashMap<String, Object>();
${paramLines}
AppsFlyerLib.getInstance().logEvent(
    getApplicationContext(),"${eventName}", eventValues,
    new AppsFlyerRequestListener() {
        @Override
        public void onSuccess() {
            // YOUR CODE UPON SUCCESS
        }

        @Override
        public void onError(int i, String s) {
            // YOUR CODE FOR ERROR HANDLING
        }
    }
);
        `
          : `
import com.appsflyer.AppsFlyerLib;
import com.appsflyer.AFInAppEventType;
import com.appsflyer.AFInAppEventParameterName;

Map<String, Object> eventValues = new HashMap<String, Object>();
${paramLines}

AppsFlyerLib.getInstance().logEvent(
    getApplicationContext(),
    "${eventName}", eventValues
);
        `;

        return {
          content: [
            {
              type: "text",
              text: `Java code to log the event:\n\n\`\`\`java\n${code.trim()}\n\`\`\`\n\n📌 Please manually replace each <<ENTER VALUE>> in the generated code with the appropriate value.`,
            },
          ],
        };
      }

      return ask("Something went wrong. Please try again.") as any;
    }
  );
}

