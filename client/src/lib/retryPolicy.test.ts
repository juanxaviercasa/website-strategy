import { describe, expect, it } from "vitest";
import { CONNECTOR_RETRY_WINDOW_MS, nextConnectorRetryAt } from "./retryPolicy";

describe("nextConnectorRetryAt", () => {
  it("schedules a retry fifteen minutes after a recent connector activity", () => {
    const lastActivity = new Date("2026-08-18T00:00:00.000Z");
    const now = new Date("2026-08-18T00:05:00.000Z");
    expect(nextConnectorRetryAt(lastActivity, now).getTime()).toBe(lastActivity.getTime() + CONNECTOR_RETRY_WINDOW_MS);
  });

  it("permits an immediate retry when no connector activity is available", () => {
    const now = new Date("2026-08-18T00:05:00.000Z");
    expect(nextConnectorRetryAt(undefined, now)).toEqual(now);
  });
});
