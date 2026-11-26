import assert from "node:assert/strict";
import { test } from "node:test";
import { readCloudConfig } from "../src/cloud-config.ts";
import {
  formatElapsed,
  sampleTelemetry,
  telemetryLimits,
} from "../src/telemetry.ts";

const validEnv = {
  FIREBASE_API_KEY: `AIza${"A".repeat(35)}`,
  FIREBASE_AUTH_DOMAIN: "demo-motornews.firebaseapp.com",
  FIREBASE_PROJECT_ID: "demo-motornews",
  FIREBASE_APP_ID: "1:123:web:abcdef",
};

test("all-empty cloud settings enable simulator-only mode", () => {
  assert.equal(readCloudConfig({}), null);
  assert.equal(readCloudConfig({ FIREBASE_API_KEY: " " }), null);
});

test("a complete public cloud configuration is normalized", () => {
  assert.deepEqual(
    readCloudConfig({
      ...validEnv,
      FIREBASE_AUTH_DOMAIN: " demo-motornews.firebaseapp.com ",
    }),
    {
      apiKey: validEnv.FIREBASE_API_KEY,
      authDomain: validEnv.FIREBASE_AUTH_DOMAIN,
      projectId: validEnv.FIREBASE_PROJECT_ID,
      appId: validEnv.FIREBASE_APP_ID,
    },
  );
});

for (const field of Object.keys(validEnv)) {
  test(`a missing ${field} fails before deployment`, () => {
    assert.throws(
      () => readCloudConfig({ ...validEnv, [field]: "" }),
      /Defina todos os campos/,
    );
  });

  test(`a malformed ${field} is rejected without leaking its value`, () => {
    assert.throws(
      () =>
        readCloudConfig({ ...validEnv, [field]: "malformed private operand" }),
      (error: unknown) =>
        error instanceof Error &&
        error.message.startsWith(field) &&
        !error.message.includes("operand"),
    );
  });
}

test("simulated ranges include the design minimum and maximum", () => {
  assert.deepEqual(
    sampleTelemetry(() => 0),
    { rpm: 1000, oilC: 80 },
  );
  assert.deepEqual(
    sampleTelemetry(() => 0.99999),
    { rpm: 9000, oilC: 110 },
  );
  const sample = sampleTelemetry();
  assert.ok(
    sample.rpm >= telemetryLimits.rpm.min &&
      sample.rpm <= telemetryLimits.rpm.max,
  );
  assert.ok(
    sample.oilC >= telemetryLimits.oilC.min &&
      sample.oilC <= telemetryLimits.oilC.max,
  );
});

test("elapsed time pads seconds and does not wrap at one hour", () => {
  assert.equal(formatElapsed(0), "00:00");
  assert.equal(formatElapsed(65), "01:05");
  assert.equal(formatElapsed(3661), "61:01");
});
