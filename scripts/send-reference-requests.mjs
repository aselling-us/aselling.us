import { maskEmail, createTransporter, buildReferenceRequestMailOptions, ownerEmail } from './lib/mail-theme.mjs';

export async function fetchPendingReferences(workerUrl, syncSecret) {
  const res = await fetch(new URL('/pending-references', workerUrl), {
    headers: { Authorization: `Bearer ${syncSecret}` },
  });
  if (!res.ok) throw new Error(`Worker /pending-references returned ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.pending) ? data.pending : [];
}

export async function markReferencesSent(workerUrl, syncSecret, ids) {
  if (ids.length === 0) return;
  const res = await fetch(new URL('/mark-references-sent', workerUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${syncSecret}` },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    console.error(`Worker /mark-references-sent returned ${res.status}; these entries may be re-emailed next run.`);
  }
}

// Core send loop, independent of process.argv/process.exit so it can be
// exercised in tests. Returns a summary instead of exiting — the CLI
// entrypoint below decides what that means for the process exit code.
export async function run({
  dryRun = process.argv.slice(2).includes('--dry-run'),
  workerUrl = process.env.WORKER_URL,
  syncSecret = process.env.SYNC_SECRET,
  from = process.env.MAIL_FROM,
  to = ownerEmail(),
  transporterFactory = createTransporter,
} = {}) {
  if (!workerUrl || !syncSecret) {
    throw new Error('Missing required env var(s): WORKER_URL, SYNC_SECRET');
  }
  if (!to) {
    throw new Error('Missing required env var(s): MAIL_REPLY_TO or MAIL_FROM (used as the notification recipient)');
  }

  const pending = await fetchPendingReferences(workerUrl, syncSecret);

  if (pending.length === 0) {
    console.log('No pending reference requests to send.');
    return { pendingCount: 0, sent: [], failed: [] };
  }

  console.log(
    `Found ${pending.length} pending reference request(s): ${pending.map((p) => maskEmail(p.email)).join(', ')}`
  );

  if (dryRun) {
    console.log(`Dry run: would notify ${to} of ${pending.length} reference request(s).`);
    return { pendingCount: pending.length, sent: [], failed: [], dryRun: true };
  }

  const transporter = transporterFactory();
  await transporter.verify();

  const sentIds = [];
  const failed = [];

  for (const entry of pending) {
    try {
      const info = await transporter.sendMail(
        buildReferenceRequestMailOptions({ name: entry.name, email: entry.email, message: entry.message, to, from })
      );
      const rejected = info.rejected?.filter(Boolean) ?? [];
      if (rejected.length > 0) {
        failed.push(entry);
        console.error(`SMTP server rejected the notification for ${maskEmail(entry.email)}.`);
        continue;
      }
      console.log(`Notified ${to} about a reference request from ${maskEmail(entry.email)}.`);
      sentIds.push(entry.id);
    } catch (err) {
      failed.push(entry);
      console.error(`Failed to send notification for ${maskEmail(entry.email)}: ${err.message}`);
    }
  }

  await markReferencesSent(workerUrl, syncSecret, sentIds);

  return { pendingCount: pending.length, sent: sentIds, failed };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  try {
    const result = await run();
    if (result.failed.length > 0) {
      console.error('One or more reference-request notifications failed to send; unsent entries will be retried next run.');
      process.exit(1);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
