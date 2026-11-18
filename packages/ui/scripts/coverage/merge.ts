/**
 * Merges the coverage reports of the jsdom run and of the browser run into one
 * report.
 *
 * Each run measures only the source that its own tests execute. The browser
 * suite tests layout, virtualization, and floating UI, which jsdom cannot, so
 * the report of one run alone understates the coverage of the package.
 *
 * A run with `--coverage` writes `coverage/<run>/coverage-final.json`
 * (`coverageScope` in `vitest.base.ts`). On CI, each shard of the two runs
 * gives its report to the `coverage` job, which puts each report in a folder
 * of its own under `coverage/`. The script merges each report that it finds
 * in a folder under `coverage/`, and writes the merged report to `coverage/`.
 *
 * The Cobertura report gives each path from the root of the repository. GitHub
 * Code Quality reads this report (`.github/workflows/ci.yml`).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import libCoverage from 'istanbul-lib-coverage'
import libReport from 'istanbul-lib-report'
import reports from 'istanbul-reports'

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

const coverageMap = libCoverage.createCoverageMap({})

for (const run of runs) {
	coverageMap.merge(JSON.parse(readFileSync(run, 'utf8')))
}

const context = libReport.createContext({ dir: root, coverageMap })

reports.create('text').execute(context)

reports.create('cobertura', { projectRoot: repositoryRoot }).execute(context)

reports.create('text-summary').execute(context)
