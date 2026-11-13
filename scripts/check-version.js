#!/usr/bin/env node
/**
 * Blocks a push unless version.py has been bumped past what is already pushed or released.
 *
 * "Already pushed or released" is the highest version found in any of:
 *   - version.py on the remote copy of the branch being pushed
 *   - version.py on the remote's main branch
 *   - the newest vX.Y.Z tag on the remote
 *
 * The version that counts is the one in the commit being pushed, not the file in your working
 * tree, so a bump has to be committed. Nothing is bumped for you: edit version.py by hand.
 *
 * Usage:
 *   node scripts/check-version.js                       check HEAD against origin (by hand or CI)
 *   node scripts/check-version.js --remote upstream     same, against another remote
 *   node scripts/check-version.js --pre-push NAME URL   how .githooks/pre-push calls it
 *
 * Skip it for one push with: git push --no-verify
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const VERSION_FILE = 'version.py';
// The branch that gets released (the CI deploys on every push to it).
const BASE_BRANCH = 'main';

// Matches both __version = "1.2.3" and __version__ = "1.2.3".
const VERSION_LINE = /^\s*__version(?:__)?\s*=\s*["']([^"']+)["']/m;
const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)$/;

/** Run git and return its stdout, or null if the command failed. */
function git(...args) {
	const result = spawnSync('git', args, { encoding: 'utf8' });
	return result.status === 0 ? result.stdout : null;
}

const isZero = (sha) => /^0+$/.test(sha);
const hasCommit = (rev) => git('cat-file', '-e', `${rev}^{commit}`) !== null;

