// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { replayCommand } from '../../../vitest.base.ts'

/** The environment of `pnpm run <event>` in ui, as pnpm sets it. */
function scriptEnv(event: string, extra: Record<string, string> = {}) {
	return { npm_package_name: 'ui', npm_lifecycle_event: event, ...extra }
}

const BROWSER_SCRIPT = 'LANG=en-US vitest run --config vitest.browser.config.ts'

describe('replayCommand', () => {
	it('replays a CI browser shard with its seed, shard, and budget variables', () => {
		expect(
			replayCommand({
				argv: ['run', '--config', 'vitest.browser.config.ts', '--shard=2/2'],
				env: scriptEnv('test:browser', { CI: 'true', COVERAGE: '1' }),
				script: BROWSER_SCRIPT,
				seed: 1795633642221,
			}),
		).toBe('VITEST_SEED=1795633642221 CI=1 COVERAGE=1 pnpm -F ui test:browser --shard=2/2')
	})

	it('keeps each argument that the caller added after the script, in order', () => {
		expect(
			replayCommand({
				argv: ['run', '--project', 'unit', '--shard=2/3', '--coverage'],
				env: scriptEnv('test', { CI: 'true' }),
				script: 'LANG=en-US vitest run --project unit',
				seed: 7,
			}),
		).toBe('VITEST_SEED=7 CI=1 pnpm -F ui test --shard=2/3 --coverage')
	})

	it('sets ALL_ENGINES for a run of the engines job', () => {
		expect(
			replayCommand({
				argv: ['run', '--config', 'vitest.browser.config.ts', '--project', 'density-webkit'],
				env: scriptEnv('test:browser', { ALL_ENGINES: '1', CI: 'true' }),
				script: BROWSER_SCRIPT,
				seed: 3,
			}),
		).toBe('VITEST_SEED=3 CI=1 ALL_ENGINES=1 pnpm -F ui test:browser --project density-webkit')
	})

	it('runs Vitest directly, with the LANG of the run, for a script of more than one command', () => {
		expect(
			replayCommand({
				argv: ['run', '--passWithNoTests', '--changed=abc123', '--project', 'unit'],
				env: scriptEnv('test:changed', { LANG: 'en-US' }),
				script: 'export LANG=en-US && vitest run --project boundary && vitest run --project unit',
				seed: 9,
			}),
		).toBe(
			'VITEST_SEED=9 LANG=en-US pnpm -F ui exec vitest run --passWithNoTests --changed=abc123 --project unit',
		)
	})

	it('runs Vitest directly when the arguments do not start with those of the script', () => {
		expect(
			replayCommand({
				argv: ['run', 'src/__tests__/components/button.test.tsx'],
				env: scriptEnv('test'),
				script: 'LANG=en-US vitest run --project unit',
				seed: 1,
			}),
		).toBe('VITEST_SEED=1 pnpm -F ui exec vitest run src/__tests__/components/button.test.tsx')
	})

	it('leaves out the seed of a run that does not shuffle, and quotes a token for the shell', () => {
		expect(
			replayCommand({
				argv: ['run', '-t', "Grid's sort"],
				env: {},
				seed: undefined,
				script: undefined,
			}),
		).toBe(`pnpm exec vitest run -t 'Grid'\\''s sort'`)
	})
})
