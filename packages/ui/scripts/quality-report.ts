/**
 * Writes the weekly quality report of ui as Markdown, from the ledger and the
 * git history.
 *
 * Run `pnpm quality:report` from `packages/ui`. Add `--weeks <n>` to report
 * more weeks than the default of 4. The report has these parts:
 *
 * - The count of units in each state of the ledger, `docs/LEDGER.md`.
 * - The measures of the last quality scan, from the Scan section of the
 *   ledger, and the units whose files changed after its commit.
 * - The next passes: each unit with an open finding, ranked by its `high`
 *   findings, its `medium` findings, its correctness findings, its polish
 *   findings, its fixes of the last 7 days, and then its name.
 * - The fix-on-fix share of each ISO week. The script reads each `fix` commit
 *   that changes `src`. It runs `git blame` on the parent commit, over the
 *   lines that the fix removes or replaces in the shipped source. The shipped
 *   source is `src` without the tests and without the docs app. The commit
 *   that wrote most of those lines sets the class of the fix. A commit from
 *   the 7 days before the fix is recent. A recent `fix` makes the fix a fix
 *   on a fix. A fix that replaces no line of the shipped source is additive.
 *   One more column gives the fix-on-fix share with a 14-day window, which
 *   the report used before, so that the change of window is visible.
 * - The units with the most fixes in the weeks of the report. A fix counts for
 *   each unit whose shipped source it changes. A Clean pass takes these units
 *   first.
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
import {
	LEDGER,
	LEDGER_REPO_PATH,
	OPEN_LEVELS,
	parseLedger,
	parseOpen,
	parseScan,
	SCAN_FIELDS,
	STATES,
	TIERS,
} from './quality-ledger.ts'
import { QUALITY_SEEDS } from './quality-seeds.ts'

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

const DAY_MS = 24 * 60 * 60 * 1000

/** A commit is recent to a fix when it is at most this many days old at the time of the fix. */
const RECENT_DAYS = 7

/** The window of the comparison column, which the report used before {@link RECENT_DAYS}. */
const PREVIOUS_DAYS = 14

/** The count of rows in the table of the units with the most fixes. */
const TOP_UNITS = 15

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

type ReplacedLines = Record<Exclude<FixClass, 'additive'>, number>

/** The class of a fix from the count of replaced lines in each class. */
function classOf(lines: ReplacedLines): FixClass {
	const most = Math.max(...Object.values(lines))

	if (most === 0) return 'additive'

	return TIE_ORDER.find((name) => lines[name as keyof ReplacedLines] === most) as FixClass
}

/** Classifies one fix by the commits that wrote the lines that it replaces, for each window. */
async function classify(fix: Commit): Promise<Record<'current' | 'previous', FixClass>> {
	const windows = { current: RECENT_DAYS, previous: PREVIOUS_DAYS }

	const lines = {
		current: { older: 0, recentFix: 0, recentOther: 0 },
		previous: { older: 0, recentFix: 0, recentOther: 0 },
	} satisfies Record<keyof typeof windows, ReplacedLines>

	const time = Date.parse(fix.date)

	for (const [file, ranges] of await replacedRanges(fix.sha)) {
		const blame = await git('blame', '--porcelain', ...ranges, `${fix.sha}^`, '--', file)

		for (const [, sha] of blame.matchAll(/^([0-9a-f]{40}) \d+ \d+/gm)) {
			const origin = await commitOf(sha as string)

			const age = time - Date.parse(origin.date)

			for (const window of ['current', 'previous'] as const) {
				if (age > windows[window] * DAY_MS) lines[window].older++
				else if (commitType(origin.subject) === 'fix') lines[window].recentFix++
				else lines[window].recentOther++
			}
		}
	}

	return { current: classOf(lines.current), previous: classOf(lines.previous) }
}

