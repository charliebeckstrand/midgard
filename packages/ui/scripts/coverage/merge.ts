/**
 * Merges the coverage reports of the jsdom suite and of the browser suite into
 * one report. A line is covered when a test of either suite runs it.
 *
 * A run of the jsdom suite with `--coverage` writes
 * `coverage/jsdom/coverage-final.json` (`coverage` in `vitest.config.ts`). A
 * run of the browser suite with `COVERAGE` writes
 * `coverage/browser/coverage-final.json` (`coverage` in
 * `vitest.browser.config.ts`). Both suites measure the same source with the
 * same provider (`coverage` in `vitest.base.ts`). On CI, each shard of each
 * suite measures only its part of the test files. Each shard gives its report
 * to the `coverage` job, which puts each report in a folder of its own under
 * `coverage/`. The script merges each report that it finds in a folder under
 * `coverage/`, and writes the merged report to `coverage/`.
 *
 * The browser suite loads each module through the import rewrite of Vitest,
 * which turns each import binding into a statement. V8 maps that statement to
 * its import declaration. Thus the browser report counts an import line as a
 * statement, and the jsdom report does not. An import declaration is not code
 * that a test runs, so the script removes each statement that starts in one,
 * from each report, before the merge ({@link withoutImports}).
 *
 * The Cobertura report gives each path from the root of the repository.
 * Codecov reads this report (`.github/workflows/ci.yml`).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import libCoverage, { type CoverageMapData, type FileCoverageData } from 'istanbul-lib-coverage'
import libReport from 'istanbul-lib-report'
import reports from 'istanbul-reports'
import { parseAst } from 'vite'

const root = join(import.meta.dirname, '..', '..', 'coverage')

const repositoryRoot = join(import.meta.dirname, '..', '..', '..', '..')

const runs = existsSync(root)
	? readdirSync(root, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => join(root, entry.name, 'coverage-final.json'))
			.filter((file) => existsSync(file))
	: []

if (runs.length === 0) {
	throw new Error(`No coverage report in a folder under ${root}. Run \`test:coverage\`.`)
}

/** The start of each line of a file, and the range of each of its import declarations. */
type Imports = { lineStarts: number[]; ranges: [number, number][] }

/** The {@link Imports} of each file, by path. */
const importsByPath = new Map<string, Imports>()

/** The {@link Imports} of the file at `path`. */
function readImports(path: string): Imports {
	const known = importsByPath.get(path)

	if (known) return known

	const text = readFileSync(path, 'utf8')

	const lineStarts = [0, ...Array.from(text.matchAll(/\n/g), (match) => match.index + 1)]

	const ranges = parseAst(text, { lang: path.endsWith('.tsx') ? 'tsx' : 'ts' })
		.body.filter((node) => node.type === 'ImportDeclaration')
		.map((node): [number, number] => [node.start, node.end])

	const imports = { lineStarts, ranges }

	importsByPath.set(path, imports)

	return imports
}

/** The coverage of `file` with no statement that starts in an import declaration. */
function withoutImportsIn(file: FileCoverageData): FileCoverageData {
	const { lineStarts, ranges } = readImports(file.path)

	if (ranges.length === 0) return file

	const keys = Object.keys(file.statementMap).filter((key) => {
		const start = file.statementMap[key]?.start

		const at = start ? (lineStarts[start.line - 1] ?? 0) + start.column : -1

		return !ranges.some(([from, to]) => from <= at && at < to)
	})

	return {
		...file,
		statementMap: Object.fromEntries(
			keys.flatMap((key) => {
				const range = file.statementMap[key]

				return range ? [[key, range]] : []
			}),
		),
		s: Object.fromEntries(keys.map((key) => [key, file.s[key] ?? 0])),
	}
}

/**
 * The report `data` with no statement that starts in an import declaration.
 * The browser report counts an import binding as a statement, and the jsdom
 * report does not. Thus both reports count the same statements.
 */
function withoutImports(data: CoverageMapData): CoverageMapData {
	return Object.fromEntries(
		Object.entries(data).map(([path, file]) => [path, withoutImportsIn(file)]),
	)
}

const coverageMap = libCoverage.createCoverageMap({})

for (const run of runs) {
	coverageMap.merge(withoutImports(JSON.parse(readFileSync(run, 'utf8'))))
}

const context = libReport.createContext({ dir: root, coverageMap })

reports.create('text').execute(context)

reports.create('cobertura', { projectRoot: repositoryRoot }).execute(context)

reports.create('text-summary').execute(context)
