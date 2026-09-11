import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	docblockEnvironment,
	srcDir,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// A test file that opens with `// @vitest-environment node` runs in the `pure`
// project with no window: no jsdom, no DOM stubs, no module doubles, no RTL
// cleanup (vitest.config.ts builds the project from the docblock). A file that
// reads no DOM belongs there, so it cannot reach the shared jsdom window by
// accident, and a file that does read the DOM must not carry the docblock, or
// its first `document` fails at runtime with no boundary to name it. This gate
// holds the docblock and the file's DOM use in step both ways. The rare file
// that reads no DOM itself but imports a module that needs a window at load
// declares `// @vitest-environment jsdom` instead, with the reason beside it.

const testsDir = join(srcDir, '__tests__')

// The trees the `unit` and `pure` projects share. `browser/` has its own
// config, and the `boundary/` files run in the node and forks projects.
const SCAN_SKIP = new Set(['browser', 'boundary'])

const SCANS = [
	{ dir: testsDir, skip: SCAN_SKIP },
	{ dir: join(srcDir, 'docs', 'engine', '__tests__') },
]

const TEST_FILE = /\.test\.tsx?$/

// Any token that needs a window. `render`/`renderHook`/`screen` cover RTL,
// the bare identifiers cover hand-built nodes and hook tests, and the
// package name covers matchers and user-event. The `helpers` barrel counts
// too: it re-exports user-event, whose clipboard hooks reach `window` from
// `afterEach` — a pure file imports a helper by its own module instead.
const DOM_TOKEN =
	/\b(?:document|window|navigator|HTMLElement|matchMedia)\b|@testing-library|\brender(?:UI|Hook)?\(|\bscreen\.|from '(?:\.\.\/)+helpers'/g

type Verdict = { file: string; environment: string | undefined; domTokens: string[] }

function verdicts(): Verdict[] {
	const out: Verdict[] = []

	for (const { dir, skip } of SCANS) {
		walkSource(
			dir,
			(file, content) => {
				if (!TEST_FILE.test(file)) return

				const tokens = stripSourceComments(content).matchAll(DOM_TOKEN)

				out.push({
					file: file.slice(srcDir.length + 1),
					environment: docblockEnvironment(content),
					domTokens: [...new Set([...tokens].map((match) => match[0]))],
				})
			},
			skip,
		)
	}

	return out
}

describe('node environment boundary', () => {
	const all = verdicts()

	it('no file that declares the node environment reads the DOM', () => {
		const violations = all
			.filter((v) => v.environment === 'node' && v.domTokens.length)
			.map((v) => `${v.file} → ${v.domTokens.join(', ')}`)

		expect(
			violations,
			'a `@vitest-environment node` file reads the DOM — drop the docblock, or move the DOM half to its own file',
		).toEqual([])
	})

	it('every file that reads no DOM declares its environment', () => {
		const violations = all
			.filter((v) => v.domTokens.length === 0 && v.environment === undefined)
			.map((v) => v.file)

		expect(
			violations,
			'a test file reads no DOM but declares no environment — open it with `// @vitest-environment node`, or with `// @vitest-environment jsdom` and the reason an import needs a window',
		).toEqual([])
	})

	it('scans the tree it claims to', () => {
		expect(all.length).toBeGreaterThan(400)
	})
})
