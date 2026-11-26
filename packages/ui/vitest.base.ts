/**
 * The test settings that the jsdom run (`vitest.config.ts`) and the browser
 * run (`vitest.browser.config.ts`) share.
 *
 * The settings that each suite of the repository shares come from
 * `vitest.shared.mts` at the root: the CI flag, the cleanup, the assertion
 * rule, the budgets, the time zone, and the shuffle. In ui, the setup files
 * also restore after each test (`helpers/restore-test-state.ts`), because the
 * shuffle gives a leak to whichever file runs next on a shared worker.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { configDefaults } from 'vitest/config'
import type { CoverageOptions, Reporter, TestRunEndReason, Vitest } from 'vitest/node'

export { assertions, budgets, CI, cleanup, env, sequence } from '../../vitest.shared.mts'

/**
 * The source that a run with coverage measures, in the jsdom suite and in the
 * browser suite. Each suite writes its report to a folder of its own under
 * `coverage/`. Both suites measure the same files with the same provider, so
 * `scripts/coverage/merge.ts` merges their reports into one. Thus a line
 * counts as covered when a test of either suite runs it.
 */
export const coverage: CoverageOptions = {
	provider: 'v8',
	include: ['src/**/*.{ts,tsx}'],
	exclude: ['src/__tests__/**', 'src/__benchmarks__/**', 'src/docs/**'],
	reporter: ['json'],
}

/**
 * The variables that change a run of ui: the budgets (`CI`, `COVERAGE`) and
 * the instances of the browser suite (`ALL_ENGINES`). A replay sets each one
 * that the run set.
 */
const RUN_FLAGS = ['CI', 'COVERAGE', 'ALL_ENGINES'] as const

/** A token that the shell reads as it is. */
const PLAIN_TOKEN = /^[\w@%+=:,./-]+$/

/** Quotes a token for the shell when it holds another character. */
function quote(token: string): string {
	return PLAIN_TOKEN.test(token) ? token : `'${token.replaceAll("'", `'\\''`)}'`
}

/** What a replay of a run needs to know. */
export interface ReplayInput {
	/** The arguments of the Vitest process after the binary: `process.argv.slice(2)`. */
	argv: readonly string[]
	/** The environment of the process. */
	env: Readonly<Record<string, string | undefined>>
	/** The shuffle seed of the run, or `undefined` when the run does not shuffle. */
	seed: number | undefined
	/**
	 * The text of the package script that started the run, as `package.json`
	 * gives it, or `undefined` for a run that no script started. The
	 * `npm_lifecycle_script` of pnpm also holds the arguments that the caller
	 * added, so it cannot tell them apart.
	 */
	script: string | undefined
}

/**
 * The shell command that runs the same files, in the same order, with the same
 * budgets as a run.
 *
 * @remarks
 * The sequencer deals the files to the shards first, and then it shuffles the
 * files of the shard (`split-sequencer.ts`). A replay without the `--shard` of
 * the run thus runs each file next to other files. `COVERAGE` scales each
 * budget of the browser suite, and `CI` scales the budgets of each suite.
 * Thus a replay needs the seed, the arguments, and these variables of the run.
 *
 * When the run comes from a package script that runs one Vitest command, the
 * replay runs that script with the arguments that the caller added, as
 * `pnpm -F ui test:browser --shard=2/2`. Another run, such as the two
 * commands of `test:changed`, replays as a direct `pnpm exec vitest` with each
 * argument and with the `LANG` of the run.
 *
 * In the browser suite, one page runs the files of an instance one after the
 * other, so the replay gives the same order. In the jsdom suite, the files go
 * to the workers in the same order, but the time of each file sets which
 * worker takes it.
 *
 * @param input - The arguments, the environment, the seed, and the script of
 * the run.
 * @returns The command, with the variables first.
 */
export function replayCommand({ argv, env, seed, script }: ReplayInput): string {
	const vars = [
		...(seed === undefined ? [] : [`VITEST_SEED=${seed}`]),
		...RUN_FLAGS.filter((name) => env[name]).map((name) => `${name}=1`),
	]

	const pkg = env.npm_package_name

	const event = env.npm_lifecycle_event

	const scriptArgs = (script ?? '').trim().split(/\s+/)

	const vitestAt = scriptArgs.indexOf('vitest')

	const own = scriptArgs.slice(vitestAt + 1)

	const single = vitestAt >= 0 && !scriptArgs.includes('&&') && !scriptArgs.includes(';')

	const matches = own.every((token, at) => argv[at] === token)

	if (pkg && event && single && matches) {
		return [...vars, 'pnpm', '-F', pkg, event, ...argv.slice(own.length).map(quote)].join(' ')
	}

	const lang = env.LANG ? [`LANG=${quote(env.LANG)}`] : []

	const scope = pkg ? ['-F', pkg] : []

	return [...vars, ...lang, 'pnpm', ...scope, 'exec', 'vitest', ...argv.map(quote)].join(' ')
}

/** The text of the script `name` in the `package.json` of `root`, if it has one. */
function packageScript(root: string, name: string | undefined): string | undefined {
	if (!name) return undefined

	try {
		const { scripts } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
			scripts?: Record<string, string>
		}

		return scripts?.[name]
	} catch {
		return undefined
	}
}

/**
 * Prints the replay command of a run that does not pass, in run mode only. On
 * GitHub Actions, it also writes the command as a notice, so the page of the
 * run shows it next to the annotations of the failures.
 */
export function replayReporter(): Reporter {
	let vitest: Vitest | undefined

	return {
		onInit(ctx) {
			vitest = ctx
		},
		onTestRunEnd(_modules, _errors, reason: TestRunEndReason) {
			// A rerun of watch mode runs the files that a change reaches, and a
			// filter from the prompt is not in the arguments. Thus no command
			// replays it.
			if (!vitest || vitest.config.watch || reason === 'passed') return

			const { shuffle, seed } = vitest.config.sequence

			const command = replayCommand({
				argv: process.argv.slice(2),
				env: process.env,
				seed: shuffle ? seed : undefined,
				script: packageScript(vitest.config.root, process.env.npm_lifecycle_event),
			})

			vitest.logger.log(`\nReplay this run: ${command}`)

			if (process.env.GITHUB_ACTIONS === 'true') {
				vitest.logger.log(`::notice title=Replay this run::${command}`)
			}
		},
	}
}

/**
 * The reporters of the jsdom run and the browser run of ui: the reporters of
 * Vitest (`default`, or `minimal` for an agent, and `github-actions` on GitHub
 * Actions), and {@link replayReporter}. A `reporters` option replaces the
 * defaults, so the list starts with them.
 */
export const reporters = [...configDefaults.reporters, replayReporter()]
