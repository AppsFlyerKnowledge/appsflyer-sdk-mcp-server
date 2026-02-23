import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type GuardResult = {
  ok: boolean;
  message?: string;
};

const VALIDATION_DEVICE_ID = "0";

let oneTimeResult: GuardResult | null = null;
let inFlight: Promise<GuardResult> | null = null;

function missingCredentialsResult(devKey?: string, appId?: string): GuardResult {
  const missing: string[] = [];
  if (!devKey) missing.push("DEV_KEY");
  if (!appId) missing.push("APP_ID");

  return {
    ok: false,
    message:
      `❌ Missing required value(s): ${missing.join(", ")}.\n` +
      `Please add APP_ID and DEV_KEY in your mcp.json env.\n` +
      `Until these are provided and validated, tools are blocked.`,
  };
}

function checkAndroidBundle(appID: string): boolean {
  return (
    /^([A-Za-z]{1}[A-Za-z\d_]*\.)+[A-Za-z][A-Za-z\d_]*$/.test(appID) ||
    /^([A-Za-z]{1}[A-Za-z\d_]*\.)+[A-Za-z][A-Za-z\d_]*-[A-Za-z][A-Za-z\d_]*$/.test(
      appID
    )
  );
}

function parseJsonSafe(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function validateAgainstAppsFlyer(
  appId: string,
  devKey: string
): Promise<GuardResult> {
  if (!appId || !devKey) {
    return {
      ok: false,
      message:
        `❌ Missing parameters for AppsFlyer check.\n` +
        `APP_ID: ${appId ? "provided" : "missing"}\n` +
        `DEV_KEY: ${devKey ? "provided" : "missing"}`,
    };
  }

  const encodedAppId = encodeURIComponent(appId);
  const encodedDevKey = encodeURIComponent(devKey);
  const encodedDeviceId = encodeURIComponent(VALIDATION_DEVICE_ID);
  const url =
    `https://gcdsdk.appsflyer.com/install_data/v4.0/${encodedAppId}` +
    `?devkey=${encodedDevKey}&device_id=${encodedDeviceId}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
    });

    const rawBody = await response.text();
    const parsedBody = parseJsonSafe(rawBody);

    if (response.status === 200) {
      return { ok: true };
    }

    // In this project flow we validate with device_id="0".
    // AppsFlyer can return 404 ("no attribution data") even when credentials are valid.
    if (response.status === 404) {
      return { ok: true };
    }

    if (response.status === 403) {
      return {
        ok: false,
        message:
          `❌ Tool blocked: AppsFlyer credential precheck failed.\n` +
          `status_code: 403\n` +
          `error_reason: Forbidden\n` +
          `Please verify APP_ID and DEV_KEY in mcp.json before using tools.`,
      };
    }

    const compactBody = String(
      typeof parsedBody === "string" ? parsedBody : JSON.stringify(parsedBody)
    )
      .replace(/\s+/g, " ")
      .slice(0, 300);
    return {
      ok: false,
      message:
        `❌ Tool blocked: AppsFlyer credential precheck failed.\n` +
        `Reason: APP_ID + DEV_KEY did not pass validation with AppsFlyer.\n` +
        `HTTP ${response.status} ${response.statusText}\n` +
        `${compactBody ? `Response: ${compactBody}\n` : ""}` +
        `Please verify APP_ID and DEV_KEY in mcp.json before using tools.`,
    };
  } catch (error: any) {
    return {
      ok: false,
      message:
        `❌ Tool blocked: could not run AppsFlyer credential precheck.\n` +
        `Error: ${error?.message || error}\n` +
        `Please verify network access and credentials in mcp.json.`,
    };
  }
}

export async function assertAppsFlyerCredentials(): Promise<GuardResult> {
  if (oneTimeResult) {
    return oneTimeResult;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const devKey = process.env.DEV_KEY?.trim();
    const appId = process.env.APP_ID?.trim();

    if (!devKey || !appId) {
      const result = missingCredentialsResult(devKey, appId);
      oneTimeResult = result;
      return result;
    }

    if (!checkAndroidBundle(appId)) {
      const result = {
        ok: false,
        message:
          `❌ APP_ID is not a valid Android application ID format.\n` +
          `Please provide a valid APP_ID (for example: com.example.app) in mcp.json.`,
      };
      oneTimeResult = result;
      return result;
    }

    const result = await validateAgainstAppsFlyer(appId, devKey);
    oneTimeResult = result;
    return result;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function installAppsFlyerCredentialGuard(server: McpServer): void {
  const originalRegisterTool = server.registerTool.bind(server) as any;

  (server as any).registerTool = (name: string, config: any, handler: any) => {
    const wrappedHandler = async (args: any, extra: any) => {
      const validation = await assertAppsFlyerCredentials();
      if (!validation.ok) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                (validation.message ?? "❌ AppsFlyer credential validation failed.") +
                `\nStop and fix APP_ID/DEV_KEY before calling any other AppsFlyer tools.`,
            },
          ],
        };
      }

      return handler(args, extra);
    };

    return originalRegisterTool(name, config, wrappedHandler);
  };
}
