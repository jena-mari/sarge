/**
 * Integration test for nashWelfareMultiSourceClient.js — this starts the
 * REAL Python service as a subprocess and makes REAL HTTP calls against
 * it, rather than mocking fetch. A mocked test would only prove the
 * client serializes JSON correctly; it would never have caught anything
 * about whether the service itself works. Given the whole point of this
 * client existing is "the JS-only alternatives were verified broken,
 * call the verified-correct Python engine instead," the test that
 * matters is the one that actually exercises that engine over the wire.
 *
 * Requires Python 3 with backend/src/nash_welfare_service/requirements.txt
 * installed. If uvicorn/fastapi/cvxpy aren't available, or python3/uvicorn
 * aren't on PATH, this suite reports itself skipped with a clear message
 * rather than failing — a missing Python environment is an environment
 * problem, not a code defect, and shouldn't block `npm run test:algorithms`
 * (which doesn't even include this file) or a CI job that only runs the JS
 * suite.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { allocateNashWelfareMultiSource } from '../../src/clients/nashWelfareMultiSourceClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_DIR = path.resolve(__dirname, '../../src/nash_welfare_service');
const PORT = 8123; // distinct from the documented default (8001) so this never collides with a dev instance
const BASE_URL = `http://127.0.0.1:${PORT}`;

let serverProcess = null;
let serviceAvailable = false;

async function waitForHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

before(async () => {
  serverProcess = spawn(
    'python3',
    ['-m', 'uvicorn', 'app:app', '--port', String(PORT), '--host', '127.0.0.1'],
    { cwd: SERVICE_DIR, stdio: 'pipe' }
  );

  let startupError = '';
  serverProcess.stderr?.on('data', (chunk) => {
    startupError += chunk.toString();
  });

  serviceAvailable = await waitForHealth();

  if (!serviceAvailable) {
    console.warn(
      '[nashWelfareMultiSourceClient.test.js] Could not start the Python service ' +
        `(python3 -m uvicorn in ${SERVICE_DIR}) within 15s — skipping this suite. ` +
        'This means either python3/uvicorn are not on PATH, or ' +
        'requirements.txt is not installed (pip install -r ' +
        'backend/src/nash_welfare_service/requirements.txt). Not a code failure.\n' +
        (startupError ? `Captured stderr:\n${startupError}` : '')
    );
  }
});

after(() => {
  serverProcess?.kill('SIGTERM');
});

describe('allocateNashWelfareMultiSource — real service, real HTTP', () => {
  test('the documented hospital scenario matches the Python engine directly', async (t) => {
    if (!serviceAvailable) return t.skip('Python service unavailable — see setup warning above');

    const sources = [{ id: 'battery_1', capacityKwh: 10.0 }];
    const households = [
      { id: 'hospital_1', weight: 1.0, demandCapKwh: 8.0, eligibleSourceIds: ['battery_1'] },
      { id: 'h1', weight: 0.5, demandCapKwh: 6.0, eligibleSourceIds: ['battery_1'] },
      { id: 'h2', weight: 0.105, demandCapKwh: 6.0, eligibleSourceIds: ['battery_1'] },
    ];

    const result = await allocateNashWelfareMultiSource(sources, households, { baseUrl: BASE_URL });

    // Values independently computed from the engine directly (see
    // backend/tests/nash_welfare_service/test_app.py) — this test
    // confirms the JS client reproduces them exactly over HTTP.
    assert.ok(Math.abs(result.householdTotalKwh.hospital_1 - 6.230572) < 1e-3);
    assert.ok(Math.abs(result.householdTotalKwh.h1 - 3.115199) < 1e-3);
    assert.ok(Math.abs(result.householdTotalKwh.h2 - 0.654229) < 1e-3);
    assert.equal(result.solverStatus, 'optimal');
    assert.equal(result.algorithm, 'nash_welfare_multi_source_remote');
  });

  test('eligibility is respected across a real HTTP round trip', async (t) => {
    if (!serviceAvailable) return t.skip('Python service unavailable — see setup warning above');

    const sources = [{ id: 's1', capacityKwh: 5.0 }, { id: 's2', capacityKwh: 5.0 }];
    const households = [
      { id: 'a', weight: 1.0, demandCapKwh: 100.0, eligibleSourceIds: ['s1', 's2'] },
      { id: 'b', weight: 1.0, demandCapKwh: 100.0, eligibleSourceIds: new Set(['s2']) }, // Set, not array — client must handle both
    ];

    const result = await allocateNashWelfareMultiSource(sources, households, { baseUrl: BASE_URL });

    assert.ok(!('s1' in (result.allocationKwh.b ?? {})), 'b is not eligible for s1 and must never receive from it');
    assert.ok(result.sourceUsedKwh.s1 <= 5.0 + 1e-6);
    assert.ok(result.sourceUsedKwh.s2 <= 5.0 + 1e-6);
  });

  test('the tied-source-price regression case conserves energy over a real HTTP round trip', async (t) => {
    if (!serviceAvailable) return t.skip('Python service unavailable — see setup warning above');

    // Same case documented in engine.py's module docstring: the true
    // optimum requires two sources at an identical price, which broke
    // both hand-rolled JS solver attempts before this service replaced them.
    const sources = [
      { id: 's0', capacityKwh: 3.3875216727655943 },
      { id: 's1', capacityKwh: 19.675041602542535 },
    ];
    const households = [
      { id: 'h0', weight: 0.32846811344392046, demandCapKwh: 8.667975406896538, eligibleSourceIds: ['s0', 's1'] },
      { id: 'h1', weight: 0.05392219625366556, demandCapKwh: 14.01452582650843, eligibleSourceIds: ['s0', 's1'] },
      { id: 'h2', weight: 1.5632139402814724, demandCapKwh: 13.117839059117767, eligibleSourceIds: ['s0', 's1'] },
      { id: 'h3', weight: 1.6526635570383617, demandCapKwh: 1.7098528796737815, eligibleSourceIds: ['s0', 's1'] },
    ];

    const result = await allocateNashWelfareMultiSource(sources, households, { baseUrl: BASE_URL });

    const totalDelivered = Object.values(result.householdTotalKwh).reduce((a, b) => a + b, 0);
    const totalCapacity = sources.reduce((a, s) => a + s.capacityKwh, 0);
    assert.ok(totalDelivered <= totalCapacity + 1e-3, `delivered ${totalDelivered} exceeds real capacity ${totalCapacity}`);
  });

  test('a household with no eligible source among the request sources produces a clear error, not a crash', async (t) => {
    if (!serviceAvailable) return t.skip('Python service unavailable — see setup warning above');

    const sources = [{ id: 's1', capacityKwh: 10.0 }];
    const households = [{ id: 'a', weight: 1.0, demandCapKwh: 5.0, eligibleSourceIds: ['does-not-exist'] }];

    await assert.rejects(
      () => allocateNashWelfareMultiSource(sources, households, { baseUrl: BASE_URL }),
      /400|no eligible source/i
    );
  });

  test('an unreachable service produces a clear, actionable error rather than an opaque fetch failure', async () => {
    const sources = [{ id: 's1', capacityKwh: 10.0 }];
    const households = [{ id: 'a', weight: 1.0, demandCapKwh: 5.0, eligibleSourceIds: ['s1'] }];

    await assert.rejects(
      () => allocateNashWelfareMultiSource(sources, households, { baseUrl: 'http://127.0.0.1:1' }),
      /Could not reach the Nash welfare multi-source service/
    );
  });
});
