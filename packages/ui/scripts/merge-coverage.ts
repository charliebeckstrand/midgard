/**
 * Merges the coverage of the jsdom run and of the browser run into one report.
 *
 * Each run measures only the source that its own tests execute. The browser
 * suite tests layout, virtualization, and floating UI, which jsdom cannot, so
 * the report of one run alone understates the coverage of the package.
 * `test:coverage` writes a JSON report for each run, and this script reads the
 * two and writes the merged report to `coverage/`.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import libCoverage from 'istanbul-lib-coverage'
import libReport from 'istanbul-lib-report'
import reports from 'istanbul-reports'

const root = join(import.meta.dirname, '..', 'coverage')

const runs = ['jsdom', 'browser'].map((run) => join(root, run, 'coverage-final.json'))

const coverageMap = libCoverage.createCoverageMap({})

for (const run of runs) {
	if (!existsSync(run)) throw new Error(`No coverage report at ${run}. Run \`test:coverage\`.`)

	coverageMap.merge(JSON.parse(readFileSync(run, 'utf8')))
}

const context = libReport.createContext({ dir: root, coverageMap })

for (const reporter of ['text', 'cobertura', 'text-summary'] as const) {
	reports.create(reporter).execute(context)
}
