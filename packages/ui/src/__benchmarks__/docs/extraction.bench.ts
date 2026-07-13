// @vitest-environment node

import path from 'node:path'
import { Project, type ts } from 'ts-morph'
import { bench, describe } from 'vitest'
import { extractDefaults } from '../../docs/engine/api-reference/engine/extract-defaults'
import { extractPassThrough } from '../../docs/engine/api-reference/engine/extract-passthrough'
import { extractProjectPropNames } from '../../docs/engine/api-reference/engine/extract-project-props'
import { extractProps } from '../../docs/engine/api-reference/engine/extract-props'
import { extractReferences } from '../../docs/engine/api-reference/engine/extract-references'
import {
	findComponent,
	getPropsAnnotation,
	unwrapFunctionLike,
} from '../../docs/engine/api-reference/engine/find-components'
import { formatPropType } from '../../docs/engine/api-reference/engine/format-type'
import { createLinkResolver } from '../../docs/engine/api-reference/engine/link-resolver'

// Micro-benchmarks for the per-component extraction seams `buildComponent`
// (`build-api.ts`) fans out to, on one shared Project so setup cost is paid
// once. Setup resolves each fixture's props type up front, warming the
// checker's caches for it — the numbers isolate extractor cost, not
// first-resolution cost, which `build-api.bench.ts` covers end to end.

const srcDir = path.resolve(import.meta.dirname, '..', '..')

const project = new Project({ tsConfigFilePath: path.resolve(srcDir, '..', 'tsconfig.json') })

const checker = project.getTypeChecker().compilerObject

const resolveLink = createLinkResolver(project)

/**
 * Everything `buildComponent` derives before calling the extractors, resolved
 * once per fixture: the unwrapped callable, its props annotation, and the
 * checker-resolved props type.
 */
type Seam = {
	callable: ts.SignatureDeclaration
	annotation: ts.TypeNode | undefined
	propsType: ts.Type
}

function componentSeam(indexRelPath: string, name: string): Seam {
	const indexFile = project.getSourceFileOrThrow(path.join(srcDir, indexRelPath))

	const decl = findComponent(name, indexFile)

	if (!decl) throw new Error(`bench fixture: ${name} not found in ${indexRelPath}`)

	const inner = unwrapFunctionLike(decl.callable) ?? decl.callable

	const callable = inner.compilerNode as ts.SignatureDeclaration

	const annotation = getPropsAnnotation(decl.callable)?.compilerNode

	const sig = checker.getTypeAtLocation(callable).getCallSignatures()[0]

	const param = sig?.parameters[0]

	if (!param) throw new Error(`bench fixture: ${name} has no props parameter`)

	return { callable, annotation, propsType: checker.getTypeOfSymbolAtLocation(param, callable) }
}

// Button: a typical annotated component. Heading: spreads
// `ComponentPropsWithoutRef`, the shape that inflates `collectAllProperties`
// with ~250 inherited HTML props. Combobox: the widest extractable surface
// (24 props). Grid itself doesn't resolve — `memo(GridImpl) as typeof
// GridImpl` defeats `findComponent`; see the 2026-07-13 docs perf audit.
const button = componentSeam('components/button/index.ts', 'Button')

const heading = componentSeam('components/heading/index.ts', 'Heading')

const combobox = componentSeam('components/combobox/index.ts', 'Combobox')

function projectNamesFor(seam: Seam): ReadonlySet<string> | null {
	return seam.annotation ? extractProjectPropNames(seam.annotation, checker) : null
}

const fixtures = [
	{ label: 'Button', seam: button },
	{ label: 'Heading (HTML spread)', seam: heading },
	{ label: 'Combobox (widest surface)', seam: combobox },
]

describe('docs: extractProps', () => {
	for (const { label, seam } of fixtures) {
		const projectNames = projectNamesFor(seam)

		const defaults = extractDefaults(seam.callable)

		bench(label, () => {
			extractProps(seam.callable, seam.propsType, projectNames, defaults, checker, resolveLink)
		})
	}
})

describe('docs: extractReferences', () => {
	for (const { label, seam } of fixtures) {
		const rendered = formatPropType(seam.propsType, checker, seam.callable)

		bench(label, () => {
			extractReferences(rendered, seam.callable, checker)
		})
	}
})

describe('docs: formatPropType', () => {
	for (const { label, seam } of fixtures) {
		bench(label, () => {
			formatPropType(seam.propsType, checker, seam.callable)
		})
	}
})

describe('docs: annotation extractors', () => {
	const annotation = combobox.annotation

	if (annotation) {
		bench('extractProjectPropNames (Combobox)', () => {
			extractProjectPropNames(annotation, checker)
		})

		bench('extractPassThrough (Combobox)', () => {
			extractPassThrough(annotation, checker)
		})
	}

	bench('extractDefaults (Combobox)', () => {
		extractDefaults(combobox.callable)
	})
})

describe('docs: link resolver', () => {
	// Index construction iterates every program file; low fixed iterations.
	bench(
		'createLinkResolver (index build)',
		() => {
			createLinkResolver(project)
		},
		{ warmupIterations: 1, warmupTime: 0, iterations: 5, time: 0 },
	)
})
