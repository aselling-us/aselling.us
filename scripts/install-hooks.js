// Points git at the tracked .githooks folder so the pre-push version check runs.
// Runs from `npm install` (the "prepare" script). It does nothing outside a git checkout, e.g.
// in the Docker build, where there is no .git folder.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (existsSync('.git')) {
	execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
}
