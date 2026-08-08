// @vitest-environment node

import { Project } from 'ts-morph'
import { bench, describe } from 'vitest'
import {
	DOCUMENTED_ROOTS,
	openProject,
	tsConfigPathFor,
} from '../../docs/engine/api-reference/engine/build-api'
import { srcDir } from './paths'

// Hypothesis suite for `openProject` (`build-api.ts`): project construction is
// most of what a cold extraction pays before it reaches a component, so each
// bench builds a Project a different way and includes checker creation.
//
// Read the last row as a ceiling, not as headroom. A glob seed plus
// `skipFileDependencyResolution` makes it fast by dropping cross-root link
// targets, which fails a `buildApi` output diff; `openProject` states the rule.
// The tsconfig row above it keeps those files, because the tsconfig includes
// `src` itself.
//
// Constructions run for seconds; fixed low iteration counts replace time-boxed
// sampling. Wall clock here carries ±15-30% run to run — compare medians across
// separate processes before you believe a difference.

const OPTS = { warmupIterations: 1, warmupTime: 0, iterations: 3, time: 0 }

// Taken from `openProject`'s own rule, not rebuilt: a variant that opened a
// different config would stop measuring what it claims to compare against.
const tsConfigFilePath = tsConfigPathFor(srcDir)

const rootGlobs = DOCUMENTED_ROOTS.map(([root]) => `${srcDir}/${root}/**/*.{ts,tsx}`)

describe('docs: ts-morph project construction', () => {
	bench(
		'barrel indices + resolveSourceFileDependencies (current openProject)',
		() => {
			openProject(srcDir).getTypeChecker()
		},
		OPTS,
	)

	bench(
		'documented-root globs + resolveSourceFileDependencies',
		() => {
			const project = new Project({ tsConfigFilePath, skipAddingFilesFromTsConfig: true })

			project.addSourceFilesAtPaths(rootGlobs)

			project.resolveSourceFileDependencies()

			project.getTypeChecker()
		},
		OPTS,
	)

	bench(
		'tsconfig include (pre-#1001 shape)',
		() => {
			const project = new Project({ tsConfigFilePath })

			project.getTypeChecker()
		},
		OPTS,
	)

	bench(
		'tsconfig + skipFileDependencyResolution',
		() => {
			const project = new Project({ tsConfigFilePath, skipFileDependencyResolution: true })

			project.getTypeChecker()
		},
		OPTS,
	)

	bench(
		'glob-scoped + skipFileDependencyResolution (drops cross-root links)',
		() => {
			const project = new Project({
				tsConfigFilePath,
				skipAddingFilesFromTsConfig: true,
				skipFileDependencyResolution: true,
			})

			project.addSourceFilesAtPaths(rootGlobs)

			project.getTypeChecker()
		},
		OPTS,
	)
})
