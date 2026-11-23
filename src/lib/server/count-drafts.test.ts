import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { countDrafts } from './count-drafts'; // Update with your actual filename

describe('countDrafts', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a unique temporary directory before each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drafts-test-'));
  });

  afterEach(() => {
    // Clean up the temporary directory after each test
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns 0 if the directory does not exist', () => {
    const missingDir = path.join(tempDir, 'does-not-exist');
    expect(countDrafts(missingDir)).toBe(0);
  });

  it('returns 0 for an empty directory', () => {
    expect(countDrafts(tempDir)).toBe(0);
  });

  it('counts only .md files and ignores other extensions', () => {
    fs.writeFileSync(path.join(tempDir, 'post-1.md'), '# Post 1');
    fs.writeFileSync(path.join(tempDir, 'post-2.md'), '# Post 2');
    fs.writeFileSync(path.join(tempDir, 'notes.txt'), 'Ignore me');
    fs.writeFileSync(path.join(tempDir, 'image.png'), '');

    expect(countDrafts(tempDir)).toBe(2);
  });
});