/** The ledger keys (`tier/unit`) of the units whose shipped source changes from `from` to `to`. */
async function unitsOf(from: string, to: string): Promise<Set<string>> {
	const files = await git('diff', '--name-only', from, to, '--', SOURCE, ...NOT_SHIPPED)

	const keys = new Set<string>()

	for (const file of files.split('\n')) {
		const [tier = '', name = ''] = file.slice(SOURCE.length + 1).split('/')

		if (!(TIERS as readonly string[]).includes(tier) || !name || name === 'index.ts') continue

		keys.add(`${tier}/${tier === 'layouts' ? name.replace(/\.[^.]+$/, '') : name}`)
	}

	return keys
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

/** The fixes of the report, with the class and the units of each one. */
type History = {
	fixCommits: Commit[]
	classes: Record<'current' | 'previous', FixClass>[]
	fixUnits: Set<string>[]
	/** The ISO weeks of the report, the latest first. */
	weekKeys: string[]
	/** The Monday of the first week, as `YYYY-MM-DD`. */
	since: string
}

type Ledger = ReturnType<typeof parseLedger>

function unitsSection(ledger: Ledger): string[] {
	const out = [
		'## Units',
		'',
		`| State | ${TIERS.join(' | ')} | Total |`,
		`|---|${TIERS.map(() => '---|').join('')}---|`,
	]

	for (const state of STATES) {
		const counts = TIERS.map(
			(tier) => ledger.rows.filter((row) => row.tier === tier && row.state === state).length,
		)

		out.push(`| ${state} | ${counts.join(' | ')} | ${counts.reduce((a, b) => a + b, 0)} |`)
	}

	const clean = ledger.rows.filter((row) => row.state === 'Clean').length

	out.push('', `Units Clean: ${clean} of ${ledger.rows.length}.`, '')

	return out
}

/** The measures of the last scan, and the units whose files changed after its commit. */
async function scanSection(source: string): Promise<{ out: string[]; stale: Set<string> }> {
	const scan = parseScan(source)

	const commit = scan.Commit?.replace(/`/g, '')

	if (!commit || commit === '—')
		return {
			out: ['## Scan', '', `No scan yet. The seeded set holds ${QUALITY_SEEDS.length} fixes.`, ''],
			stale: new Set(),
		}

	const out = ['## Scan', '', ...SCAN_FIELDS.map((field) => `- ${field}: ${scan[field] ?? '—'}`)]

	out.push(`- Seeded set: ${QUALITY_SEEDS.length} fixes`, '')

	const stale = await unitsOf(commit, 'HEAD')

	if (stale.size > 0) {
		const keys = [...stale].sort().map((key) => `\`${key}\``)

		out.push(`Stale since the scan: ${keys.join(', ')}.`, '')
	}

	return { out, stale }
}

/** The count of fixes of each unit in the {@link RECENT_DAYS} before `headDate`. */
function recentFixes(history: History, headDate: string): Map<string, number> {
	const weekAgo = Date.parse(headDate) - RECENT_DAYS * DAY_MS

	const counts = new Map<string, number>()

	history.fixCommits.forEach((fix, index) => {
		if (Date.parse(fix.date) < weekAgo) return

		for (const key of history.fixUnits[index] ?? []) counts.set(key, (counts.get(key) ?? 0) + 1)
	})

	return counts
}

/** Each unit with an open finding, in the fixed order of the rank. */
function nextPassesSection(
	ledger: Ledger,
	recent: Map<string, number>,
	stale: Set<string>,
): string[] {
	const ranked = ledger.rows
		.map((row) => ({
			key: `${row.tier}/${row.unit}`,
			state: row.state,
			counts: parseOpen(row.open),
			recent: recent.get(`${row.tier}/${row.unit}`) ?? 0,
		}))
		.filter((row) => row.counts && Object.values(row.counts).some(Boolean))
		.sort((a, b) => {
			for (const level of OPEN_LEVELS) {
				const order = (b.counts?.[level] ?? 0) - (a.counts?.[level] ?? 0)

				if (order !== 0) return order
			}

			return b.recent - a.recent || a.key.localeCompare(b.key)
		})

	if (ranked.length === 0) return ['## Next passes', '', 'No unit has an open finding.', '']

	const levels = OPEN_LEVELS.map((level) => `${level[0]?.toUpperCase()}${level.slice(1)}`)

	const out = [
		'## Next passes',
		'',
		`| Unit | State | ${levels.join(' | ')} | Fixes, last ${RECENT_DAYS} days | Stale |`,
		`|---|---|${OPEN_LEVELS.map(() => '---|').join('')}---|---|`,
	]

	for (const row of ranked) {
		const counts = OPEN_LEVELS.map((level) => row.counts?.[level] ?? 0)

		out.push(
			`| \`${row.key}\` | ${row.state} | ${counts.join(' | ')} | ${row.recent} | ${stale.has(row.key) ? 'yes' : 'no'} |`,
		)
	}

	out.push('')

	return out
}

