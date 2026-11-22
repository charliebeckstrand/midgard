// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runtimeFiles } from '../helpers/import-graph'
import { parseImports } from '../helpers/source-imports'
import { srcDir, srcRelative } from '../helpers/walk-source'

// `ui/server` holds the functions that run on a server: in a Next.js server
// module, in the server of an app, or in the docs server (`docs/SERVER.md`).
// Each file that the entry reaches is plain TypeScript. It renders no React,
// and it has no `'use client'`. A break shows only when a server loads the
// module, so this gate walks the runtime imports from `server/index.ts` and
// reads each file that it reaches. The walk reaches `providers/appearance`,
// `providers/density`, and the events engine, so those files answer to the
// same rule.

const ENTRY = join(srcDir, 'server', 'index.ts')

/** A runtime import of React or of a module under it. */
const REACT = /^react(?:\/|$)/

/** One reason for each way that a file of the server graph breaks the rule. */
function serverBreaches(file: string): string[] {
	const source = readFileSync(file, 'utf8')

	const reasons: string[] = []

	if (/^['"]use client['"]/.test(source)) reasons.push("carries 'use client'")

	if (file.endsWith('.tsx')) reasons.push('is a .tsx file')

	const react = parseImports(source).filter(
		({ specifier, runtime }) => runtime && REACT.test(specifier),
	)

	if (react.length > 0) reasons.push('imports a value from react')

	return reasons
}

describe('server graph boundary', () => {
	const graph = [...runtimeFiles([ENTRY])].sort()

	it('reaches the modules that the server entry re-exports', () => {
		expect(graph.map(srcRelative)).toEqual(expect.arrayContaining(['server/index.ts']))

		expect(graph.length).toBeGreaterThan(1)
	})

	it('reaches no client module, no .tsx file, and no value of react', () => {
		const breaches = graph.flatMap((file) =>
			serverBreaches(file).map((reason) => `${srcRelative(file)} ${reason}`),
		)

		expect(breaches, 'keep each file of ui/server plain TypeScript (docs/SERVER.md)').toEqual([])
	})
})
