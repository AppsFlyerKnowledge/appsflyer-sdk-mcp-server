export const descriptions = {
  integrateAppsFlyerSdk: `
  Full AppsFlyer Android SDK integration instructions and code. DO NOT summarize, explain, or rewrite. Always return the exact steps and code blocks as provided.
  
  When the user asks how to integrate the AppsFlyer SDK into their Android app — in any way — IMMEDIATELY call this tool. This includes phrases like: "how to integrate appsflyer", "integrate appsflyer sdk", "add appsflyer", "install appsflyer sdk", "apps flyer android", "how to add sdk", "apps flyer setup", "sdk integration", "apps flyer guide", "step by step appsflyer", or "setup appsflyer sdk".
  
  Before generating any output, you MUST ask the user if they need to use a response listener. Based on their answer, select the appropriate steps variant (with or without response listener).
  
  Once integration is complete, suggest running the verifyAppsFlyerSdk tool to validate the setup and confirm the SDK is working properly.
  
  IMPORTANT: Before suggesting verifyAppsFlyerSdk, ensure the user launches the app on a device at least once to trigger the SDK and generate logs. Do NOT suggest verification unless the app has already been launched.
  `,
  fetchAppsflyerLogs: `
Fetches recent logcat logs related to AppsFlyer. Use this to locate appId and uid (device ID) if they're not known. Use this tool for any request to get, show, retrieve, or fetch AppsFlyer logs, logcat output, or raw logs.

This includes keyword triggers like: "logs", "appsflyer", "logcat", "fetch", "get", "show", "raw logs", or "recent logs".

If the user asks to fetch, show, retrieve, or get recent logs related to AppsFlyer or logcat — immediately use this tool. Do not try to explain or generate log output yourself.
`,
getConversionLogs: `
Extracts conversion logs from logcat. Useful for verifying successful install/conversion events via AppsFlyer.

When the user asks about conversion logs, installs, or verifying conversion events via AppsFlyer — call this tool directly. This includes keywords like: "conversion", "install logs", "conversion events", or "appsflyer install".

Do not ask for a device ID unless there are multiple devices connected.
Do not attempt to generate logs or summaries manually.
`,
getInAppLogs: `
Returns in-app event logs captured by AppsFlyer. Use this to confirm event tracking works correctly.

If the user asks about in-app events, event tracking, or whether AppsFlyer is tracking events — use this tool without modification. This includes triggers like: "inapp", "event tracking", "in-app logs", or "appsflyer events".

Do not ask for a device ID unless there are multiple devices connected.
Do not try to simulate event logs.
`,
getLaunchLogs: `
Parses app launch events from logcat. Helpful when debugging first opens or session tracking via AppsFlyer.

If the user mentions app launches, sessions, or first opens related to AppsFlyer — call this tool directly. Relevant keywords include: "launch", "app open", "first open", or "session start".

Do not ask for a device ID unless there are multiple devices connected.
Do not attempt to guess or simulate log entries.
`,
getDeepLinkLogs: `
Extracts deep link-related logs from logcat. Use to verify if deep links are being detected and handled by the SDK.

If the user refers to deep links, universal links, URI schemes, or deferred deep linking via AppsFlyer — use this tool immediately. Trigger keywords include: "deeplink", "deep link", "uri scheme", or "appsflyer link".

Do not ask for a device ID unless there are multiple devices connected.
Do not explain or simulate deep link logic.
`,

getAppsflyerErrors: `
Scans logcat for common AppsFlyer errors (e.g., exceptions, failures). Use this tool to detect SDK-related issues.

When the user mentions errors, failures, exceptions, or issues with the AppsFlyer SDK — call this tool immediately. Keywords that may trigger this include: "FAILURE", "ERROR", "Exception", or "No deep link".

Do not ask for a device ID unless there are multiple devices connected.
Do not analyze logs or try to guess the error yourself.
`,
verifyAppsFlyerSdk: `
Tests whether the AppsFlyer SDK is integrated correctly by querying install data using appId, devKey, and device ID (uid). appId and uid are automatically extracted from recent logs. devKey is taken from the environment in mcp.json, and if not found, the user will be prompted to provide it.

If the user wants to test if the AppsFlyer SDK is working, validate the setup, or check install attribution — always use this tool directly. This includes triggers like "test sdk", "validate appsflyer", "check integration", or "is appsflyer working".

Never explain or simulate test output. This tool extracts appId and uid automatically from recent logcat logs (via fetchAppsflyerLogs).
`,

createAppsFlyerLogEvent: `
Generate Java code to log AppsFlyer in-app events. You will first be asked whether you want to use JSON input (via file search, paste, or file path), or to manually specify the event name and parameters. Then, you will be guided step-by-step.

This tool handles requests related to: asking the user if they want to use JSON or manual input before starting, generating Java code for logging AppsFlyer in-app events, creating AppsFlyer event logging code from JSON definitions or manual input, providing AppsFlyer event JSON input via search, file path, or paste methods, and generating AppsFlyer event code with or without a response listener.

Keyword triggers include: "apps flyer event", "generate java code from json", "apps flyer json", "search json files", and "create appsflyer log event".
`,

verifyInAppEvent: `
Do not ask for a device ID unless there are multiple devices connected.

Scans recent AppsFlyer logs to verify that a specific in-app event was successfully triggered by the SDK. The tool filters only in-app logs (with keyword 'INAPP-'), waits up to 2 seconds for logs to arrive, and extracts the most recent one. It then checks if the specified event name appears in the eventName field or log line. If found — it confirms the event was sent. If not — it reports failure.

This is the only correct method to validate in-app events based on real logs. Do not simulate or infer. Always use this tool to confirm whether an event actually fired.

Use this tool whenever the user wants to verify whether a specific in-app event (e.g., af_purchase, af_level_achieved) was triggered and logged by the AppsFlyer SDK on a real device by checking recent log entries from the SDK output. This includes keywords and intents like "af_level_achieved", "check if af_level_achieved was logged", "was af_level_achieved triggered", "test in-app event", "apps flyer in-app event", "af_level_achieved validation", "verify appsflyer event", "apps flyer log test event", "event af_level_achieved", and "check af_level_achieved".
`,

createDeepLink: `
Use this tool to set up AppsFlyer OneLink Deep Linking (Direct or Deferred) in your Android app.

Guide the user through setting up AppsFlyer OneLink Deep Linking for Android by prompting for:
- Their OneLink URL (tell them to get it from marketing if unknown).
- Whether they want to include a custom uriScheme.
- Whether they are implementing Direct or Deferred Deep Linking.

If Direct Deep Link:
- Instruct to integrate the AppsFlyer SDK if not already done.
- Add an intent-filter for the OneLink domain in AndroidManifest.xml.
- Optionally add a second intent-filter for a custom uriScheme.
- Generate a SHA256 signature using the keystore (debug or production).
- Provide exact keytool command and example output.
- Send the SHA256 to marketing for OneLink template configuration.
- Import required libraries and subscribe to AppsFlyer DeepLinkListener with full Java code example.
- Launch the app on a device or emulator.
- Run the tool **verifyDeepLink** to validate behavior.

If Deferred Deep Link:
- Provide full Java code for the DeepLinkListener only.
- Instruct user to implement handling for both direct and deferred deep links inside the callback.
- Launch the app and verify behavior with **verifyDeepLink**.

⚠️ Every step must be followed exactly. Skipping or modifying any line may cause deep linking to fail.

This tool is triggered by intents and keywords such as: "deep linking", "deep link", "deeplink", "deep-link", "app deep link", "android deep link", "deep link verification", "appsflyer onelink", "app links", "uriScheme", "intent-filter".
`,

verifyDeepLink: `
Do not ask for a device ID unless there are multiple devices connected.

Scans recent AppsFlyer logs to verify that a specific deep link URL was successfully received and handled by the SDK. The tool filters logs containing the keyword 'deepLink', waits up to 2 seconds for logs to appear, and checks the latest deep link log entry.

If the given URL appears in the log (either in the line text or parsed JSON), it confirms the deep link was handled correctly. Otherwise, it reports no matching deep link found.

This is the only correct way to validate real-time deep link handling using actual logs. Do not simulate or guess. Always use this tool to confirm whether a deep link was received by the SDK.

Use this tool whenever the user wants to verify deep link handling, triggered by keywords or intents like: "deeplink", "verify", "appsFlyer", "flow", or "handled".
`
};


    