function fixOnFixSection(history: History): string[] {
	const out = [
		'## Fix-on-fix share',
		'',
		`Work is recent when it is at most ${RECENT_DAYS} days older than the fix. The last column uses the window of ${PREVIOUS_DAYS} days that the report used before.`,
		'',
		`| Week | Fixes | Replaces older code | Additive only | Replaces other recent work | Replaces a recent fix | Replaces a fix of the last ${PREVIOUS_DAYS} days |`,
		'|---|---|---|---|---|---|---|',
	]

	for (const week of history.weekKeys) {
		const inWeek = history.classes.filter(
			(_, index) => isoWeek(history.fixCommits[index]?.date ?? '') === week,
		)

		const count = (name: FixClass, window: 'current' | 'previous' = 'current') =>
			percent(inWeek.filter((fixClass) => fixClass[window] === name).length, inWeek.length)

		out.push(
			`| ${week} | ${inWeek.length} | ${count('older')} | ${count('additive')} | ${count('recentOther')} | ${count('recentFix')} | ${count('recentFix', 'previous')} |`,
		)
	}

	out.push('')

	return out
}

function fixesByUnitSection(history: History, ledger: Ledger): string[] {
	const latest = history.weekKeys[0]

	const byUnit = new Map<string, { all: number; latest: number; onFix: number }>()

	history.fixCommits.forEach((fix, index) => {
		for (const key of history.fixUnits[index] ?? []) {
			const unit = byUnit.get(key) ?? { all: 0, latest: 0, onFix: 0 }

			unit.all++

			if (isoWeek(fix.date) === latest) unit.latest++

			if (history.classes[index]?.current === 'recentFix') unit.onFix++

			byUnit.set(key, unit)
		}
	})

	const states = new Map(ledger.rows.map((row) => [`${row.tier}/${row.unit}`, row.state]))

	const out = [
		'## Fixes by unit',
		'',
		`The ${TOP_UNITS} units with the most fixes since ${history.since}. A fix counts for each unit whose shipped source it changes.`,
		'',
		`| Unit | State | Fixes | In ${latest} | Replaces a recent fix |`,
		'|---|---|---|---|---|',
	]

	const top = [...byUnit]
		.sort(([a, x], [b, y]) => y.all - x.all || y.latest - x.latest || a.localeCompare(b))
		.slice(0, TOP_UNITS)

	for (const [key, unit] of top)
		out.push(
			`| \`${key}\` | ${states.get(key) ?? '—'} | ${unit.all} | ${unit.latest} | ${unit.onFix} |`,
		)

	out.push('')

	return out
}

async function main() {
	const weeks = weeksArgument()

	const head = (await git('log', '-1', '--format=%h%x09%cI')).trim().split('\t')

	const headDate = head[1] ?? ''

	const start = new Date(`${weekStart(headDate)}T00:00:00Z`)

	start.setUTCDate(start.getUTCDate() - 7 * (weeks - 1))

	const since = start.toISOString().slice(0, 10)

	const source = readFileSync(LEDGER, 'utf-8')

	const ledger = parseLedger(source)

	const fixCommits = await fixes(since)

	const history: History = {
		fixCommits,
		classes: await mapLimited(fixCommits, classify),
		fixUnits: await mapLimited(fixCommits, (fix) => unitsOf(`${fix.sha}^`, fix.sha)),
		weekKeys: Array.from({ length: weeks }, (_, offset) => {
			const day = new Date(start)

			day.setUTCDate(day.getUTCDate() + 7 * offset)

			return isoWeek(day.toISOString())
		}).reverse(),
		since,
	}

	const reopenedWeeks = await reopened(since)

	const scan = await scanSection(source)

	const out = [
		'# ui quality report',
		'',
		`At ${head[0]} (${headDate.slice(0, 10)}).`,
		'',
		...unitsSection(ledger),
		...scan.out,
		...nextPassesSection(ledger, recentFixes(history, headDate), scan.stale),
		...fixOnFixSection(history),
		...fixesByUnitSection(history, ledger),
		'## Reopened units',
		'',
		'| Week | Reopened |',
		'|---|---|',
		...history.weekKeys.map((week) => `| ${week} | ${reopenedWeeks.get(week) ?? 0} |`),
	]

	process.stdout.write(`${out.join('\n')}\n`)
}

await main()
