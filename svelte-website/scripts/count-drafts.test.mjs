import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { countDrafts, writeDraftCount } from './count-drafts.mjs';

describe('countDrafts / writeDraftCount', () => {
  let tmp, draftsDir, outFile;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'count-drafts-'));
    draftsDir = path.join(tmp, 'drafts');
    outFile = path.join(tmp, 'drafts.json');
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const read = () => JSON.parse(fs.readFileSync(outFile, 'utf8'));

  it('counts only .md files (a draft\'s images do not count)', () => {
    fs.mkdirSync(draftsDir);
    fs.writeFileSync(path.join(draftsDir, 'a.md'), '');
    fs.writeFileSync(path.join(draftsDir, 'b.md'), '');
    fs.writeFileSync(path.join(draftsDir, 'a-cover.jpg'), '');
    expect(countDrafts(draftsDir)).toBe(2);
  });

  it('writes the count, and reports no change when it is already current', () => {
    fs.mkdirSync(draftsDir);
    fs.writeFileSync(path.join(draftsDir, 'a.md'), '');
    expect(writeDraftCount({ draftsDir, outFile })).toBe(true);
    expect(read()).toEqual({ count: 1 });
    expect(writeDraftCount({ draftsDir, outFile })).toBe(false);
  });

  it('writes 0 when the last draft is removed but the folder is still there', () => {
    fs.mkdirSync(draftsDir);
    fs.writeFileSync(outFile, `${JSON.stringify({ count: 3 })}\n`);
    expect(writeDraftCount({ draftsDir, outFile })).toBe(true);
    expect(read()).toEqual({ count: 0 });
  });

  // regression: the refresh-media bot's commit ran this via the husky hook in CI,
  // where the gitignored drafts/ folder doesn't exist, and committed count 0
  it('leaves the committed count alone when there is no drafts folder at all', () => {
    fs.writeFileSync(outFile, `${JSON.stringify({ count: 1 })}\n`);
    expect(writeDraftCount({ draftsDir, outFile })).toBe(false);
    expect(read()).toEqual({ count: 1 });
  });

  it('does not create the output file when there is no drafts folder', () => {
    expect(writeDraftCount({ draftsDir, outFile })).toBe(false);
    expect(fs.existsSync(outFile)).toBe(false);
  });
});
