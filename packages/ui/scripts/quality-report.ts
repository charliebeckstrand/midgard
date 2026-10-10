/**
 * Writes the weekly quality report of ui as Markdown, from the ledger and the
 * git history.
 *
 * Run `pnpm quality:report` from `packages/ui`. Add `--weeks <n>` to report
 * more weeks than the default of 4. The report has three parts:
 *
 * - The count of units in each state of the ledger, `docs/LEDGER.md`.
 * - The fix-on-fix share of each ISO week. The script reads each `fix` commit
 *   that changes `src`. It runs `git blame` on the parent commit, over the
 *   lines that the fix removes or replaces in the shipped source. The shipped
 *   source is `src` without the tests and without the docs app. The commit
 *   that wrote most of those lines sets the class of the fix. A commit from
 *   the 14 days before the fix is recent. A recent `fix` makes the fix a fix
 *   on a fix. A fix that replaces no line of the shipped source is additive.
 * - The count of units that a commit of each week set to Reopened.
 *
 * The fix-on-fix share is an upper bound on regressions. A fix that changes
 * the lines of a recent fix often continues that fix and does not undo it.
 * The trend over the weeks is the signal.
 *
 * The week of a commit is the ISO week of its commit date, in the time zone
 * of the commit. Each count uses the history of the branch that is checked
 * out, so run the script on an up-to-date `main`.
 */

import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { LEDGER, LEDGER_REPO_PATH, parseLedger, STATES, TIERS } from './quality-ledger.ts'

const run = promisify(execFile)

/** The root of the repository. Each git command runs there, so each path is from the root. */
const ROOT = fileURLToPath(new URL('../../..', import.meta.url))

/** The source that a fix can change, from the root of the repository. */
const SOURCE = 'packages/ui/src'

/** The parts of {@link SOURCE} that do not ship: the tests and the docs app. */
const NOT_SHIPPED = [
	`:(exclude)${SOURCE}/__tests__`,
	`:(exclude)${SOURCE}/docs`,
	':(exclude)*.test.ts',
	':(exclude)*.test.tsx',
]

/** A commit is recent to a fix when it is at most this old at the time of the fix. */
const RECENT_MS = 14 * 24 * 60 * 60 * 1000

/** The number of git processes that run at the same time. */
const PARALLEL = 8

type Commit = { sha: string; date: string; subject: string }

/** The class of a fix, from the commit that wrote most of the lines that it replaces. */
type FixClass = 'older' | 'additive' | 'recentOther' | 'recentFix'

/** The order of the classes when two of them replace the same count of lines. */
const TIE_ORDER: FixClass[] = ['older', 'recentFix', 'recentOther']

async function git(...args: string[]): Promise<string> {
	const { stdout } = await run('git', args, { cwd: ROOT, maxBuffer: 1 << 28 })

	return stdout
}

/** Runs `task` on each item, with at most {@link PARALLEL} tasks at one time. */
async function mapLimited<T, R>(items: T[], task: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = new Array(items.length)

	let next = 0

	const worker = async () => {
		while (next < items.length) {
			const index = next++

			results[index] = await task(items[index] as T)
		}
	}

	await Promise.all(Array.from({ length: PARALLEL }, worker))

	return results
}

/** The ISO week of the date part of an ISO 8601 date, such as `2026-W41`. */
function isoWeek(date: string): string {
	const day = new Date(`${date.slice(0, 10)}T00:00:00Z`)

	// The Thursday of the week sets the year of the week.
	day.setUTCDate(day.getUTCDate() + 3 - ((day.getUTCDay() + 6) % 7))

	const year = day.getUTCFullYear()

	const week = Math.floor((day.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 / 7) + 1

	return `${year}-W${String(week).padStart(2, '0')}`
}

/** The Monday of the week that holds the date part of an ISO 8601 date, as `YYYY-MM-DD`. */
function weekStart(date: string): string {
	const day = new Date(`${date.slice(0, 10)}T00:00:00Z`)

	day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7))

	return day.toISOString().slice(0, 10)
}

/** The day before a `YYYY-MM-DD` date, at midnight UTC, as an argument of `git log --since`. */
function dayBefore(date: string): string {
	const day = new Date(`${date}T00:00:00Z`)

	day.setUTCDate(day.getUTCDate() - 1)

	return day.toISOString()
}

function commitType(subject: string): string {
	return /^(\w+)/.exec(subject)?.[1] ?? ''
}

const commits = new Map<string, Promise<Commit>>()

function commitOf(sha: string): Promise<Commit> {
	let commit = commits.get(sha)

	if (!commit) {
		commit = git('show', '-s', '--format=%cI%x09%s', sha).then((out) => {
			const [date = '', subject = ''] = out.trim().split('\t')

			return { sha, date, subject }
		})

		commits.set(sha, commit)
	}

	return commit
}

/** The ranges of the parent that a commit removes or replaces, by file, as `-L` arguments of `git blame`. */
async function replacedRanges(sha: string): Promise<Map<string, string[]>> {
	const diff = await git('diff', '-U0', '--no-color', `${sha}^`, sha, '--', SOURCE, ...NOT_SHIPPED)

	const ranges = new Map<string, string[]>()

	let file: string | undefined

	for (const line of diff.split('\n')) {
		if (line.startsWith('--- ')) file = line === '--- /dev/null' ? undefined : line.slice(6)

		const hunk = /^@@ -(\d+)(?:,(\d+))? /.exec(line)

		if (!hunk || !file) continue

		const count = hunk[2] === undefined ? 1 : Number(hunk[2])

		if (count > 0) ranges.set(file, [...(ranges.get(file) ?? []), `-L${hunk[1]},+${count}`])
	}

	return ranges
}

