type DeepLinkExpectedData = {
  oneLinkUrl: string;
  payload: Record<string, unknown>;
  updatedAtMs: number;
};

let latestDeepLinkExpectedData: DeepLinkExpectedData | null = null;

export function setLatestDeepLinkExpectedData(
  oneLinkUrl: string,
  payload: Record<string, unknown>
): void {
  latestDeepLinkExpectedData = {
    oneLinkUrl,
    payload,
    updatedAtMs: Date.now(),
  };
}

export function getLatestDeepLinkExpectedData(): DeepLinkExpectedData | null {
  return latestDeepLinkExpectedData;
}
