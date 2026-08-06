// @vitest-environment node

import path from 'node:path'
import { Project } from 'ts-morph'
import { bench, describe } from 'vitest'
import { openProject } from '../../docs/engine/api-reference/engine/build-api'

// Hypothesis suite for `openProject` (`build-api.ts`): project construction is
// most of what a cold extraction pays before it reaches a component, so each
// bench builds a Project a different way and includes checker creation.
//
// Read the two `skipFileDependencyResolution` rows as a ceiling, not as
// headroom. They are fast because they leave every file outside the seed out of
// `project.getSourceFiles()`, and the link index walks exactly that list, so a
// cross-root TSDoc link resolves to nothing — diffed against `buildApi` output,
// which loses `Sparkline.animate`'s `ReducedMotion` card.
// `api-extractor.test.ts` pins the mechanism.
//
// Hold dependency resolution fixed and the seed stops mattering: the barrel
// indices and the wider documented-root globs measure the same, within noise,
// over alternating cold processes. A variant that shrinks the file set must
// diff `buildApi` output before anyone adopts it.
//
// Constructions run for seconds; fixed low iteration counts replace time-boxed
// sampling. Wall clock here carries ±15-30% run to run — compare medians across
// separate processes before you believe a difference.

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
		'documented-root globs + resolveSourceFileDependencies',
		() => {
			const project = new Project({ tsConfigFilePath, skipAddingFilesFromTsConfig: true })

			project.addSourceFilesAtPaths(componentGlobs)

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

			project.addSourceFilesAtPaths(componentGlobs)

			project.getTypeChecker()
		},
		OPTS,
	)
})
