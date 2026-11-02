const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

// `date` is a free-form display string (single day, month-only, or a range —
// see the dev form's "Date (e.g. 2024)" placeholder), not a structured date.
// This pulls out a best-effort sortable timestamp, used both for the
// timeline's chronological sort and the future-events countdown.
// Falls back to the first year/month found anywhere in the string when the
// shape isn't one of the known ones.
export function parsePlaceDate(raw: string): number | null {
  const s = raw.trim();

  // "2024-present" / "2006-2024" / "2024" — a year or year range, use the start
  let m = s.match(/^(\d{4})(?:\s*-\s*(?:\d{4}|present))?$/i);
  if (m) return Date.UTC(Number(m[1]), 0, 1);

  // "29Aug - 1 Sept 2025" — day+month stuck together on one side, full date on the other
  m = s.match(/^(\d{1,2})\s*([A-Za-z]+)\s*-\s*\d{1,2}\s*[A-Za-z]+\s+(\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    return Date.UTC(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]));
  }

  // "15-18 August 2025" / "22-24 March 2026" — day range, single month
  m = s.match(/^(\d{1,2})\s*-\s*\d{1,2}\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    return Date.UTC(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]));
  }

  // "22 Sept 2022" / "18 Jan 2026" — single day
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?\s+(\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    return Date.UTC(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]));
  }

  // "Apr 2022" / "Sept 2023" — month + year, no day
  m = s.match(/^([A-Za-z]+)\.?\s+(\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()] !== undefined) {
    return Date.UTC(Number(m[2]), MONTHS[m[1].toLowerCase()], 1);
  }

  // fallback: pull the first year (and month name, if any) found anywhere
  const year = s.match(/\d{4}/)?.[0];
  if (!year) return null;
  const month = s.match(/[A-Za-z]+/)?.[0];
  return Date.UTC(Number(year), month ? (MONTHS[month.toLowerCase()] ?? 0) : 0, 1);
}

// `parsePlaceDate` anchors to 00:00 UTC of the day; events actually count down
// to 7pm on the viewer's clock (see `countdownTarget` in travels.astro's client
// script), which can be up to ~a day past that UTC anchor depending on the
// viewer's zone. Keep an event "future" across that window so the final hours
// still render, instead of the server dropping it early (the client is already
// the authority on whether it's still future).
export const EVENT_COUNTDOWN_GRACE_MS = 36 * 3600000;
