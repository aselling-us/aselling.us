import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPendingReferences, markReferencesSent, run } from './send-reference-requests.mjs';

const WORKER_URL = 'https://worker.example.workers.dev';
const SYNC_SECRET = 'shh';
const TO = 'owner@example.com';

describe('fetchPendingReferences / markReferencesSent', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetchPendingReferences sends the bearer token and returns the pending array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pending: [{ id: 'r1', email: 'x@example.com' }] }),
    });
    global.fetch = fetchMock;

    const result = await fetchPendingReferences(WORKER_URL, SYNC_SECRET);

    expect(result).toEqual([{ id: 'r1', email: 'x@example.com' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${WORKER_URL}/pending-references`);
    expect(init.headers.Authorization).toBe(`Bearer ${SYNC_SECRET}`);
  });

  it('fetchPendingReferences throws on a non-OK response instead of silently returning nothing', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(fetchPendingReferences(WORKER_URL, SYNC_SECRET)).rejects.toThrow(/401/);
  });

  it('fetchPendingReferences tolerates a malformed body by returning an empty array', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    expect(await fetchPendingReferences(WORKER_URL, SYNC_SECRET)).toEqual([]);
  });

  it('markReferencesSent is a no-op for an empty id list (does not call the Worker)', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    await markReferencesSent(WORKER_URL, SYNC_SECRET, []);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('markReferencesSent posts the id list with auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;
    await markReferencesSent(WORKER_URL, SYNC_SECRET, ['r1', 'r2']);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${WORKER_URL}/mark-references-sent`);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe(`Bearer ${SYNC_SECRET}`);
    expect(JSON.parse(init.body)).toEqual({ ids: ['r1', 'r2'] });
  });

  it('markReferencesSent logs but does not throw when the Worker call fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(markReferencesSent(WORKER_URL, SYNC_SECRET, ['r1'])).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('run', () => {
  const originalFetch = global.fetch;
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('throws when WORKER_URL/SYNC_SECRET are missing, before touching the network', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    await expect(run({ workerUrl: undefined, syncSecret: undefined, to: TO })).rejects.toThrow(
      /WORKER_URL, SYNC_SECRET/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when there is no owner address to notify', async () => {
    await expect(run({ workerUrl: WORKER_URL, syncSecret: SYNC_SECRET, to: undefined })).rejects.toThrow(
      /MAIL_REPLY_TO or MAIL_FROM/
    );
  });

  it('does nothing and reports zero pending when the queue is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ pending: [] }) });
    const result = await run({ workerUrl: WORKER_URL, syncSecret: SYNC_SECRET, to: TO });
    expect(result).toEqual({ pendingCount: 0, sent: [], failed: [] });
  });

  it('dry-run reports counts without sending mail or calling the transporter', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pending: [{ id: 'r1', email: 'a@example.com' }] }),
    });
    const transporterFactory = vi.fn();

    const result = await run({
      dryRun: true,
      workerUrl: WORKER_URL,
      syncSecret: SYNC_SECRET,
      to: TO,
      transporterFactory,
    });

    expect(result).toEqual({ pendingCount: 1, sent: [], failed: [], dryRun: true });
    expect(transporterFactory).not.toHaveBeenCalled();
  });

  it('sends to the owner address with replyTo set to the requester, and only marks successes', async () => {
    const pending = [
      { id: 'ok-id', name: 'Good Person', email: 'good@example.com', message: 'hire me pls' },
      { id: 'bad-id', email: 'bad@example.com' },
    ];
    const fetchMock = vi.fn((input) => {
      const url = String(input);
      if (url.endsWith('/pending-references')) {
        return Promise.resolve({ ok: true, json: async () => ({ pending }) });
      }
      if (url.endsWith('/mark-references-sent')) {
        return Promise.resolve({ ok: true });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    global.fetch = fetchMock;

    const sendMail = vi.fn(async (mail) => {
      if (mail.replyTo === 'bad@example.com') throw new Error('SMTP said no');
      return { rejected: [] };
    });
    const transporterFactory = () => ({ verify: vi.fn(), sendMail });

    const result = await run({ workerUrl: WORKER_URL, syncSecret: SYNC_SECRET, to: TO, transporterFactory });

    expect(result.sent).toEqual(['ok-id']);
    expect(result.failed).toEqual([pending[1]]);

    const [mail] = sendMail.mock.calls[0];
    expect(mail.to).toBe(TO);
    expect(mail.replyTo).toBe('good@example.com');

    const markCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/mark-references-sent'));
    expect(JSON.parse(markCall[1].body)).toEqual({ ids: ['ok-id'] });
  });

  it('treats an SMTP-rejected send the same as a thrown send error', async () => {
    const pending = [{ id: 'r1', email: 'rejected@example.com' }];
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.endsWith('/pending-references')) return Promise.resolve({ ok: true, json: async () => ({ pending }) });
      return Promise.resolve({ ok: true });
    });
    const sendMail = vi.fn().mockResolvedValue({ rejected: ['owner@example.com'] });
    const transporterFactory = () => ({ verify: vi.fn(), sendMail });

    const result = await run({ workerUrl: WORKER_URL, syncSecret: SYNC_SECRET, to: TO, transporterFactory });

    expect(result.sent).toEqual([]);
    expect(result.failed).toEqual(pending);
  });
});
