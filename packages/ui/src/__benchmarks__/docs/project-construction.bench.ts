// @vitest-environment node

import path from 'node:path'
import { Project } from 'ts-morph'
import { bench, describe } from 'vitest'
import { openProject } from '../../docs/engine/api-reference/engine/build-api'

// Hypothesis suite for `openProject` (`build-api.ts`): project construction
// dominated `buildApi` (~7s of ~10s) until #1001 scoped it to barrel indices
// plus resolved dependencies, so each bench builds a Project a different way
// and includes checker creation — the costs every cold extraction pays before
// touching a component. Variants that shrink the file set must diff extraction
// output before adoption (#1001's shape verified byte-identical). Constructions
// run for seconds; fixed low iteration counts replace time-boxed sampling.

const OPTS = { warmupIterations: 1, warmupTime: 0, iterations: 3, time: 0 }

const srcDir = path.resolve(import.meta.dirname, '..', '..')

const tsConfigFilePath = path.resolve(srcDir, '..', 'tsconfig.json')

const componentGlobs = [`${srcDir}/components/**/*.{ts,tsx}`, `${srcDir}/modules/**/*.{ts,tsx}`]

describe('docs: ts-morph project construction', () => {
	bench(
		'barrel indices + resolveSourceFileDependencies (current openProject)',
		() => {
			openProject(srcDir).getTypeChecker()
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
		'skipAddingFilesFromTsConfig + components/modules globs',
		() => {
			const project = new Project({ tsConfigFilePath, skipAddingFilesFromTsConfig: true })

			project.addSourceFilesAtPaths(componentGlobs)

			project.getTypeChecker()
		},
		OPTS,
	)

	bench(
		'glob-scoped + skipFileDependencyResolution',
		() => {
			const project = new Project({
				tsConfigFilePath,
				skipAddingFilesFromTsConfig: true,
				skipFileDependencyResolution: true,
			})

			project.addSourceFilesAtPaths(componentGlobs)

			project.getTypeChecker()
		},
		OPTS,
	)
})
