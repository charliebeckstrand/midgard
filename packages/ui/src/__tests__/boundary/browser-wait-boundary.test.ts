import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
	FACTORS,
	type Finding,
	findingsIn,
	TEST_TIMEOUT,
	WALL_CLOCK,
} from '../helpers/browser-waits'
import { startTypeScript } from '../helpers/ts-server'
import { isSourceFile, srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// Browser wait boundary. The browser suite waits for a signal with a deadline,
// and never for a fixed time (#2006). `vitest.browser.config.ts` states the
// rule: machine speed can change when a test passes, never whether it passes.
// This suite holds three parts of that rule in `src/__tests__/browser/`:
//
// - A deadline goes through `budget()`, so that it scales on CI. A number
//   literal as a `timeout` or a `deadline` does not scale.
// - A hold goes through `pause()` in `helpers/wall-clock.ts`, which records why
//   it does not scale and ends with two frames. A `new Promise` that a
//   `setTimeout` resolves is a second, hand-made hold.
// - A `budget()` wait stays below the time limit of its case, on each machine.
//   A wait that can pass the limit fails as an opaque timeout of the case, and
//   not as the error of the wait.
//
// The suite is a boundary test and not a Biome plugin. The third part reads
// numbers from `vitest.browser.config.ts`, multiplies them, and follows a call
// from a case to a helper in the same file. GritQL cannot do arithmetic or
// follow a call, and one gate is easier to read than two.
//
// The scan lives in `helpers/browser-waits.ts`. This file parses the browser
// files, and holds the rules against them and against fixtures.

const browserDir = join(srcDir, '__tests__', 'browser')

describe('browser wait boundary', () => {
	// The TypeScript server parses each browser file, and stops after the last case.
	const server = startTypeScript()

	afterAll(() => server.close())

	const files: string[] = []

	walkSource(browserDir, (path) => {
		if (isSourceFile(path)) files.push(path)
	})

	const findings = [...server.parse(files)].flatMap(([path, parsed]) =>
		findingsIn(srcRelative(path), parsed),
	)

	/** The findings of a fixture `source` under the file name `file`. */
	const fixture = (source: string, file = '__tests__/browser/fixture.test.tsx') =>
		findingsIn(file, server.parseText('fixture.test.tsx', source)).map((finding) => finding.rule)

	const report = (rule: Finding['rule']) =>
		findings
			.filter((finding) => finding.rule === rule)
			.map((finding) => finding.text)
			.join('\n  ')

	it('reads the time limit and the factors from vitest.browser.config.ts', () => {
		expect(TEST_TIMEOUT).toBeGreaterThan(0)

		expect(FACTORS).toHaveLength(2)
	})

	it('gives each deadline through budget()', () => {
		const text = report('literal')

		expect(
			text,
			`a number literal as a deadline does not scale on CI — give it through \`budget(ms)\` from \`browser/helpers/wall-clock.ts\`:\n  ${text}`,
		).toBe('')
	})

	it('holds real time only through pause()', () => {
		const text = report('hold')

		expect(
			text,
			`a hand-made hold — wait for a signal (\`waitFor\`, \`once\`, \`sampleUntil\`, \`frames\`), or use \`pause()\` from \`browser/helpers/wall-clock.ts\` where no signal exists:\n  ${text}`,
		).toBe('')
	})

	it('keeps each budget() wait below the time limit of its case', () => {
		const text = report('overrun')

		expect(
			text,
			`a wait that can pass the time limit of its case fails as an opaque timeout — set \`{ timeout: budget(ms) }\` on the case, above the wait:\n  ${text}`,
		).toBe('')
	})

	it('finds a literal deadline in a wait, a poll, a sampler, and a case', () => {
		expect(fixture(`waitFor(() => {}, { timeout: 2000 })`)).toEqual(['literal'])

		expect(fixture(`expect.poll(() => 1, { timeout: 2_000 }).toBe(1)`)).toEqual(['literal'])

		expect(fixture(`const LONG = 3000\nsampleUntil(read, done, { deadline: LONG })`)).toEqual([
			'literal',
		])

		expect(fixture(`animationsDone(root, 1200)`)).toEqual(['literal'])

		expect(fixture(`it('a', { timeout: 20_000 }, async () => {})`)).toEqual(['literal'])

		expect(fixture(`it('a', async () => {}, 20_000)`)).toEqual(['literal'])

		expect(fixture(`waitFor(() => {}, { timeout: budget(2000) })`)).toEqual([])

		expect(fixture(`waitFor(() => {}, { timeout: inject('asyncUtilTimeout') })`)).toEqual([])
	})

	it('finds a hand-made hold, and passes a pause() and a race deadline', () => {
		expect(fixture(`await new Promise((r) => setTimeout(r, 100))`)).toEqual(['hold'])

		expect(fixture(`await new Promise((done) => { setTimeout(() => done(), 100) })`)).toEqual([
			'hold',
		])

		expect(
			fixture(`await new Promise((r) => setTimeout(r, 100))`, WALL_CLOCK),
			'pause() is the sanctioned hold',
		).toEqual([])

		expect(
			fixture(
				`const expired = new Promise((r) => { setTimeout(r, left) })\nawait Promise.race([signal, expired])`,
			),
		).toEqual([])

		expect(fixture(`await new Promise(requestAnimationFrame)`)).toEqual([])
	})

	it('finds a budget() wait that can pass the time limit of its case', () => {
		// At the suite limit on each machine, because the limit scales as the wait does.
		const over = TEST_TIMEOUT

		expect(
			fixture(`it('a', async () => { await waitFor(f, { timeout: budget(${over}) }) })`),
		).toEqual(['overrun', 'overrun'])

		// A case that sets its own limit above the wait.
		expect(
			fixture(
				`it('a', { timeout: budget(${over * 2}) }, async () => { await waitFor(f, { timeout: budget(${over}) }) })`,
			),
		).toEqual([])

		// A wait in a helper of the same file that the case calls.
		expect(
			fixture(
				`function load() { return waitFor(f, { timeout: budget(${over}) }) }\nit('a', async () => { await load() })`,
			),
		).toEqual(['overrun', 'overrun'])

		// A block limit covers each case in the block.
		expect(
			fixture(
				`describe('b', { timeout: budget(${over * 2}) }, () => { it('a', async () => { await waitFor(f, { timeout: budget(${over}) }) }) })`,
			),
		).toEqual([])
	})
})
