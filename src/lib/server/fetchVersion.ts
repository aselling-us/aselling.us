import fs from 'node:fs';
import path from 'node:path';

const versionFile = fs.readFileSync(path.resolve('version.py'), 'utf-8');
const match = versionFile.match(/["']([^"']+)["']/);
export const version = match ? match[1] : 'unknown';
