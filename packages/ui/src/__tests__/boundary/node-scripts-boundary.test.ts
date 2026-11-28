// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runtimeFiles } from '../helpers/import-graph'
import { parseImports, resolveSource } from '../helpers/source-imports'
import { uiRoot } from '../helpers/walk-source'

// Node runs the scripts of `package.json` with its own type stripping, not with
// a bundler. Node does not add an extension to a specifier, and it does not
// load the index of a folder. Thus each relative import that a script reaches
// at runtime must name its `.ts` file in full. Node also does not strip a `.tsx`
// file. A break shows only when someone runs the script, so this gate walks the
// runtime imports from each entry and reads each specifier. The walk reaches
// files in `src`, such as `server/root-marks.ts`, so those files answer to the
// same rule. A type-only import is erased, so it needs no extension.

/** The entry of each script that Node runs, such as `scripts/docs/server.ts`. */
function nodeEntries(): string[] {
	const { scripts } = JSON.parse(readFileSync(join(uiRoot, 'package.json'), 'utf8')) as {
		scripts: Record<string, string>
	}

	const entries = Object.values(scripts).flatMap((command) =>
		[...command.matchAll(/\bnode\s+(scripts\/\S+\.ts)\b/g)].map((match) => match[1] as string),
	)

	return [...new Set(entries)].sort().map((entry) => join(uiRoot, entry))
}

/** One reason for each way that a file of a script graph breaks the rule. */
function nodeBreaches(file: string): string[] {
	const reasons: string[] = []

	if (file.endsWith('.tsx')) reasons.push('is a .tsx file')

	for (const { specifier, runtime } of parseImports(readFileSync(file, 'utf8'))) {
		if (!runtime || !specifier.startsWith('.')) continue

		if (!/\.tsx?$/.test(specifier) && resolveSource(file, specifier) !== undefined) {
			reasons.push(`imports '${specifier}' with no file extension`)
		}
	}

	return reasons
}

describe('node scripts boundary', () => {
	const entries = nodeEntries()

	const graph = [...runtimeFiles(entries)].sort()

	it('reads the entry of each script that Node runs', () => {
		expect(entries.length).toBeGreaterThan(0)
	})

	it('reaches no .tsx file and no relative import without an extension', () => {
		const breaches = graph.flatMap((file) =>
			nodeBreaches(file).map((reason) => `${relative(uiRoot, file)} ${reason}`),
		)

		expect(breaches, 'name the .ts file of each relative import that Node loads').toEqual([])
	})
})