/** Classifies one fix by the commits that wrote the lines that it replaces. */
async function classify(fix: Commit): Promise<FixClass> {
	const lines: Record<Exclude<FixClass, 'additive'>, number> = {
		older: 0,
		recentFix: 0,
		recentOther: 0,
	}

	const time = Date.parse(fix.date)

	for (const [file, ranges] of await replacedRanges(fix.sha)) {
		const blame = await git('blame', '--porcelain', ...ranges, `${fix.sha}^`, '--', file)

		for (const [, sha] of blame.matchAll(/^([0-9a-f]{40}) \d+ \d+/gm)) {
			const origin = await commitOf(sha as string)

			if (time - Date.parse(origin.date) > RECENT_MS) lines.older++
			else if (commitType(origin.subject) === 'fix') lines.recentFix++
			else lines.recentOther++
		}
	}

	const most = Math.max(...Object.values(lines))

	if (most === 0) return 'additive'

	return TIE_ORDER.find((name) => lines[name as keyof typeof lines] === most) as FixClass
}

/** The fixes that change {@link SOURCE}, from the Monday of the first week of the report. */
// Each query starts a day early, so a commit whose local date is in the report
// and whose UTC date is not still comes back. The filter on the local date then
// drops the extra day.
async function fixes(since: string): Promise<Commit[]> {
	const log = await git(
		'log',
		`--since=${dayBefore(since)}`,
		'--format=%H%x09%cI%x09%s',
		'--',
		SOURCE,
	)

	return log
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const [sha = '', date = '', subject = ''] = line.split('\t')

			return { sha, date, subject }
		})
		.filter((commit) => commitType(commit.subject) === 'fix' && commit.date.slice(0, 10) >= since)
}

/** The count of units that each commit of the ledger since `since` set to Reopened, by ISO week. */
async function reopened(since: string): Promise<Map<string, number>> {
	const log = await git(
		'log',
		`--since=${dayBefore(since)}`,
		'--format=%H%x09%cI',
		'--',
		LEDGER_REPO_PATH,
	)

	const weeks = new Map<string, number>()

	const states = async (rev: string) => {
		const source = await git('show', `${rev}:${LEDGER_REPO_PATH}`).catch(() => '')

		return new Map(parseLedger(source).rows.map((row) => [`${row.tier}/${row.unit}`, row.state]))
	}

	for (const line of log.trim().split('\n').filter(Boolean)) {
		const [sha = '', date = ''] = line.split('\t')

		if (date.slice(0, 10) < since) continue

		const [before, after] = await Promise.all([states(`${sha}^`), states(sha)])

		const count = [...after].filter(
			([unit, state]) => state === 'Reopened' && before.get(unit) !== 'Reopened',
		).length

		weeks.set(isoWeek(date), (weeks.get(isoWeek(date)) ?? 0) + count)
	}

	return weeks
}

function percent(part: number, whole: number): string {
	return whole === 0 ? '—' : `${part} (${Math.round((part / whole) * 100)}%)`
}

function weeksArgument(): number {
	const index = process.argv.indexOf('--weeks')

	const weeks = index === -1 ? 4 : Number(process.argv[index + 1])

	if (!Number.isInteger(weeks) || weeks < 1)
		throw new Error('--weeks takes a whole number of 1 or more')

	return weeks
}

async function main() {
	const weeks = weeksArgument()

	const head = (await git('log', '-1', '--format=%h%x09%cI')).trim().split('\t')

	const headDate = head[1] ?? ''

	const start = new Date(`${weekStart(headDate)}T00:00:00Z`)

	start.setUTCDate(start.getUTCDate() - 7 * (weeks - 1))

	const since = start.toISOString().slice(0, 10)

	const ledger = parseLedger(readFileSync(LEDGER, 'utf-8'))

	const fixList = await fixes(since)

	const classes = await mapLimited(fixList, classify)

	const reopenedWeeks = await reopened(since)

	const out: string[] = [`# ui quality report`, '', `At ${head[0]} (${headDate.slice(0, 10)}).`, '']

	out.push(
		'## Units',
		'',
		`| State | ${TIERS.join(' | ')} | Total |`,
		`|---|${TIERS.map(() => '---|').join('')}---|`,
	)

	for (const state of STATES) {
		const counts = TIERS.map(
			(tier) => ledger.rows.filter((row) => row.tier === tier && row.state === state).length,
		)

		out.push(`| ${state} | ${counts.join(' | ')} | ${counts.reduce((a, b) => a + b, 0)} |`)
	}

	const clean = ledger.rows.filter((row) => row.state === 'Clean').length

	out.push('', `Units Clean: ${clean} of ${ledger.rows.length}.`, '')

	out.push(
		'## Fix-on-fix share',
		'',
		'| Week | Fixes | Replaces older code | Additive only | Replaces other recent work | Replaces a recent fix |',
		'|---|---|---|---|---|---|',
	)

	const weekKeys = Array.from({ length: weeks }, (_, offset) => {
		const day = new Date(start)

		day.setUTCDate(day.getUTCDate() + 7 * offset)

		return isoWeek(day.toISOString())
	}).reverse()

	for (const week of weekKeys) {
		const inWeek = classes.filter((_, index) => isoWeek(fixList[index]?.date ?? '') === week)

		const count = (name: FixClass) =>
			percent(inWeek.filter((c) => c === name).length, inWeek.length)

		out.push(
			`| ${week} | ${inWeek.length} | ${count('older')} | ${count('additive')} | ${count('recentOther')} | ${count('recentFix')} |`,
		)
	}

	out.push('', '## Reopened units', '', '| Week | Reopened |', '|---|---|')

	for (const week of weekKeys) out.push(`| ${week} | ${reopenedWeeks.get(week) ?? 0} |`)

	process.stdout.write(`${out.join('\n')}\n`)
}

await main()
