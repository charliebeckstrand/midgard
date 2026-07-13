// @vitest-environment node

import path from 'node:path'
import { Project } from 'ts-morph'
import { bench, describe } from 'vitest'

// Hypothesis suite for `openProject` (`build-api.ts`): project construction is
// the dominant `buildApi` cost (~7s of ~10s), so each bench builds a Project a
// different way and includes checker creation — the two costs every extraction
// run pays before touching a single component. Constructions run for seconds;
// fixed low iteration counts replace vitest's time-boxed sampling.

const OPTS = { warmupIterations: 1, warmupTime: 0, iterations: 3, time: 0 }

const srcDir = path.resolve(import.meta.dirname, '..', '..')

const tsConfigFilePath = path.resolve(srcDir, '..', 'tsconfig.json')

const componentGlobs = [`${srcDir}/components/**/*.{ts,tsx}`, `${srcDir}/modules/**/*.{ts,tsx}`]

describe('docs: ts-morph project construction', () => {
	bench(
		'tsconfig (current buildApi shape)',
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