/** "v1.2.3" -> [1, 2, 3]. Null if it isn't MAJOR.MINOR.PATCH. */
function parseSemver(text) {
	const match = SEMVER.exec(text.trim());
	return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Like a sort comparator. Compares numbers, so 0.10.0 is higher than 0.9.0. */
function compare(a, b) {
	return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/** The raw version string written in version.py at <rev>, or null if there isn't one. */
function readVersion(rev) {
	const source = git('show', `${rev}:${VERSION_FILE}`);
	return source?.match(VERSION_LINE)?.[1] ?? null;
}

/** The version in version.py at <rev>, labelled for the error message. Null if it has none. */
function baselineFrom(rev, source) {
	const raw = readVersion(rev);
	const version = raw && parseSemver(raw);
	return version ? { version, source } : null;
}

/** The newest vX.Y.Z (or X.Y.Z) tag among these tag names. */
function tagBaseline(names) {
	let newest = null;
	for (const name of names) {
		const version = parseSemver(name);
		if (version && (!newest || compare(version, newest.version) > 0)) {
			newest = { version, source: `release tag ${name}` };
		}
	}
	return newest;
}

/** Every version that is already pushed or released, according to the remote. */
function findBaselines(remote, branch, remoteSha) {
	const baselines = [];

	// What the remote copy of this branch holds right now (git itself supplies the sha).
	if (!isZero(remoteSha)) {
		baselines.push(baselineFrom(remoteSha, `${remote}/${branch}, already pushed`));
	}

	// One round trip for main and every tag.
	const listing = git('ls-remote', remote, `refs/heads/${BASE_BRANCH}`, 'refs/tags/*');
	let mainSha = null;
	let tags;
	if (listing === null) {
		console.error(`version check: can't reach '${remote}', using what is cached locally.`);
		tags = (git('tag', '--list') ?? '').split('\n');
	} else {
		const refs = {};
		for (const line of listing.split('\n')) {
			const [sha, ref] = line.split('\t');
			if (ref) refs[ref] = sha;
		}
		mainSha = refs[`refs/heads/${BASE_BRANCH}`] ?? null;
		// Annotated tags are listed twice; the "^{}" copy is the commit they point at.
		tags = Object.keys(refs)
			.filter((ref) => ref.startsWith('refs/tags/'))
			.map((ref) => ref.slice('refs/tags/'.length).replace(/\^\{\}$/, ''));
	}

	// When pushing main itself, the remote copy above already is main.
	if (branch !== BASE_BRANCH) {
		if (mainSha && hasCommit(mainSha)) {
			baselines.push(baselineFrom(mainSha, `${remote}/${BASE_BRANCH}`));
		} else {
			if (mainSha) {
				console.error(
					`version check: ${remote}/${BASE_BRANCH} has commits you haven't fetched. ` +
						`Run 'git fetch ${remote}' to compare against them.`
				);
			}
			baselines.push(
				baselineFrom(
					`refs/remotes/${remote}/${BASE_BRANCH}`,
					`${remote}/${BASE_BRANCH}, as last fetched`
				)
			);
		}
	}

	baselines.push(tagBaseline(tags));
	return baselines.filter(Boolean);
}

/** True when the push would add commits the remote doesn't already have somewhere. */
function hasNewCommits(remote, localSha) {
	const out = git('rev-list', '-n', '1', localSha, '--not', `--remotes=${remote}`);
	return out === null || out.trim() !== '';
}

/** Check one branch update. Prints why and returns false if it should be blocked. */
function checkBranch(remote, localSha, remoteRef, remoteSha) {
	const branch = remoteRef.slice('refs/heads/'.length);
	const blocked = `Push of '${branch}' blocked:`;

	const raw = readVersion(localSha);
	const pushed = raw && parseSemver(raw);
	if (!pushed) {
		console.error(
			raw === null
				? `${blocked} no version found in ${VERSION_FILE} in the commit being pushed.\n` +
						`  Commit ${VERSION_FILE} with a line like:  __version = "1.2.3"`
				: `${blocked} ${VERSION_FILE} says "${raw}", which isn't MAJOR.MINOR.PATCH (like 1.2.3).`
		);
		return false;
	}

	const baselines = findBaselines(remote, branch, remoteSha).sort((a, b) =>
		compare(b.version, a.version)
	);
	if (baselines.length === 0 || compare(pushed, baselines[0].version) > 0) return true;

	const [major, minor, patch] = baselines[0].version;
	const next = [`${major}.${minor}.${patch + 1}`, `${major}.${minor + 1}.0`, `${major + 1}.0.0`];
	console.error(
		[
			`${blocked} ${VERSION_FILE} says ${raw}, which isn't higher than what is already out there.`,
			'',
			'  Already pushed or released:',
			...baselines.map(({ version, source }) => `    ${version.join('.').padEnd(10)}${source}`),
			'',
			`  Edit ${VERSION_FILE} by hand to something higher (${next.join(', ')}),`,
			'  commit it, and push again.',
			'  To skip this check once: git push --no-verify'
		].join('\n')
	);
	return false;
}

/** The ref updates to check, as [localRef, localSha, remoteRef, remoteSha] rows. */
function readUpdates(prePush, remote) {
	if (prePush) {
		// git writes one "<local ref> <local sha> <remote ref> <remote sha>" line per pushed ref.
		return readFileSync(0, 'utf8')
			.split('\n')
			.filter(Boolean)
			.map((line) => line.split(' '));
	}

	const branch = git('symbolic-ref', '--short', '-q', 'HEAD')?.trim();
	if (!branch) {
		console.error('version check: HEAD is detached, check out a branch first.');
		process.exit(2);
	}
	const localSha = git('rev-parse', 'HEAD')?.trim() ?? '';
	const remoteSha = git('rev-parse', '--verify', '-q', `refs/remotes/${remote}/${branch}`)?.trim();
	return [['HEAD', localSha, `refs/heads/${branch}`, remoteSha ?? '0'.repeat(40)]];
}

function main() {
	const { values, positionals } = parseArgs({
		options: { remote: { type: 'string', default: 'origin' }, 'pre-push': { type: 'boolean' } },
		allowPositionals: true
	});
	const prePush = values['pre-push'] === true;
	// As a hook, git passes the remote's name (or URL) first.
	const remote = prePush ? positionals[0] : values.remote;

	let ok = true;
	for (const [, localSha, remoteRef, remoteSha] of readUpdates(prePush, remote)) {
		const isBranchPush = remoteRef.startsWith('refs/heads/') && !isZero(localSha);
		if (!isBranchPush) continue; // branch deletes and tag pushes aren't versioned
		if (localSha === remoteSha || !hasNewCommits(remote, localSha)) continue;
		ok = checkBranch(remote, localSha, remoteRef, remoteSha) && ok;
	}

	if (ok && !prePush) console.log('Version check passed.');
	process.exitCode = ok ? 0 : 1;
}

main();
